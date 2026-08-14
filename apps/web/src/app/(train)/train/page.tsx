import Link from "next/link";
import { listExperiments } from "@isitfr/content-config";

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            Train
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Pick a scenario and go through it without knowing what is being
            measured.
          </p>
        </div>
        <Link
          href="/train/profile"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Your profile
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
                  <CardDescription className="text-xs font-medium tracking-wide uppercase">
                    {experiment.track}
                  </CardDescription>
                  <CardTitle className="text-lg">{experiment.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm normal-case tracking-normal">
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
