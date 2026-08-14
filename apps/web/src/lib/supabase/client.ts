import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the anon key only (never the service role).
 *
 * NEXT_PUBLIC_* must be read as literal member expressions. Next.js only
 * inlines `process.env.NEXT_PUBLIC_FOO` into the client bundle; a computed
 * key lookup on process.env is left for runtime and fails in the browser.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, anonKey);
}
