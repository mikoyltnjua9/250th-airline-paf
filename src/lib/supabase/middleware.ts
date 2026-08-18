import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INACTIVITY_TIMEOUT_MS =
  (Number(process.env.INACTIVITY_TIMEOUT_MINUTES) || 15) * 60_000;

const LAST_ACTIVITY_COOKIE = "last_activity";

/** Routes that never require a session at all — public by design. */
function isPublicRoute(pathname: string) {
  return pathname.startsWith("/verify") || pathname.startsWith("/api/verify");
}

function isAuthStepRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/mfa");
}

/** Builds a redirect that carries forward any cookies Supabase just refreshed. */
function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
  params?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

/**
 * Runs on every request (see matcher in src/middleware.ts). Responsible for:
 *  1. Refreshing the Supabase session (keeps SSR + client in sync).
 *  2. Enforcing the 15-minute inactivity auto-logout.
 *  3. Enforcing mandatory 2FA: no route past /login is reachable without a
 *     completed TOTP challenge this session (aal2), no exceptions.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === "/login") return supabaseResponse;
    return redirectWithCookies(request, supabaseResponse, "/login");
  }

  // --- inactivity timeout -------------------------------------------------
  const now = Date.now();
  const lastActivity = Number(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value ?? 0);

  if (lastActivity && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
    await supabase.auth.signOut();
    const response = redirectWithCookies(request, supabaseResponse, "/login", {
      reason: "timeout",
    });
    response.cookies.delete(LAST_ACTIVITY_COOKIE);
    return response;
  }

  supabaseResponse.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  // --- mandatory 2FA enforcement ------------------------------------------
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = aal?.currentLevel;
  const nextLevel = aal?.nextLevel;

  if (currentLevel === "aal2") {
    if (isAuthStepRoute(pathname)) {
      return redirectWithCookies(request, supabaseResponse, "/dashboard");
    }
    return supabaseResponse;
  }

  if (nextLevel === "aal2") {
    // A verified TOTP factor exists — this session just hasn't completed
    // the challenge yet.
    if (pathname !== "/mfa/challenge") {
      return redirectWithCookies(request, supabaseResponse, "/mfa/challenge");
    }
    return supabaseResponse;
  }

  // No verified factor enrolled at all — 2FA is mandatory, no exceptions.
  if (pathname !== "/mfa/enroll") {
    return redirectWithCookies(request, supabaseResponse, "/mfa/enroll");
  }
  return supabaseResponse;
}
