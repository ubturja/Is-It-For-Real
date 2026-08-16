import Link from "next/link";
import { getDashboardChrome, listExperiments } from "@isitfr/content-config";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Train dashboard: config-driven experiment list (not Supabase).
 * Auth is enforced by middleware on /train.
 */
export default function TrainPage() {
  const experiments = listExperiments();
  const chrome = getDashboardChrome();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {chrome.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {chrome.intro}
          </p>
        </div>
        <Link
          href="/train/profile"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          {chrome.profile}
        </Link>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {experiments.map((experiment) => (
          <li key={experiment.flowId}>
            <Link
              href={`/train/${experiment.flowId}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-lg">{experiment.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {experiment.teaser}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
