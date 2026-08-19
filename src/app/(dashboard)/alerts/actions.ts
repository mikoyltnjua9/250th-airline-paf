"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Records that a specific alert was seen and is being handled. Doesn't
 * touch the underlying license/qualification/currency/APE/StanEval record —
 * the alert is still computed fresh every time from those tables; this is
 * only a note that someone looked at it. */
export async function acknowledgeAlert(alertKey: string, pilotId: string, category: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("alert_acknowledgements").insert({
    alert_key: alertKey,
    pilot_id: pilotId,
    category,
    acknowledged_by: user?.id,
  });
  if (error) throw error;

  revalidatePath("/alerts");
}

export async function unacknowledgeAlert(alertKey: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("alert_acknowledgements").delete().eq("alert_key", alertKey);
  if (error) throw error;

  revalidatePath("/alerts");
}
