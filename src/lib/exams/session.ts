import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type Examinee = {
  userId: string;
  fullName: string;
  /** The personnel record this login represents. */
  personnelId: string;
};

/**
 * The signed-in examinee, or null. An examinee's account is tied to exactly
 * one personnel record (profiles.personnel_id); everything they can do is
 * scoped to that record. Examinees have no RLS access to any table, so all
 * exam reads and writes go through server code using this identity.
 */
export async function getExaminee(): Promise<Examinee | null> {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "exams:take")) return null;
  // Admins hold every permission but aren't examinees; only real examinee
  // accounts (linked to a personnel record) get through.
  if (profile.role_code !== "examinee") return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("personnel_id")
    .eq("id", profile.id)
    .single();
  if (!data?.personnel_id) return null;

  return { userId: profile.id, fullName: profile.full_name, personnelId: data.personnel_id };
}

/** For pages: send everyone who isn't an examinee somewhere sensible. */
export async function requireExaminee(): Promise<Examinee> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role_code !== "examinee") redirect("/dashboard");
  const examinee = await getExaminee();
  // An examinee account with no personnel record linked can't take anything.
  if (!examinee) redirect("/exams/unlinked");
  return examinee;
}
