# Demo walkthrough

Use this script for a live or recorded demo. Production: [https://isitfr.vercel.app](https://isitfr.vercel.app). Local: `pnpm --filter web dev` then [http://localhost:3000](http://localhost:3000).

## 1. Crisis Mode (`/help`) — no account

1. Open `/help`. You should land on STOP without a login wall.
2. Continue through PRESERVE → choose who to tell → TEMPLATE → RESOURCES.
3. Point out the step-type label **and** icon (not color alone).
4. Optional: toggle DevTools offline after the first load and complete the same path (PWA / service worker). The canned template still appears if personalize is unavailable.

Crisis Mode must not create a Supabase row. It is a separate product surface from Train.

## 2. Train (`/train`) — account required

1. Sign in (email/password). Google works once the production callback is on the Supabase Auth allow-list.
2. From the dashboard, run one experiment (Framing, Echo Chamber, Memory, or Read the Room). You should not be told what is being scored while you play. Sessions, interactions, and scores write to Supabase as you go — there is no local-only training run and no extra "save" tap.
3. At the end, the reflection report replaces the last step.
4. Open **Your profile**. After all four scored experiments, the radar shows four dimensions.

## 3. Isolation (talking point)

Completing Crisis Mode while logged into Train must not write training tables. The two paths share the step engine, not the persistence layer.
