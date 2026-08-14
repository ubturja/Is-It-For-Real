import Link from "next/link";
import { getProfileChrome } from "@isitfr/content-config";
import { AggregatedScoresSchema } from "@isitfr/schemas";

import { ProfileRadar } from "@/components/ProfileRadar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { radarAxesFromScores } from "@/lib/profile/radarAxes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

async function loadOwnAggregatedScores(): Promise<Record<string, number>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {};
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("aggregated_scores")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || data === null) {
    return {};
  }

  const parsed = AggregatedScoresSchema.safeParse(data.aggregated_scores);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

/**
 * Training profile: radar of aggregated_scores, or an inviting empty state.
 * Auth is enforced by middleware on /train.
 */
export default async function ProfilePage() {
  const chrome = getProfileChrome();
  const scores = await loadOwnAggregatedScores();
  const axes = radarAxesFromScores(scores);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-3xl font-medium tracking-tight">
        {chrome.title}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
        {chrome.intro}
      </p>

      {axes.length === 0 ? (
        <Card className="mt-8 max-w-lg">
          <CardHeader>
            <CardTitle>{chrome.empty.title}</CardTitle>
            <CardDescription>{chrome.empty.body}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/train" className={cn(buttonVariants())}>
              {chrome.empty.action}
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <div className="mt-8">
          <ProfileRadar axes={axes} />
        </div>
      )}
    </main>
  );
}
