"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";

/**
 * Crew-role qualifications are unique per (pilot_id, role_code, aircraft) --
 * one row per role per aircraft per pilot, not a history log, same shape as
 * currency_items. A pilot qualified on two aircraft keeps a separate set for
 * each; a null aircraft is for a pilot with none on file yet.
 * Deliberately not using .upsert() here for the same reason as
 * upsertCurrencyItem: ON CONFLICT DO UPDATE would overwrite created_by on
 * every toggle of an already-existing row.
 *
 * Called directly from a button on the pilot profile page (like
 * deleteCurrencyItem/reactivatePilot), not through a separate form page --
 * it's a single boolean per role, so a dedicated Add/Edit page would be
 * more friction than the data warrants.
 */
export async function setCrewQualification(
  pilotId: string,
  roleCode: string,
  aircraftTypeCode: string | null,
  qualified: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const existingQuery = supabase
    .from("pilot_crew_qualifications")
    .select("id")
    .eq("pilot_id", pilotId)
    .eq("role_code", roleCode);
  const { data: existing } = await (aircraftTypeCode
    ? existingQuery.eq("aircraft_type_code", aircraftTypeCode)
    : existingQuery.is("aircraft_type_code", null)
  ).maybeSingle();

  const { error } = existing
    ? await supabase
        .from("pilot_crew_qualifications")
        .update({ qualified, updated_by: user?.id })
        .eq("id", existing.id)
    : await supabase.from("pilot_crew_qualifications").insert({
        pilot_id: pilotId,
        role_code: roleCode,
        aircraft_type_code: aircraftTypeCode,
        qualified,
        created_by: user?.id,
        updated_by: user?.id,
      });

  if (error) throw error;
  await flash("Qualification status updated");
  revalidatePath(`/personnel/${pilotId}`);
}
