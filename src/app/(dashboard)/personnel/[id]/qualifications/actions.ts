"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const qualificationFormSchema = z.object({
  aircraft_type_code: z.string().trim().min(1, "Aircraft type is required"),
  status: z.enum(["current", "expiring_soon", "expired", "in_training"]),
  date_earned: z.string().trim().optional(),
  expiry_date: z.string().trim().optional(),
});

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
    date_earned: parsed.data.date_earned || null,
    expiry_date: parsed.data.expiry_date || null,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/qualifications/new`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteQualification(pilotId: string, qualificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("qualifications").delete().eq("id", qualificationId);
  if (error) throw error;
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

  const { error } = await supabase
    .from("qualifications")
    .update({
      aircraft_type_code: parsed.data.aircraft_type_code,
      status: parsed.data.status,
      date_earned: parsed.data.date_earned || null,
      expiry_date: parsed.data.expiry_date || null,
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

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
