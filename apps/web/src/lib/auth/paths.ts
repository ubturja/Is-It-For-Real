/** Training-path auth routes. Crisis Mode (`/help`) never uses these. */
export const RESET_PASSWORD_PATH = "/login/reset";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Origin for auth emails and OAuth redirects.
 * Localhost against hosted Supabase must not go into the email — expired
 * recovery links fall back to the dashboard Site URL, which is production.
 */
export function authRedirectOrigin(pageOrigin: string): string {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL;
  const trimmedCanonical =
    typeof canonical === "string" && canonical.trim() !== ""
      ? trimTrailingSlash(canonical.trim())
      : "";

  let host = "";
  try {
    host = new URL(pageOrigin).hostname;
  } catch {
    return trimmedCanonical !== "" ? trimmedCanonical : pageOrigin;
  }

  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal && trimmedCanonical !== "") {
    return trimmedCanonical;
  }
  return trimTrailingSlash(pageOrigin);
}

export function authCallbackUrl(pageOrigin: string, nextPath: string): string {
  return `${authRedirectOrigin(pageOrigin)}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
