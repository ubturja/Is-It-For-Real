"use client";

import { getReportChrome } from "@isitfr/content-config";
import type { ReflectionReport as ReflectionReportData } from "@isitfr/schemas";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ScoreStatus } from "@/hooks/useExperimentSession";
import { Button } from "@/components/ui/button";
import { fetchReflection } from "@/lib/reflect/fetchReflection";
import {
  REGENERATE_COOLDOWN_MS,
  canRegenerate,
} from "@/lib/reflect/regenerateGate";

export type ReflectionReportProps = {
  sessionId: string | null;
  scoreStatus: ScoreStatus;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; report: ReflectionReportData }
  | { kind: "unavailable" };

export function ReflectionReport({
  sessionId,
  scoreStatus,
}: ReflectionReportProps) {
  const chrome = getReportChrome();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [inFlight, setInFlight] = useState(false);
  const [lastStartedAt, setLastStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlightRef = useRef(false);
  const lastStartedAtRef = useRef<number | null>(null);
  const initialRequestedRef = useRef(false);

  const requestReflection = useCallback(async () => {
    if (sessionId === null) {
      return;
    }
    const started = Date.now();
    if (inFlightRef.current) {
      return;
    }
    if (!canRegenerate(lastStartedAtRef.current, started)) {
      return;
    }
    inFlightRef.current = true;
    lastStartedAtRef.current = started;
    setInFlight(true);
    setLastStartedAt(started);
    setNow(started);
    setView({ kind: "loading" });
    try {
      const report = await fetchReflection(sessionId);
      setView({ kind: "ready", report });
    } catch {
      setView({ kind: "unavailable" });
    } finally {
      inFlightRef.current = false;
      setInFlight(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (scoreStatus === "failed") {
      setView({ kind: "unavailable" });
      return;
    }
    if (scoreStatus !== "ready" || sessionId === null) {
      setView({ kind: "loading" });
      return;
    }
    if (initialRequestedRef.current) {
      return;
    }
    initialRequestedRef.current = true;
    void requestReflection();
  }, [requestReflection, scoreStatus, sessionId]);

  useEffect(() => {
    const remaining =
      lastStartedAt === null
        ? 0
        : lastStartedAt + REGENERATE_COOLDOWN_MS - now;
    if (remaining <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setNow(Date.now()), remaining);
    return () => window.clearTimeout(timer);
  }, [lastStartedAt, now]);

  const coolingDown = !canRegenerate(lastStartedAt, now);
  const regenerateLocked =
    inFlight || coolingDown || sessionId === null || scoreStatus !== "ready";

  return (
    <article className="mx-auto max-w-2xl py-12">
      <header className="space-y-4">
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          {chrome.title}
        </h1>
        <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
          {chrome.intro}
        </p>
      </header>

      <div className="mt-16">
        {view.kind === "loading" ? (
          <p className="text-muted-foreground text-base leading-relaxed">
            {chrome.loading}
          </p>
        ) : null}

        {view.kind === "unavailable" ? (
          <p className="text-muted-foreground text-base leading-relaxed">
            {chrome.unavailable}
          </p>
        ) : null}

        {view.kind === "ready" ? <ReportBody report={view.report} /> : null}
      </div>

      <footer className="mt-20 flex flex-wrap items-center gap-6">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={regenerateLocked}
          onClick={() => void requestReflection()}
        >
          {inFlight
            ? chrome.regenerating
            : coolingDown
              ? chrome.regenerateWait
              : chrome.regenerate}
        </Button>
        <Link
          href="/train"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          {chrome.back}
        </Link>
      </footer>
    </article>
  );
}

function ReportBody({ report }: { report: ReflectionReportData }) {
  const chrome = getReportChrome();

  return (
    <div className="space-y-16">
      <p className="text-lg leading-8">{report.summary}</p>

      {report.strengths.length > 0 ? (
        <section className="space-y-6">
          <h2 className="font-heading text-xl font-medium tracking-tight">
            {chrome.strengths}
          </h2>
          <ul className="space-y-5">
            {report.strengths.map((item) => (
              <li key={item} className="text-base leading-8">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.growthAreas.length > 0 ? (
        <section className="space-y-6">
          <h2 className="font-heading text-xl font-medium tracking-tight">
            {chrome.growthAreas}
          </h2>
          <ul className="space-y-5">
            {report.growthAreas.map((item) => (
              <li key={item} className="text-base leading-8">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
