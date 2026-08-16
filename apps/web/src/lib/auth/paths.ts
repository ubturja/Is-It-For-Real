/** Training-path auth routes. Crisis Mode (`/help`) never uses these. */
export const RESET_PASSWORD_PATH = "/login/reset";

/** Public origin for auth emails. Preview/localhost must not go in the message. */
export const CANONICAL_SITE_ORIGIN = "https://isitfr.vercel.app";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function envSiteOrigin(): string {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof canonical === "string" && canonical.trim() !== "") {
    return trimTrailingSlash(canonical.trim());
  }
  return CANONICAL_SITE_ORIGIN;
}

/**
 * Origin baked into password-reset and signup emails.
 * Always the public site — hosted Supabase ignores unlisted preview URLs and
 * falls back to dashboard Site URL (still localhost until that is changed).
 */
export function authEmailRedirectOrigin(): string {
  return envSiteOrigin();
}

export function authEmailCallbackUrl(nextPath: string): string {
  return `${authEmailRedirectOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/** Origin for in-browser OAuth return — stay on the page the user is on. */
export function authRedirectOrigin(pageOrigin: string): string {
  try {
    return trimTrailingSlash(new URL(pageOrigin).origin);
  } catch {
    return envSiteOrigin();
  }
}

export function authCallbackUrl(pageOrigin: string, nextPath: string): string {
  return `${authRedirectOrigin(pageOrigin)}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
