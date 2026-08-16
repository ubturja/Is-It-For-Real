import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Training/site chrome. Must not render on /help — Crisis Mode has its own
 * layout with no Train/Profile links (see app/(help)/layout.tsx).
 */
export function SiteHeader() {
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
          className="text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Train
        </Link>
        <Link
          href="/train/profile"
          prefetch={false}
          className="text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Profile
        </Link>
        <Link
          href="/help"
          prefetch={false}
          className="ml-auto rounded-md px-2.5 py-1.5 text-sm font-medium text-step-stop underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-step-stop"
        >
          Help
        </Link>
      </nav>
    </header>
  );
}
