import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function supabaseUrl() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!value) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
    );
  }
  return value;
}

function supabaseAnonKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)",
    );
  }
  return value;
}

/**
 * Refresh the auth session cookie and gate /train/**.
 * Callers must only invoke this for matched /train routes — /help and
 * /api/health must never enter this path.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validate JWT (do not use getSession() here — it is not revalidated).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
