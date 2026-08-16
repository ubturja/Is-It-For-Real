# IsItFR?

Two experiences, one engine: **Train** (`/train`) builds media-literacy through scored experiments; **Crisis Mode** (`/help`) is a login-free, offline-capable path for the moment a deepfake targets someone you know.

Live: [https://isitfr.vercel.app](https://isitfr.vercel.app)

Architecture and contracts: [`docs/SYSTEM_REFERENCE.md`](docs/SYSTEM_REFERENCE.md). Judge walkthrough: [`docs/DEMO.md`](docs/DEMO.md).

## Stack

- `apps/web` — Next.js 14 App Router (UI + Route Handlers). This is the only deployed app.
- `packages/schemas`, `packages/engine`, `packages/content-config`, `packages/analytics` — shared contracts, XState compiler, glob-discovered flow JSON, scoring.
- `apps/edge-api` — parked Hono health stub. **Not deployed.** Do not provision a second backend.
- Supabase — Auth + Postgres + RLS. Not a custom API host.

## Local setup

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
# Fill Supabase URL/keys, GROQ_API_KEY, and E2E_* (see the example file).
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000). `/help` works without an account. `/train` requires an account; results are saved automatically once you're signed in (email/password, or Google once the Auth redirect allow-list includes this origin).

Production Auth redirects (Dashboard → Authentication → URL configuration):

- Site URL: `https://isitfr.vercel.app`
- Redirect URLs: `http://localhost:3000/auth/callback` **and** `https://isitfr.vercel.app/auth/callback`

## Tests

```bash
pnpm -r test                          # unit (all workspaces)
pnpm --filter web test:e2e            # production build + full Playwright
pnpm --filter web test:e2e:a11y       # axe-core (critical/serious) + keyboard Crisis Mode
```

CI (`.github/workflows/ci.yml`) runs lint/typecheck/unit, then a11y and e2e against a production Next build. Required GitHub Actions secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_EMAIL`, `E2E_PASSWORD`. Optional: `GROQ_API_KEY` (reflect/personalize; e2e mocks reflect).

## Deploy

Vercel project root is `apps/web`. Set the same server env vars there — never `NEXT_PUBLIC_GROQ_*` or a public service-role key. Crisis Mode is a static/PWA path; training Route Handlers stay inside the Next.js app.
