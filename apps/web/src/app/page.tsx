import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { getLandingChrome } from "@isitfr/content-config";

import { LandingEntries } from "@/components/landing/LandingEntries";
import { LandingExplainer } from "@/components/landing/LandingExplainer";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { TypedHeadline } from "@/components/landing/TypedHeadline";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function HomePage() {
  const chrome = getLandingChrome();

  return (
    <div
      className="min-h-[calc(100svh-3.5rem)]"
      style={{ backgroundColor: "#f7f5f0", color: "#12181c" }}
    >
      <main className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <TypedHeadline
          text={chrome.hero.headline}
          className={sourceSerif.className}
        />
        <p
          className={`${plexSans.className} mt-6 max-w-xl text-lg leading-relaxed`}
        >
          {chrome.hero.subline}
        </p>
        <LandingExplainer
          blocks={chrome.explainer}
          bodyClassName={plexSans.className}
        />
        <LandingEntries
          entries={chrome.entries}
          bodyClassName={plexSans.className}
        />
      </main>
      <div className="mx-auto max-w-5xl px-4">
        <LandingFooter footer={chrome.footer} className={plexSans.className} />
      </div>
    </div>
  );
}
