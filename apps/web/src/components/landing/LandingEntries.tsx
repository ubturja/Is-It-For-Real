import { IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import type { LandingChrome } from "@isitfr/schemas";

import { cn } from "@/lib/utils";

import styles from "./LandingEntries.module.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

const ENTRY_HREF = {
  practice: "/train",
  help: "/help",
} as const;

type LandingEntriesProps = {
  entries: LandingChrome["entries"];
  bodyClassName: string;
};

export function LandingEntries({
  entries,
  bodyClassName,
}: LandingEntriesProps) {
  return (
    <section aria-label="Choose a path" className={styles.list}>
      {entries.map((entry) => (
        <Link
          key={entry.kind}
          href={ENTRY_HREF[entry.kind]}
          prefetch={false}
          className={cn(
            styles.card,
            entry.kind === "help" ? styles.help : styles.practice,
            bodyClassName,
          )}
        >
          <p className={cn(styles.eyebrow, plexMono.className)}>
            {entry.eyebrow}
          </p>
          <p className={styles.body}>{entry.body}</p>
          <span className={styles.action}>
            {entry.action}
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
