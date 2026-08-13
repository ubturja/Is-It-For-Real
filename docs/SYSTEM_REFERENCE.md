# IsItFR? — System Reference (v1.0)

## 1. Vision
IsItFR? teaches media & information literacy by putting people inside manipulation
instead of testing whether they can define it, AND gives them a real, working tool
for the moment a deepfake actually targets someone they know. Two experiences,
one shared engine.

## 2. User Journeys (kept deliberately separate — never merged in UI)

**Training path** (`/train`, requires account): dashboard of experiments → pick one →
go through an interactive scenario without knowing what's being measured → get an
AI-generated reflection report → profile builds over time.

**Crisis path** (`/help`, no account, ever): one tap → five fixed steps (stop,
preserve evidence, choose who to tell, send a template message, get resources) →
leave. No score. No login. No data leaves the device in this phase of the build.

## 3. Scope for Phases 1–4
Building now: the shared step/flow engine, Crisis Mode (fully complete, standalone,
offline-capable), and the experiment framework skeleton (proves the same engine
runs a second flow type — not the full Framing/Echo/Memory/Read-the-Room content
yet, that's Phase 5+).

## 4. Shared Step Schema — the core contract
This is the single most important design decision in the system. Every flow —
Crisis Mode or any future experiment — is data, validated against this schema,
never hardcoded into a component.

```typescript
// packages/schemas/src/flow.ts
import { z } from "zod";

export const StepTypeEnum = z.enum([
  "STOP", "PRESERVE", "BRANCH", "TEMPLATE", "RESOURCES", "MEASURE",
]);

export const StepOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  next: z.string(), // target step key
});

export const StepSchema = z.object({
  type: StepTypeEnum,
  prompt: z.string(),
  why: z.string().optional(),
  templateKey: z.string().optional(),   // TEMPLATE steps
  resourceSet: z.string().optional(),   // RESOURCES steps
  metric: z.string().optional(),        // MEASURE steps
  weight: z.number().optional(),        // MEASURE steps
  options: z.array(StepOptionSchema).optional(), // BRANCH steps
  next: z.string().optional(),          // linear steps
});

export const FlowConfigSchema = z.object({
  flowId: z.string(),
  version: z.number().int().positive(),
  type: z.enum(["crisis", "experiment"]),
  title: z.string(),
  initial: z.string(),
  steps: z.record(z.string(), StepSchema), // keyed dynamically — no hardcoded step list anywhere
});

export type FlowConfig = z.infer<typeof FlowConfigSchema>;
export type Step = z.infer<typeof StepSchema>;
```

**Adding a flow (glob discovery — no code changes):** Drop a valid
`{flowId}.v{version}.json` file into `packages/content-config/src/flows/`.
At module init, `@isitfr/content-config` enumerates every `*.v*.json` file in
that directory via build-time glob discovery (`import.meta.glob` under
Vite/Vitest; webpack `require.context` under Next.js; Node `fs` at module init
when no bundler glob is available), validates each with
`validateFlowConfig`, and builds an in-memory map keyed by `flowId`.
`getFlow(flowId)` and `listExperiments()` read that map — never a manual
per-flow import or registry entry in `packages/content-config` or `apps/web`.
An invalid file in that directory throws at load (build/test failure), it
does not silently disappear from the list.

**Step chrome (per-step-type defaults, not per-flow):** Eyebrow/title labels,
action buttons, and empty-state copy for STOP / PRESERVE / BRANCH / TEMPLATE /
RESOURCES / MEASURE live in
`packages/content-config/src/chrome/stepChrome.en.json`, loaded via
`getStepChrome()`. They are shared UI chrome for every flow. Scenario copy
(`prompt`, `why`, option labels, templates, resources) stays on the flow JSON.
Do not hardcode chrome strings in `apps/web/src/components/flow-steps`.

### BRANCH choices and scoring (locked decision)

**Decision: (a) — encode the choice in the flow graph.** Each BRANCH option
that should affect a score routes to its own downstream MEASURE step with a
fixed `metric` and `step.weight`. The path taken *is* the score. Phase 6
reads `context.measurements` only.

**Not (b).** The engine does **not** write BRANCH option values into
`context.answers`. That field stays empty for scoring. Crisis Mode still
persists the picked option in Zustand for IndexedDB resume — resume is not
the scoring channel, and experiments must not copy that pattern.

When a MEASURE step receives `NEXT` without a numeric `value`, the engine
records `{ metric, value: step.weight ?? 0 }`. An explicit numeric `value`
on the event still wins (slider / rated MEASURE).

Phase 5 Framing should copy this diamond, not invent answer-lookups:

`packages/content-config/src/flows/experiment-framing-pattern.v1.json`
(BRANCH `headline` → `measure_amplify` weight `1` / `measure_verify` weight
`0` → shared `done`).

## 5. Data Model (ER Diagram)

```mermaid
erDiagram
    USERS ||--o| PROFILES : has
    USERS ||--o{ FLOW_SESSIONS : starts
    FLOWS ||--o{ FLOW_VERSIONS : "versioned by"
    FLOWS ||--o{ FLOW_SESSIONS : "instance of"
    FLOWS ||--o{ MESSAGE_TEMPLATES : "may reference"
    FLOWS ||--o{ RESOURCES : "may reference"
    FLOW_VERSIONS ||--o{ FLOW_SESSIONS : "run against"
    FLOW_SESSIONS ||--o{ FLOW_INTERACTIONS : logs
    FLOW_SESSIONS ||--o{ FLOW_SCORES : produces
    FLOW_SESSIONS ||--o| REPORTS : generates
    FLOW_SCORES }o--|| PROFILES : "aggregates into"

    USERS { uuid id PK "references auth.users" string email timestamp created_at }
    PROFILES { uuid user_id PK_FK jsonb aggregated_scores timestamp updated_at }
    FLOWS { uuid id PK string key UK string type "crisis|experiment" string title string track string status timestamp created_at }
    FLOW_VERSIONS { uuid id PK uuid flow_id FK int version_number jsonb config boolean is_active timestamp created_at }
    FLOW_SESSIONS { uuid id PK uuid flow_id FK uuid flow_version_id FK uuid user_id FK "nullable" boolean is_anonymous string status timestamp started_at timestamp completed_at }
    FLOW_INTERACTIONS { uuid id PK uuid session_id FK string step_id string choice_value int reaction_time_ms int confidence timestamp created_at }
    FLOW_SCORES { uuid id PK uuid session_id FK string metric_name float metric_value }
    REPORTS { uuid id PK uuid session_id FK uuid user_id FK text content string model_used timestamp generated_at }
    MESSAGE_TEMPLATES { uuid id PK uuid flow_id FK string key string locale text body }
    RESOURCES { uuid id PK uuid flow_id FK string region string category string title string url }
```

**Important scope note:** `FLOWS`/`FLOW_VERSIONS` model the *full future* system
(a CMS-editable flow store). In Phases 1–4, flow configs are static, versioned
JSON files under `packages/content-config/src/flows/`, glob-discovered at
module init — NOT read from these Supabase tables — because Crisis Mode must
work fully offline with zero network dependency. Do not wire DB-backed flow
loading until told to in a later phase.

## 6. System Architecture (development view)

```mermaid
flowchart TB
    subgraph WEB["apps/web — Next.js 14 (App Router, TypeScript)"]
        UI_TRAIN["/train routes — Dashboard + Experiment Runner"]
        UI_HELP["/help routes — Crisis Mode UI"]
        XSTATE["XState machines (client-interpreted via @xstate/react)"]
        ZUSTAND["Zustand store (IndexedDB-persisted crisis state)"]
        SW["Service Worker (Serwist / @serwist/next) — offline shell"]
        RH["Route Handlers / Server Actions"]
        UI_TRAIN --> XSTATE
        UI_HELP --> XSTATE
        UI_HELP --> ZUSTAND
        ZUSTAND -.persists.-> IDB[("IndexedDB")]
        SW -.caches.-> UI_HELP
        UI_TRAIN --> RH
    end
    subgraph PACKAGES["Shared packages (framework-agnostic)"]
        SCHEMAS["packages/schemas — Zod, single source of truth"]
        ENGINE["packages/engine — JSON config → XState compiler"]
        CONTENT["packages/content-config — glob-discovered flow JSON"]
    end
    subgraph EDGE["apps/edge-api — Hono (optional/stretch)"]
        HONO["Alternative API layer, imports same packages"]
    end
    subgraph SUPABASE["Supabase"]
        AUTH["Auth — email + Google"]
        PG[("PostgreSQL")]
        RLS["Row-Level Security"]
    end
    subgraph AI["AI Layer (Phase 7, not built yet)"]
        SDK["Vercel AI SDK"]
        MODEL["GPT-4o-mini / Claude 3.5 Haiku"]
    end
    XSTATE -.compiled from.-> ENGINE
    ENGINE -.validates against.-> SCHEMAS
    ENGINE -.reads.-> CONTENT
    RH -.validates I/O with.-> SCHEMAS
    RH --> AUTH
    RH --> PG
    PG --- RLS
    RH -.later.-> SDK
    SDK --> MODEL
    HONO -.imports.-> SCHEMAS
    HONO -.imports.-> ENGINE
    style AI stroke-dasharray: 5 5
    style EDGE stroke-dasharray: 5 5
```

## 7. High-Level Architecture (pitch view)

```mermaid
flowchart LR
    U["User"] --> WEB["Next.js App (Web + API)"]
    WEB --> ENGINE["Config-Driven Decision Engine (XState + JSON)"]
    WEB --> AUTH["Supabase (Auth + Postgres + RLS)"]
    ENGINE -.future.-> AI["AI Reflection (Vercel AI SDK)"]
    WEB -.offline.-> PWA["Service Worker + IndexedDB"]
```

## 8. Non-negotiable Engineering Principles
1. No hardcoded step sequences, scenario copy, resource lists, or step chrome in components — always from `packages/content-config` via a typed loader. **Extensibility is glob discovery, not a manual registry:** add a flow by dropping a valid `{flowId}.v{version}.json` into `src/flows/`; `@isitfr/content-config` enumerates `*.v*.json` at module init (`import.meta.glob` / webpack `require.context` / Node `fs`) and `getFlow` / `listExperiments` read that map. Do not add a per-flow import or registry entry. Step chrome is per-step-type defaults in `src/chrome/stepChrome.en.json` (see §4).
2. Exactly one schema definition (`packages/schemas`) — never redefine flow/step shapes locally.
3. `packages/engine` is framework-agnostic — no React, no Supabase, importable by `apps/web` and the parked `apps/edge-api`.
4. Crisis Mode (`/help`) must work with zero network calls after first load, and zero auth requirement, forever.
5. Deterministic scoring stays separate from the LLM — the model never generates the sequence of safety steps, only rewords already-fixed content (relevant from Phase 7 on).
6. RLS is default-deny; permissive policies are added explicitly, one at a time, as auth is wired.
7. Strict TypeScript, no `any`.

## 9. Full Phase Map (for context — only Phases 1–4 are being built now)
1. Foundation & Shared Contracts
2. Core Decision-Tree Engine
3. Crisis Mode (Complete, Standalone)
4. Simulation Engine & Experiment Framework
5. Build the Four Experiments
6. Analytics Engine
7. AI Reflection Layer
8. Integration, Polish, and Submission