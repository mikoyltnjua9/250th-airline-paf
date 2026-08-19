"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const currencyFormSchema = z.object({
  item_type: z.enum(["last_flight", "ifr", "night_proficiency", "peculiar_runways"]),
  last_date: z.string().trim().min(1, "Last date is required"),
  validity_days: z.coerce.number().int().positive("Validity window must be a positive number"),
});

/**
 * Currency items are unique per (pilot_id, item_type) -- there's at most
 * one row per requirement per pilot, not a history log. So "add" and
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
    redirect(
      `/personnel/${pilotId}/currency/${itemType}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid input.",
      )}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("currency_items")
    .select("id")
    .eq("pilot_id", pilotId)
    .eq("item_type", parsed.data.item_type)
    .maybeSingle();

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
        last_date: parsed.data.last_date,
        validity_days: parsed.data.validity_days,
        created_by: user?.id,
        updated_by: user?.id,
      });

  if (error) {
    redirect(
      `/personnel/${pilotId}/currency/${parsed.data.item_type}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
