import { IBM_Plex_Mono } from "next/font/google";
import type { LandingChrome } from "@isitfr/schemas";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

type LandingExplainerProps = {
  blocks: LandingChrome["explainer"];
  bodyClassName: string;
};

export function LandingExplainer({
  blocks,
  bodyClassName,
}: LandingExplainerProps) {
  return (
    <section
      aria-label="What this is"
      className="mt-16 grid gap-10 sm:mt-20 md:grid-cols-3 md:gap-10"
    >
      {blocks.map((block) => (
        <div key={block.eyebrow}>
          <h2
            className={`${plexMono.className} text-xs font-semibold tracking-[0.14em] uppercase`}
            style={{ color: "#6b4412" }}
          >
            {block.eyebrow}
          </h2>
          <p className={`${bodyClassName} mt-3 text-base leading-relaxed`}>
            {block.body}
          </p>
        </div>
      ))}
    </section>
  );
}
