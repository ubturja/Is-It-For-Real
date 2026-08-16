"use client";

import type { Step } from "@isitfr/schemas";

import { StepRenderer } from "@/components/flow-steps";

const mockSteps: { label: string; step: Step }[] = [
  {
    label: "STOP",
    step: {
      type: "STOP",
      prompt: "Stop. Do not share or engage further.",
      why: "Engaging can amplify harm.",
      next: "preserve",
    },
  },
  {
    label: "PRESERVE",
    step: {
      type: "PRESERVE",
      prompt: "Preserve evidence before anything else.",
      why: "Screenshots and timestamps help later reporting.",
      next: "who",
    },
  },
  {
    label: "BRANCH",
    step: {
      type: "BRANCH",
      prompt: "Who do you need to tell?",
      options: [
        { label: "A trusted friend", value: "friend", next: "template" },
        { label: "Someone in authority", value: "authority", next: "template" },
      ],
    },
  },
  {
    label: "TEMPLATE",
    step: {
      type: "TEMPLATE",
      prompt: "Send this message.",
      templateKey: "crisis-deepfake-classmate-trusted-adult",
      next: "resources",
    },
  },
  {
    label: "RESOURCES",
    step: {
      type: "RESOURCES",
      prompt: "Here are resources that can help.",
      resourceSet: "crisis-deepfake-classmate",
    },
  },
  {
    label: "MEASURE",
    step: {
      type: "MEASURE",
      prompt: "Stub probe — not real experiment content.",
      metric: "stub_signal",
      weight: 1,
      next: "done",
    },
  },
];

function logAdvance(stepType: string) {
  return (value?: string | number) => {
    console.log("[flow-steps scratch] onAdvance", { stepType, value });
  };
}

export default function FlowStepsScratchPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Flow steps scratch
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Mock data only — Continue / Done logs to the console via{" "}
          <code className="text-foreground">onAdvance</code>.
        </p>
      </div>

      {mockSteps.map(({ label, step }) => (
        <section key={label} className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </h2>
          <StepRenderer step={step} onAdvance={logAdvance(label)} />
        </section>
      ))}
    </main>
  );
}
