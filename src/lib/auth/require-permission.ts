import "server-only";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { hasPermission, type Permission } from "@/lib/permissions";

/**
 * Page guard: sends the visitor away unless their role has the permission.
 * This is the friendly layer (no half-working form for a read-only role); the
 * database's row-level security is what actually refuses a forbidden write.
 */
export async function requirePermission(permission: Permission, redirectTo = "/dashboard") {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role_code, permission)) redirect(redirectTo);
  return profile;
}
