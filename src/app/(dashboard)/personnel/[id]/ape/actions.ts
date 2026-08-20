"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const apeFormSchema = z.object({
  last_ape_date: z.string().trim().min(1, "Last APE date is required"),
  next_due_date: z.string().trim().min(1, "Next due date is required"),
  fit_to_fly: z.enum(["true", "false"]).transform((v) => v === "true"),
  classification: z.string().trim().optional(),
});

export async function createApeRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = apeFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/ape/new`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ape_records").insert({
    pilot_id: pilotId,
    last_ape_date: parsed.data.last_ape_date,
    next_due_date: parsed.data.next_due_date,
    fit_to_fly: parsed.data.fit_to_fly,
    classification: parsed.data.classification || null,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/ape/new`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function updateApeRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const parsed = apeFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/ape/${recordId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("ape_records")
    .update({
      last_ape_date: parsed.data.last_ape_date,
      next_due_date: parsed.data.next_due_date,
      fit_to_fly: parsed.data.fit_to_fly,
      classification: parsed.data.classification || null,
      updated_by: user?.id,
    })
    .eq("id", recordId);

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/ape/${recordId}/edit`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
