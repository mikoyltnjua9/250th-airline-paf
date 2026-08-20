"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const trainingFormSchema = z.object({
  training_type: z.string().trim().min(1, "Training type is required"),
  status: z.enum(["completed", "scheduled", "overdue"]),
  training_date: z.string().trim().min(1, "Date is required"),
});

export async function createTrainingRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = trainingFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/training/new`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("training_records").insert({
    pilot_id: pilotId,
    training_type: parsed.data.training_type,
    status: parsed.data.status,
    training_date: parsed.data.training_date,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/training/new`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function updateTrainingRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const parsed = trainingFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/training/${recordId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("training_records")
    .update({
      training_type: parsed.data.training_type,
      status: parsed.data.status,
      training_date: parsed.data.training_date,
      updated_by: user?.id,
    })
    .eq("id", recordId);

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/training/${recordId}/edit`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
