"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePassword } from "@/lib/auth/generate-password";

const createAccountSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  role_code: z.string().trim().min(1, "Role is required"),
});

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
  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { full_name, email, role_code } = parsed.data;
  const password = generatePassword();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
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

  revalidatePath("/system");
  return { success: { email, password } };
}
