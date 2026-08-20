"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const stanevalFormSchema = z.object({
  eval_date: z.string().trim().min(1, "Evaluation date is required"),
  status: z.enum(["pass", "fail"]),
  grading: z.string().trim().optional(),
  next_due_date: z.string().trim().optional(),
});

export async function createStanevalRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = stanevalFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/staneval/new`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("staneval_records").insert({
    pilot_id: pilotId,
    eval_date: parsed.data.eval_date,
    status: parsed.data.status,
    grading: parsed.data.grading || null,
    next_due_date: parsed.data.next_due_date || null,
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/staneval/new`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function updateStanevalRecord(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const parsed = stanevalFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/staneval/${recordId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("staneval_records")
    .update({
      eval_date: parsed.data.eval_date,
      status: parsed.data.status,
      grading: parsed.data.grading || null,
      next_due_date: parsed.data.next_due_date || null,
      updated_by: user?.id,
    })
    .eq("id", recordId);

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/staneval/${recordId}/edit`, error.message, formData);
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
