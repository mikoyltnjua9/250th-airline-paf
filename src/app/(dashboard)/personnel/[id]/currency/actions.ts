"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";

const currencyFormSchema = z.object({
  item_type: z.enum(["last_flight", "ifr", "night_proficiency", "peculiar_runways", "flight_simulator"]),
  last_date: z.string().trim().min(1, "Last date is required"),
  validity_days: z.coerce.number().int().positive("Validity window must be a positive number"),
  // Which aircraft this currency is for (empty = not tied to one).
  aircraft_type_code: z.string().trim().optional(),
});

/**
 * Currency items are unique per (pilot_id, aircraft, item_type) -- there's at
 * most one row per requirement per aircraft per pilot, not a history log, so
 * a pilot qualified on two aircraft keeps a separate set for each. "Add" and
 * "edit" are the same form. Deliberately not using .upsert() here: it
 * would overwrite created_by on every edit of an existing row, since
 * ON CONFLICT DO UPDATE sets every column in the payload, including ones
 * that should only ever be set once.
 */
export async function upsertCurrencyItem(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = currencyFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const itemType = String(formData.get("item_type") ?? "");
    redirectWithFormError(
      `/personnel/${pilotId}/currency/${itemType}`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const aircraft = parsed.data.aircraft_type_code || null;
  const existingQuery = supabase
    .from("currency_items")
    .select("id")
    .eq("pilot_id", pilotId)
    .eq("item_type", parsed.data.item_type);
  const { data: existing } = await (aircraft
    ? existingQuery.eq("aircraft_type_code", aircraft)
    : existingQuery.is("aircraft_type_code", null)
  ).maybeSingle();

  const { error } = existing
    ? await supabase
        .from("currency_items")
        .update({
          last_date: parsed.data.last_date,
          validity_days: parsed.data.validity_days,
          updated_by: user?.id,
        })
        .eq("id", existing.id)
    : await supabase.from("currency_items").insert({
        pilot_id: pilotId,
        item_type: parsed.data.item_type,
        aircraft_type_code: aircraft,
        last_date: parsed.data.last_date,
        validity_days: parsed.data.validity_days,
        created_by: user?.id,
        updated_by: user?.id,
      });

  if (error) {
    redirectWithFormError(
      `/personnel/${pilotId}/currency/${parsed.data.item_type}`,
      error.message,
      formData,
    );
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteCurrencyItem(
  pilotId: string,
  itemType: string,
  aircraftTypeCode: string | null = null,
) {
  const supabase = await createClient();
  const query = supabase
    .from("currency_items")
    .delete()
    .eq("pilot_id", pilotId)
    .eq("item_type", itemType);
  const { error } = await (aircraftTypeCode
    ? query.eq("aircraft_type_code", aircraftTypeCode)
    : query.is("aircraft_type_code", null));
  if (error) throw error;
  revalidatePath(`/personnel/${pilotId}`);
}
