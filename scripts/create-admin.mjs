// One-time bootstrap: create the very first super_admin account.
// There is no self-service signup by design, so this script exists purely
// to get the first account into the system — every account after this one
// should be created from the in-app admin UI (Phase: System Management).
//
// Usage:
//   node --env-file=.env.local scripts/create-admin.mjs "<email>" "<full name>"

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/create-admin.mjs <email> \"<full name>\"",
  );
  process.exit(1);
}

const [, , email, fullName] = process.argv;
if (!email || !fullName) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> "<full name>"');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fail fast with a clear message if the schema migration hasn't been run yet.
const { error: probeError } = await supabase.from("profiles").select("id").limit(1);
if (probeError) {
  console.error(`Could not read the "profiles" table (${probeError.message}).`);
  console.error(
    "Run the migration SQL (supabase/migrations/*.sql) in the Supabase SQL Editor first.",
  );
  process.exit(1);
}

function generatePassword(length = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const password = generatePassword();

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role_code: "super_admin" },
});

if (error || !data.user) {
  console.error("Failed to create user:", error?.message ?? "unknown error");
  process.exit(1);
}

// Confirm the handle_new_user trigger actually created the profile row.
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, full_name, role_code")
  .eq("id", data.user.id)
  .single();

if (profileError || !profile) {
  console.error(
    "User was created in Auth, but no matching profiles row was found.\n" +
      "Check that the on_auth_user_created trigger exists (re-run the migration).",
  );
  process.exit(1);
}

console.log("\n✅ Super admin account created.\n");
console.log("  Email:    ", email);
console.log("  Password: ", password);
console.log("  Role:     ", profile.role_code);
console.log(
  "\nThis password is shown once — save it now (password manager). " +
    "Log in at /login; you'll be required to set up 2FA immediately.",
);
