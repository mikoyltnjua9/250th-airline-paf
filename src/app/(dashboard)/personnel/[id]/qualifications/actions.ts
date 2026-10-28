"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import { flash } from "@/lib/flash";

const qualificationFormSchema = z.object({
  aircraft_type_code: z.string().trim().min(1, "Aircraft type is required"),
  status: z.enum(["current", "expiring_soon", "expired", "in_training"]),
});

// date_earned / expiry_date were removed from the form at the client's
// request. The columns stay in the table and are deliberately NOT written
// here -- an edit must never blank out dates already on file for older
// records.

export async function createQualification(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = qualificationFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/qualifications/new`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("qualifications").insert({
    pilot_id: pilotId,
    aircraft_type_code: parsed.data.aircraft_type_code,
    status: parsed.data.status,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/qualifications/new`, error.message, formData);
  }

  await flash("Qualification saved");

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteQualification(pilotId: string, qualificationId: string) {
  const supabase = await createClient();
  const { data: removed } = await supabase
    .from("qualifications")
    .select("aircraft_type_code")
    .eq("id", qualificationId)
    .maybeSingle();
  const { error } = await supabase.from("qualifications").delete().eq("id", qualificationId);
  if (error) throw error;
  // The crew-role statuses kept for that aircraft go with it (unless the pilot
  // still has the same aircraft on another record).
  if (removed) {
    const { count } = await supabase
      .from("qualifications")
      .select("id", { count: "exact", head: true })
      .eq("pilot_id", pilotId)
      .eq("aircraft_type_code", removed.aircraft_type_code);
    if (!count) {
      await supabase
        .from("pilot_crew_qualifications")
        .delete()
        .eq("pilot_id", pilotId)
        .eq("aircraft_type_code", removed.aircraft_type_code);
    }
  }
  await flash("Qualification deleted");
  revalidatePath(`/personnel/${pilotId}`);
}

export async function updateQualification(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const qualificationId = String(formData.get("qualification_id") ?? "");
  const parsed = qualificationFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/qualifications/${qualificationId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase
    .from("qualifications")
    .select("aircraft_type_code")
    .eq("id", qualificationId)
    .maybeSingle();

  const { error } = await supabase
    .from("qualifications")
    .update({
      aircraft_type_code: parsed.data.aircraft_type_code,
      status: parsed.data.status,
      updated_by: user?.id,
    })
    .eq("id", qualificationId);

  if (error) {
    redirectWithFormError(
      `/personnel/${pilotId}/qualifications/${qualificationId}/edit`,
      error.message,
      formData,
    );
  }

  // Correcting the aircraft on a record: the crew-role statuses follow it (or,
  // if the new aircraft already has its own, the old ones are dropped).
  if (before && before.aircraft_type_code !== parsed.data.aircraft_type_code) {
    const moved = await supabase
      .from("pilot_crew_qualifications")
      .update({ aircraft_type_code: parsed.data.aircraft_type_code, updated_by: user?.id })
      .eq("pilot_id", pilotId)
      .eq("aircraft_type_code", before.aircraft_type_code);
    if (moved.error) {
      await supabase
        .from("pilot_crew_qualifications")
        .delete()
        .eq("pilot_id", pilotId)
        .eq("aircraft_type_code", before.aircraft_type_code);
    }
  }

  await flash("Qualification saved");

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
