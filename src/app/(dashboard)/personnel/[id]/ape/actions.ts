"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import {
  certificateFromForm,
  checkCertificate,
  removeCertificate,
  storeCertificate,
} from "@/lib/ape/certificate";

const apeFormSchema = z.object({
  last_ape_date: z.string().trim().min(1, "Last APE date is required"),
  next_due_date: z.string().trim().min(1, "Next due date is required"),
  fit_to_fly: z.enum(["true", "false"]).transform((v) => v === "true"),
  classification: z.string().trim().optional(),
});

/** The form's values without the uploaded file (a file can't ride in a URL). */
function withoutFile(formData: FormData) {
  const copy = new FormData();
  for (const [key, value] of formData) if (typeof value === "string") copy.append(key, value);
  return copy;
}

/** Only the safety office and super admin handle APE (the database agrees). */
async function requireApeManage() {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "ape:manage")) {
    throw new Error("You don't have permission to change APE records.");
  }
}

export async function createApeRecord(formData: FormData) {
  await requireApeManage();
  const pilotId = String(formData.get("pilot_id") ?? "");
  const back = `/personnel/${pilotId}/ape/new`;
  const parsed = apeFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(back, parsed.error.issues[0]?.message ?? "Invalid input.", withoutFile(formData));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let certificate: { path: string; name: string } | null = null;
  const file = certificateFromForm(formData);
  if (file) {
    const problem = await checkCertificate(file);
    if (problem) redirectWithFormError(back, problem, withoutFile(formData));
    const stored = await storeCertificate(supabase, pilotId, file);
    if ("error" in stored) redirectWithFormError(back, stored.error, withoutFile(formData));
    else certificate = stored;
  }

  const { error } = await supabase.from("ape_records").insert({
    pilot_id: pilotId,
    last_ape_date: parsed.data.last_ape_date,
    next_due_date: parsed.data.next_due_date,
    fit_to_fly: parsed.data.fit_to_fly,
    classification: parsed.data.classification || null,
    certificate_path: certificate?.path ?? null,
    certificate_name: certificate?.name ?? null,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    await removeCertificate(supabase, certificate?.path);
    redirectWithFormError(back, error.message, withoutFile(formData));
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteApeRecord(pilotId: string, recordId: string) {
  await requireApeManage();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("ape_records")
    .select("certificate_path")
    .eq("id", recordId)
    .maybeSingle();
  const { error } = await supabase.from("ape_records").delete().eq("id", recordId);
  if (error) throw error;
  await removeCertificate(supabase, existing?.certificate_path);
  revalidatePath(`/personnel/${pilotId}`);
}

export async function updateApeRecord(formData: FormData) {
  await requireApeManage();
  const pilotId = String(formData.get("pilot_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const back = `/personnel/${pilotId}/ape/${recordId}/edit`;
  const parsed = apeFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(back, parsed.error.issues[0]?.message ?? "Invalid input.", withoutFile(formData));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("ape_records")
    .select("certificate_path")
    .eq("id", recordId)
    .maybeSingle();

  // A new file replaces the one on file; the "remove" tick clears it; neither
  // leaves it alone.
  const patch: Record<string, string | null> = {};
  let uploaded: string | null = null;
  const file = certificateFromForm(formData);
  if (file) {
    const problem = await checkCertificate(file);
    if (problem) redirectWithFormError(back, problem, withoutFile(formData));
    const stored = await storeCertificate(supabase, pilotId, file);
    if ("error" in stored) redirectWithFormError(back, stored.error, withoutFile(formData));
    else {
      uploaded = stored.path;
      patch.certificate_path = stored.path;
      patch.certificate_name = stored.name;
    }
  } else if (formData.get("remove_certificate") === "on") {
    patch.certificate_path = null;
    patch.certificate_name = null;
  }

  const { error } = await supabase
    .from("ape_records")
    .update({
      last_ape_date: parsed.data.last_ape_date,
      next_due_date: parsed.data.next_due_date,
      fit_to_fly: parsed.data.fit_to_fly,
      classification: parsed.data.classification || null,
      ...patch,
      updated_by: user?.id,
    })
    .eq("id", recordId);

  if (error) {
    await removeCertificate(supabase, uploaded);
    redirectWithFormError(back, error.message, withoutFile(formData));
  }

  // The old file is only deleted once the record points somewhere else.
  if ("certificate_path" in patch) await removeCertificate(supabase, existing?.certificate_path);

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
