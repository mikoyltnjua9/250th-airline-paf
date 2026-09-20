"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePassword } from "@/lib/auth/generate-password";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission } from "@/lib/permissions";
import { personnelTypeForPosition } from "@/lib/types/pilot";

const createAccountSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  role_code: z.string().trim().min(1, "Role is required"),
  personnel_id: z.string().trim().optional(),
});

/**
 * Every account action goes through the admin (service-role) client, which
 * bypasses RLS entirely -- so the caller's permission has to be checked here
 * explicitly, not assumed from being signed in.
 */
async function requireUsersManage() {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermission(profile.role_code, "users:manage")) {
    throw new Error("You don't have permission to manage accounts.");
  }
  return profile;
}

export type CreateAccountState = {
  error?: string;
  success?: { email: string; password: string };
};

/**
 * Deliberately NOT the plain <form action={fn}> + redirect() pattern used
 * everywhere else in this app: the generated password must never end up in
 * a URL (browser history, server logs, referrer headers). useActionState
 * keeps it in memory on the client, shown once, gone on refresh -- exactly
 * the property a one-time credential display needs.
 */
export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  try {
    await requireUsersManage();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not authorized." };
  }

  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { full_name, email, role_code, personnel_id } = parsed.data;
  const admin = createAdminClient();

  // An examinee login exists to take exams for ONE personnel record, so it
  // must be linked to one (and only staff who take exams qualify).
  if (role_code === "examinee") {
    if (!personnel_id) return { error: "Choose the person this login is for." };
    const { data: person } = await admin
      .from("pilots")
      .select("position")
      .eq("id", personnel_id)
      .maybeSingle();
    if (!person || personnelTypeForPosition(person.position) === "pilot") {
      return { error: "Examinee logins are for maintenance staff and cabin crew." };
    }
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("personnel_id", personnel_id)
      .maybeSingle();
    if (existing) return { error: "That person already has a login." };
  }

  const password = generatePassword();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role_code },
  });

  if (error) {
    const message = error.message.includes("already been registered")
      ? "That email is already in use."
      : error.message;
    return { error: message };
  }

  if (role_code === "examinee") {
    const { error: linkError } = await admin
      .from("profiles")
      .update({ personnel_id })
      .eq("id", created.user.id);
    if (linkError) {
      // Don't leave behind a login that isn't tied to anyone.
      await admin.auth.admin.deleteUser(created.user.id);
      return { error: "Couldn't link that login to the person: " + linkError.message };
    }
  }

  revalidatePath("/system");
  return { success: { email, password } };
}

export async function deleteAccount(userId: string) {
  const me = await requireUsersManage();

  // Belt-and-suspenders: the UI already hides this control on your own row,
  // but never let a signed-in admin delete themselves mid-session either way.
  if (me.id === userId) {
    throw new Error("You can't delete your own account while signed in.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  revalidatePath("/system");
}

export type AccountActionResult = { error?: string; password?: string };

const renameSchema = z.string().trim().min(1, "Name can't be empty").max(100, "Name is too long");

export async function renameAccount(userId: string, fullName: string): Promise<AccountActionResult> {
  await requireUsersManage();
  const parsed = renameSchema.safeParse(fullName);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  // profiles.full_name is what the app displays everywhere (header, audit
  // log, account list); auth metadata is only read once, at account creation.
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ full_name: parsed.data }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/system");
  return {};
}

/**
 * Sets a new random password and returns it once -- same one-time-display
 * approach as account creation (returned to the client in memory, never put
 * in a URL). The account's 2FA is untouched: they still need their
 * authenticator, so a leaked password alone isn't enough to get in.
 */
export async function resetAccountPassword(userId: string): Promise<AccountActionResult> {
  await requireUsersManage();
  const password = generatePassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { password };
}

/**
 * Removes the account's authenticator so the next sign-in walks them through
 * 2FA enrollment again (for a lost or replaced phone). Blocked on your own
 * account: resetting your own 2FA mid-session would let anyone at an
 * unlocked laptop strip it, and an admin locked out of their own account
 * should be reset by another admin.
 */
export async function resetAccountTwoFactor(userId: string): Promise<void> {
  const me = await requireUsersManage();
  if (me.id === userId) {
    throw new Error("You can't reset your own 2FA. Ask another admin.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) throw error;
  for (const factor of data?.factors ?? []) {
    const { error: delError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (delError) throw delError;
  }

  revalidatePath("/system");
}
