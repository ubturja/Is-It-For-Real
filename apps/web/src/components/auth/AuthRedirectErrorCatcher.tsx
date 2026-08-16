"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Hosted Supabase sends expired/invalid recovery links to Site URL with
 * `error_code=otp_expired` in the query and/or hash. Send the user to login
 * with the reset-expired copy instead of leaving them on `/`.
 */
export function AuthRedirectErrorCatcher() {
  const router = useRouter();

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorCode = search.get("error_code") ?? hash.get("error_code");
    const error = search.get("error") ?? hash.get("error");
    const isExpired =
      errorCode === "otp_expired" || error === "access_denied";
    if (!isExpired) {
      return;
    }
    if (
      window.location.pathname === "/login" &&
      search.get("error") === "otp_expired" &&
      window.location.hash === ""
    ) {
      return;
    }
    router.replace("/login?error=otp_expired");
  }, [router]);

  return null;
}
