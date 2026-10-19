/**
 * Permission layer. Every access check in the app goes through
 * `hasPermission()` rather than checking a role name directly, so adding or
 * narrowing a role is: add it to RoleCode, add its entry to ROLE_PERMISSIONS.
 *
 * This layer decides what the SCREENS offer. What is actually allowed is
 * enforced by the database itself (row-level security, see
 * supabase/migrations/20261019000000_wing_and_safety_office_roles.sql), so a
 * hand-crafted request gets nowhere even if a screen forgot to hide a button.
 */

export type RoleCode =
  | "super_admin"
  | "rotary_admin"
  | "fixed_wing_admin"
  | "safety_office"
  | "examinee";

export const ROLE_LABELS: Record<RoleCode, string> = {
  super_admin: "Super Admin",
  rotary_admin: "Rotary Wing Admin",
  fixed_wing_admin: "Fixed-Wing Admin",
  safety_office: "Safety Office Admin",
  examinee: "Examinee",
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
  | "cbta:manage"
  | "exams:take"
  | "exams:manage"
  | "users:manage"
  | "audit_log:view";

/** Everything a staff member who can open the wing dashboard may look at. */
const VIEW_ALL: Permission[] = [
  "pilots:view",
  "fitness:view",
  "qualifications:view",
  "flights:view",
  "ape:view",
  "currency:view",
  "staneval:view",
  "training:view",
];

/** "*" = every permission. */
const ROLE_PERMISSIONS: Record<RoleCode, Permission[] | "*"> = {
  super_admin: "*",

  // A wing admin enters flights, flying hours and currency for the pilots of
  // ONE wing (which pilots they can see is limited by the database) and reads
  // the rest of those profiles.
  rotary_admin: [...VIEW_ALL, "flights:manage", "currency:manage"],
  fixed_wing_admin: [...VIEW_ALL, "flights:manage", "currency:manage"],

  // The safety office keeps the safety records of everyone: qualifications,
  // APE (and its medical certificates), StanEval, training, CBTA slips and
  // written exams. Flights and currency are read-only for them.
  safety_office: [
    ...VIEW_ALL,
    "qualifications:manage",
    "ape:manage",
    "staneval:manage",
    "training:manage",
    "cbta:manage",
    "exams:manage",
  ],

  // Deliberately narrow: an examinee can take their own assigned exams and
  // nothing else -- no view of any pilot, personnel or safety data.
  examinee: ["exams:take"],
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

/** Roles that work in the wing dashboard (everyone except examinees). */
export function isStaffRole(role: string | null | undefined): boolean {
  return hasPermission(role, "pilots:view");
}
