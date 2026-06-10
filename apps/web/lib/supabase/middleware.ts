import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@nyumba360/supabase";
import { homeRouteForRole, type UserRole } from "@nyumba360/shared";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Routes reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/signup", "/reset", "/accept-invite", "/listings", "/_next", "/favicon"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}`));
}

/**
 * Refreshes the Supabase session cookie on every request and enforces
 * role-based routing: tenants are kept inside /portal, staff out of it
 * (PRD §7, §8). The org_id/role come from the JWT claims set by the
 * access-token hook.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Before Supabase is configured, don't gate anything — let pages render
  // their "not configured" state.
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const role = user?.app_metadata?.user_role as UserRole | undefined;

  // Unauthenticated → only public routes
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated visiting an auth page → send to their home
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = role ? homeRouteForRole(role) : "/onboarding";
    return NextResponse.redirect(url);
  }

  // Role partitioning between staff app and tenant portal
  if (user && role) {
    const inPortal = pathname.startsWith("/portal");
    if (role === "tenant" && !inPortal && !isPublic(pathname) && pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    if (role !== "tenant" && inPortal) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
