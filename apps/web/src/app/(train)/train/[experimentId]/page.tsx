import { ExperimentRunner } from "@/components/ExperimentRunner";

type ExperimentPageProps = {
  params: { experimentId: string };
};

/**
 * Smoke route: run an experiment flowId (e.g. experiment-stub) through the
 * shared ExperimentRunner shell. No dashboard or scoring UI.
 */
export default function ExperimentPage({ params }: ExperimentPageProps) {
  const { experimentId } = params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ExperimentRunner key={experimentId} flowId={experimentId} />
    </main>
  );
}
