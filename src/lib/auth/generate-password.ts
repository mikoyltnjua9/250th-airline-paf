import "server-only";

/** Same character set/approach as scripts/create-admin.mjs's bootstrap
 * script — kept as a small duplicate rather than a shared import, since
 * that script runs standalone via `node --env-file` outside the Next.js
 * build. */
export function generatePassword(length = 20): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
