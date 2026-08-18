import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  full_name: string;
  role_code: string;
  email: string | undefined;
};

/** Current signed-in user's profile row, or null if not signed in. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role_code")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { ...profile, email: user.email };
}
