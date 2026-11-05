import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CURRENCY_ITEM_LABELS,
  DEFAULT_CURRENCY_VALIDITY_DAYS,
  currencyItemTypesForPosition,
  type CurrencyItemType,
} from "@/lib/types/pilot";
import { FLIGHT_CURRENCY_CATEGORIES, type FlightCurrencyCategory } from "@/lib/currency/from-flight-categories";


/** Reads the ticked "counts toward" boxes of the flight form. */
export function categoriesFromForm(formData: FormData): FlightCurrencyCategory[] {
  return FLIGHT_CURRENCY_CATEGORIES.filter((c) => formData.get(`counts_${c}`) === "on");
}

/**
 * Logging a flight also brings the pilot's currency up to date for that
 * aircraft: Last Flight always, plus IFR / Night / Peculiar Runways when the
 * flight counted for them. A currency's date only ever moves forward (a
 * back-dated flight never overwrites a later one), and a requirement with no
 * record yet gets one with its usual validity window.
 *
 * Returns the labels of what was changed, or null if the currency couldn't be
 * written (the flight itself is already saved; the page says so).
 */
export async function updateCurrencyFromFlight(
  supabase: SupabaseClient,
  userId: string | undefined,
  flight: {
    pilotId: string;
    aircraftTypeCode: string;
    flightDate: string;
    position: string;
    categories: FlightCurrencyCategory[];
  },
): Promise<string[] | null> {
  const applicable = currencyItemTypesForPosition(flight.position);
  const types: CurrencyItemType[] = [
    "last_flight",
    ...flight.categories.filter((c) => applicable.includes(c)),
  ];

  const changed: string[] = [];
  for (const itemType of types) {
    const { data: existing, error } = await supabase
      .from("currency_items")
      .select("id, last_date")
      .eq("pilot_id", flight.pilotId)
      .eq("item_type", itemType)
      .eq("aircraft_type_code", flight.aircraftTypeCode)
      .maybeSingle();
    if (error) return null;

    if (!existing) {
      const { error: insertError } = await supabase.from("currency_items").insert({
        pilot_id: flight.pilotId,
        item_type: itemType,
        aircraft_type_code: flight.aircraftTypeCode,
        last_date: flight.flightDate,
        validity_days: DEFAULT_CURRENCY_VALIDITY_DAYS[itemType] ?? 90,
        created_by: userId,
        updated_by: userId,
      });
      if (insertError) return null;
      changed.push(CURRENCY_ITEM_LABELS[itemType]);
    } else if (existing.last_date < flight.flightDate) {
      const { error: updateError } = await supabase
        .from("currency_items")
        .update({ last_date: flight.flightDate, updated_by: userId })
        .eq("id", existing.id);
      if (updateError) return null;
      changed.push(CURRENCY_ITEM_LABELS[itemType]);
    }
  }
  return changed;
}
