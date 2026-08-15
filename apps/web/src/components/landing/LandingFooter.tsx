import Link from "next/link";
import type { LandingChrome } from "@isitfr/schemas";

type LandingFooterProps = {
  footer: LandingChrome["footer"];
  className: string;
};

export function LandingFooter({ footer, className }: LandingFooterProps) {
  return (
    <footer className={`${className} mt-20 border-t border-[#12181c]/15 pt-6 pb-10`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="font-medium">{footer.wordmark}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/train"
            prefetch={false}
            className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6f6b]"
          >
            {footer.practice}
          </Link>
          <Link
            href="/help"
            prefetch={false}
            className="font-medium text-[#b8402f] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8402f]"
          >
            {footer.help}
          </Link>
        </nav>
      </div>
      <p className="mt-3 text-sm" style={{ color: "#1f7a5c" }}>
        {footer.note}
      </p>
    </footer>
  );
}
