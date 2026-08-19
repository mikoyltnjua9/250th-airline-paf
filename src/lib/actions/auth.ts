"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LAST_ACTIVITY_COOKIE } from "@/lib/supabase/middleware";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(LAST_ACTIVITY_COOKIE);
  redirect("/login");
}
