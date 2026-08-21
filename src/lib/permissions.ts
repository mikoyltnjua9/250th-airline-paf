/**
 * Permission layer. v1 only has one role (super_admin, full access to
 * everything), but every access check in the app should go through
 * `hasPermission()` rather than checking `role === "super_admin"` directly.
 * Adding a narrower role later (e.g. "data_entry", "pilot_self_view") is
 * then just: add it to RoleCode, add its entry to ROLE_PERMISSIONS — no
 * call site needs to change.
 */

export type RoleCode = "super_admin";

export const ROLE_LABELS: Record<RoleCode, string> = {
  super_admin: "Super Admin",
};

export type Permission =
  | "pilots:view"
  | "pilots:manage"
  | "fitness:view"
  | "fitness:manage"
  | "qualifications:view"
  | "qualifications:manage"
  | "flights:view"
  | "flights:manage"
  | "ape:view"
  | "ape:manage"
  | "currency:view"
  | "currency:manage"
  | "staneval:view"
  | "staneval:manage"
  | "training:view"
  | "training:manage"
  | "users:manage"
  | "audit_log:view";

/** "*" = every permission. Used only by super_admin in v1. */
const ROLE_PERMISSIONS: Record<RoleCode, Permission[] | "*"> = {
  super_admin: "*",
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  const allowed = ROLE_PERMISSIONS[role as RoleCode];
  return allowed === "*" || allowed.includes(permission);
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Unknown";
  return ROLE_LABELS[role as RoleCode] ?? role;
}
