"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./TypedHeadline.module.css";
import { HOLD_MS, nextCharDelay } from "./typedHeadlineTiming";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type TypedHeadlineProps = {
  text: string;
  className?: string;
};

export function TypedHeadline({ text, className }: TypedHeadlineProps) {
  const chars = Array.from(text);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const media = window.matchMedia(REDUCE_MOTION_QUERY);
    const sync = () => {
      setReduceMotion(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      return;
    }

    let cancelled = false;
    let index = 0;
    let phase: "type" | "hold" | "delete" = "type";
    let timer = 0;
    const chars = Array.from(text);

    const queue = (delay: number) => {
      timer = window.setTimeout(tick, delay);
    };

    const tick = () => {
      if (cancelled) {
        return;
      }

      if (phase === "type") {
        index += 1;
        setVisibleCount(index);
        if (index >= chars.length) {
          phase = "hold";
          queue(HOLD_MS);
          return;
        }
        queue(nextCharDelay("type"));
        return;
      }

      if (phase === "hold") {
        phase = "delete";
      }

      index -= 1;
      setVisibleCount(Math.max(index, 0));
      if (index <= 0) {
        index = 0;
        phase = "type";
        queue(nextCharDelay("type"));
        return;
      }
      queue(nextCharDelay("delete"));
    };

    setVisibleCount(0);
    queue(nextCharDelay("type"));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduceMotion, text]);

  const liveText = chars.slice(0, visibleCount).join("");

  return (
    <h1
      className={cn(
        "text-[clamp(1.75rem,6.5vw,3.75rem)] font-semibold leading-tight tracking-tight",
        className,
      )}
    >
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className={styles.box}
        data-reduce-motion={
          reduceMotion === true
            ? "true"
            : reduceMotion === false
              ? "false"
              : undefined
        }
      >
        <span className={styles.reserve} data-testid="typed-headline-reserve">
          {text}
          <span className={styles.caret} />
        </span>
        <span className={styles.live} data-testid="typed-headline-live">
          {liveText}
          <span className={styles.caret} />
        </span>
      </span>
    </h1>
  );
}
