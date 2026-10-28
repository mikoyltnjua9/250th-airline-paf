import { cookies } from "next/headers";

export const FLASH_COOKIE = "flash";

/**
 * Queues a one-time success message ("Qualification saved") for the next page
 * the user sees. Server Actions mostly end in a redirect, so the message can't
 * be returned to the form; it rides in a short-lived cookie instead. The
 * <Flash /> component in the layouts picks it up, shows it as a toast and
 * clears it. The cookie is readable from the page on purpose (not httpOnly):
 * it only ever holds a message we wrote, never anything private.
 */
export async function flash(message: string) {
  const jar = await cookies();
  jar.set(FLASH_COOKIE, `${Date.now()}|${encodeURIComponent(message)}`, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false,
  });
}
