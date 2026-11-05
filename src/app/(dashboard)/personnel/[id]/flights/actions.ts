"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFormError } from "@/lib/forms/error-redirect";
import { flash } from "@/lib/flash";
import { categoriesFromForm, updateCurrencyFromFlight } from "@/lib/currency/from-flight";

/** Brings the pilot's currency up to date from the flight just saved, and says what changed. */
async function currencyMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | undefined,
  pilotId: string,
  parsed: { flight_date: string; aircraft_type_code: string },
  formData: FormData,
) {
  const { data: person } = await supabase.from("pilots").select("position").eq("id", pilotId).maybeSingle();
  const changed = await updateCurrencyFromFlight(supabase, userId, {
    pilotId,
    aircraftTypeCode: parsed.aircraft_type_code,
    flightDate: parsed.flight_date,
    position: person?.position ?? "",
    categories: categoriesFromForm(formData),
  });
  if (changed === null) return "Flight saved, but the currency could not be updated";
  return changed.length ? `Flight saved. Currency updated: ${changed.join(", ")}` : "Flight saved";
}

const flightFormSchema = z.object({
  flight_date: z.string().trim().min(1, "Flight date is required"),
  aircraft_type_code: z.string().trim().min(1, "Aircraft type is required"),
  route: z.string().trim().optional(),
  duty: z.enum(["PIC", "SIC", "IP", "Student"]),
  flying_time_hours: z.coerce.number().positive("Flying time must be a positive number"),
});

export async function createFlight(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const parsed = flightFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/flights/new`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("flights").insert({
    pilot_id: pilotId,
    flight_date: parsed.data.flight_date,
    aircraft_type_code: parsed.data.aircraft_type_code,
    route: parsed.data.route || null,
    duty: parsed.data.duty,
    flying_time_hours: parsed.data.flying_time_hours,
    created_by: user?.id,
  });

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/flights/new`, error.message, formData);
  }

  await flash(await currencyMessage(supabase, user?.id, pilotId, parsed.data, formData));

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}

export async function deleteFlight(pilotId: string, flightId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("flights").delete().eq("id", flightId);
  if (error) throw error;
  await flash("Flight deleted");
  revalidatePath(`/personnel/${pilotId}`);
}

export async function updateFlight(formData: FormData) {
  const pilotId = String(formData.get("pilot_id") ?? "");
  const flightId = String(formData.get("flight_id") ?? "");
  const parsed = flightFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithFormError(
      `/personnel/${pilotId}/flights/${flightId}/edit`,
      parsed.error.issues[0]?.message ?? "Invalid input.",
      formData,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("flights")
    .update({
      flight_date: parsed.data.flight_date,
      aircraft_type_code: parsed.data.aircraft_type_code,
      route: parsed.data.route || null,
      duty: parsed.data.duty,
      flying_time_hours: parsed.data.flying_time_hours,
    })
    .eq("id", flightId);

  if (error) {
    redirectWithFormError(`/personnel/${pilotId}/flights/${flightId}/edit`, error.message, formData);
  }

  await flash(await currencyMessage(supabase, user?.id, pilotId, parsed.data, formData));

  revalidatePath(`/personnel/${pilotId}`);
  redirect(`/personnel/${pilotId}`);
}
