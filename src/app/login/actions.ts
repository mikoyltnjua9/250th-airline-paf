"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague — don't reveal whether the email exists.
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  // listFactors()'s `totp` bucket only ever contains verified factors.
  const { data } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = (data?.totp?.length ?? 0) > 0;

  redirect(hasVerifiedTotp ? "/mfa/challenge" : "/mfa/enroll");
}
