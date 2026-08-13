import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function supabaseUrl() {
  const value =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(
      "Missing environment variable: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
    );
  }
  return value;
}

function supabaseAnonKey() {
  const value =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      "Missing environment variable: SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return value;
}

/**
 * Server Supabase client for Route Handlers / Server Actions.
 * Uses the anon key + cookie session — never the service role key.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only — safe to ignore.
        }
      },
    },
  });
}
