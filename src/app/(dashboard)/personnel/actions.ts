"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const pilotFormSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  rank_code: z.string().trim().min(1, "Rank is required"),
  afsn: z.string().trim().min(1, "AFSN is required"),
  unit_section: z.string().trim().optional(),
  position: z.string().trim().min(1).default("Pilot"),
  license_no: z.string().trim().min(1, "License number is required"),
  date_issued: z.string().trim().min(1, "Date issued is required"),
  date_expires: z.string().trim().min(1, "Date expires is required"),
  status: z.enum(["valid", "expired", "revoked", "suspended"]),
});

function friendlyDbError(message: string): string {
  if (message.includes("afsn")) return "That AFSN is already in use by another pilot.";
  if (message.includes("license_no")) return "That license number is already in use.";
  return message;
}

export async function createPilot(formData: FormData) {
  const parsed = pilotFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithFormError(
      "/personnel/new",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const { license_no, date_issued, date_expires, status, ...pilotFields } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pilot, error: pilotError } = await supabase
    .from("pilots")
    .insert({
      ...pilotFields,
      unit_section: pilotFields.unit_section || null,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (pilotError) {
    redirectWithFormError("/personnel/new", friendlyDbError(pilotError.message), formData);
  }

  const { error: licenseError } = await supabase.from("licenses").insert({
    pilot_id: pilot.id,
    license_no,
    date_issued,
    date_expires,
    status,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (licenseError) {
    // Compensate: don't leave a pilot record with no license behind.
    await supabase.from("pilots").delete().eq("id", pilot.id);
    redirectWithFormError("/personnel/new", friendlyDbError(licenseError.message), formData);
  }

  revalidatePath("/personnel");
  redirect(`/personnel/${pilot.id}`);
}

export async function updatePilot(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const licenseId = String(formData.get("license_id") ?? "");

  const parsed = pilotFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const { license_no, date_issued, date_expires, status, ...pilotFields } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: pilotError } = await supabase
    .from("pilots")
    .update({ ...pilotFields, unit_section: pilotFields.unit_section || null, updated_by: user?.id })
    .eq("id", pilotId);

  if (pilotError) {
    redirectWithFormError(`/personnel/${pilotId}/edit`, friendlyDbError(pilotError.message), formData);
  }

  const { error: licenseError } = await supabase
    .from("licenses")
    .update({ license_no, date_issued, date_expires, status, updated_by: user?.id })
    .eq("id", licenseId);

  if (licenseError) {
    redirectWithFormError(`/personnel/${pilotId}/edit`, friendlyDbError(licenseError.message), formData);
  }

  revalidatePath("/personnel");
  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
