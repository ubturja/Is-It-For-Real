import { getAuthChrome } from "@isitfr/content-config";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth/signOut";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navLinkClassName =
  "text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Training/site chrome. Must not render on /help — Crisis Mode has its own
 * layout with no Train/Profile links (see app/(help)/layout.tsx).
 */
export async function SiteHeader() {
  const authChrome = getAuthChrome();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3"
      >
        <Link
          href="/"
          prefetch={false}
          className={cn(buttonVariants({ variant: "ghost" }), "font-medium")}
        >
          IsItFR
        </Link>
        <Link
          href="/train"
          prefetch={false}
          className={navLinkClassName}
        >
          Train
        </Link>
        <Link
          href="/train/profile"
          prefetch={false}
          className={navLinkClassName}
        >
          Profile
        </Link>
        {user ? (
          <form action={signOut} className="ml-auto">
            <button type="submit" className={navLinkClassName}>
              {authChrome.signOut}
            </button>
          </form>
        ) : null}
        <Link
          href="/help"
          prefetch={false}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-sm font-medium text-step-stop underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-step-stop",
            user ? undefined : "ml-auto",
          )}
        >
          Help
        </Link>
      </nav>
    </header>
  );
}
