"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import { POSITIONS } from "@/lib/types/pilot";

const pilotFormSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  rank_code: z.string().trim().min(1, "Rank is required"),
  afsn: z.string().trim().min(1, "AFSN is required"),
  position: z.enum(POSITIONS),
  fit_to_fly: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function friendlyDbError(message: string): string {
  if (message.includes("afsn")) return "That AFSN is already in use by another pilot.";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pilot, error: pilotError } = await supabase
    .from("pilots")
    .insert({
      ...parsed.data,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (pilotError) {
    redirectWithFormError("/personnel/new", friendlyDbError(pilotError.message), formData);
  }

  revalidatePath("/personnel");
  redirect(`/personnel/${pilot.id}`);
}

export async function updatePilot(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");

  const parsed = pilotFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: pilotError } = await supabase
    .from("pilots")
    .update({ ...parsed.data, updated_by: user?.id })
    .eq("id", pilotId);

  if (pilotError) {
    redirectWithFormError(`/personnel/${pilotId}/edit`, friendlyDbError(pilotError.message), formData);
  }

  revalidatePath("/personnel");
  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
