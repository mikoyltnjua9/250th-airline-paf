"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import { flash } from "@/lib/flash";

const authorizeSchema = z.object({
  seminar_date: z.string().trim().min(1, "Seminar date is required"),
});

/**
 * Authorizes a person to operate the ticked ground equipment, all from the one
 * seminar date. Equipment the person is already authorized for is left as it
 * is (to change a seminar date, delete that line and authorize it again).
 */
export async function authorizeEquipment(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const back = `/personnel/${pilotId}/equipment/new`;
  const codes = [...new Set(formData.getAll("equipment_code").map(String).filter(Boolean))];
  const parsed = authorizeSchema.safeParse(Object.fromEntries(formData));

  // Only the date is carried back to the form; the ticked boxes can't ride in a URL value.
  const kept = new FormData();
  kept.set("seminar_date", String(formData.get("seminar_date") ?? ""));

  if (!parsed.success) {
    redirectWithFormError(back, parsed.error.issues[0]?.message ?? "Invalid input.", kept);
  }
  if (codes.length === 0) {
    redirectWithFormError(back, "Choose at least one piece of equipment.", kept);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("equipment_authorizations")
    .select("equipment_code")
    .eq("pilot_id", pilotId);
  const have = new Set((existing ?? []).map((e) => e.equipment_code));

  const rows = codes
    .filter((code) => !have.has(code))
    .map((code) => ({
      pilot_id: pilotId,
      equipment_code: code,
      seminar_date: parsed.data.seminar_date,
      created_by: user?.id,
      updated_by: user?.id,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("equipment_authorizations").insert(rows);
    if (error) redirectWithFormError(back, error.message, kept);
  }

  await flash(rows.length === 1 ? "Equipment authorized" : `${rows.length} equipment authorized`);

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteEquipmentAuthorization(pilotId: string, authorizationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment_authorizations").delete().eq("id", authorizationId);
  if (error) throw error;
  await flash("Authorization removed");
  revalidatePath(`/personnel/${pilotId}`);
}
