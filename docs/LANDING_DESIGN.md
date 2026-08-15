# Landing (`/`) — design plan

Review this before any component work. Scope is the home page only. Train (`/train`) and Crisis (`/help`) stay separate journeys; this page is the fork, not a blend.

## Identity (existing — do not invent)

Reuse GutCheck’s palette and the PRD type pairing. Current `apps/web` still uses Geist + shadcn neutrals; the landing (and later token pass) should lock to these values instead of a new look.

| Role | Value | Use on `/` |
|---|---|---|
| Ink | `#12181c` | Body, headline |
| Paper | `#f7f5f0` | Page ground |
| Accent teal | `#1f6f6b` | Primary in-body action (Practice) |
| Safe | `#1f7a5c` | Quiet “no account needed” cue on Get help — never a fake score |
| Caution | `#a8681a` | Optional rule/label only; not a CTA fill |
| Stop | `#b8402f` | Get help now (same job as today’s Help nav) |

**Type:** Source Serif 4 for the hero question only (one line, not section titles). IBM Plex Sans for body and buttons. IBM Plex Mono for short labels (`Practice`, `Get help now`, captions). Do not set whole paragraphs in serif or mono.

Traffic-light color is never the only signifier (same rule as step chrome: label + color).

---

## Why this is not a generic template

Do this **before** the two entry-point cards (U3). A typical SaaS landing earns trust with a numbered “how it works,” a gradient hero, and three invented stats. This product does not have a user count or a detection accuracy to put in a hero, and numbering the two paths would imply a sequence (train, then crisis — or the reverse) that the system reference forbids. The page should feel like a printed question on paper: one live headline, plain speech, two doors. No `01 / 02 / 03` markers, no “trusted by”, no metric tiles, no purple-to-teal mesh behind the H1.

---

## U1 — Hero

The page is the question: a Source Serif 4 line that types and erases **Is It For Real?** (pause on the full phrase; respect `prefers-reduced-motion` with the static sentence). One IBM Plex Sans subline under it, no supporting stats or screenshots.

```
+----------------------------------------------------------+
|  IsItFR                                    [nav: existing]|
+----------------------------------------------------------+
|                                                          |
|     Is It For Real?█                                     |
|                                                          |
|     Two tools: practice spotting manipulation,           |
|     or get through the next ten minutes if a             |
|     fake of someone you know is already circulating.     |
|                                                          |
+----------------------------------------------------------+
```

Proposed subline (plain, not a pitch): *Two tools: practice spotting manipulation, or get through the next ten minutes if a fake of someone you know is already circulating.*

---

## U2 — What it does / the problem / how it solves it

Three short blocks in visitor language: what this is, why the usual advice fails, what you actually do here. Equal weight, no icons-as-illustration, no “Our solution” heading voice.

```
+----------------------------------------------------------+
|  WHAT THIS IS                                            |
|  A training path and a crisis path. They do not mix.     |
|                                                          |
|  THE PROBLEM                                             |
|  A convincing fake of someone you know does not feel     |
|  like a quiz. Definitions you memorized do not help      |
|  in that minute.                                         |
|                                                          |
|  WHAT YOU DO HERE                                        |
|  Practice inside setups that measure how you react,      |
|  without being told the score while you go. If it is     |
|  already happening, follow five fixed steps — no login.  |
+----------------------------------------------------------+
```

Mono eyebrows (`WHAT THIS IS` / `THE PROBLEM` / `WHAT YOU DO HERE`). Body in Plex Sans. Stack on small screens; three columns only if the type still reads as paragraphs, not cards with trophies.

---

## U3 — Two entry points (primary in-body actions)

The decision lives in the page body, not only in the top nav: **Practice** goes to `/train` (account wall is the train app’s job). **Get help now** goes to `/help` (never imply signup). Two labeled doors, same hierarchy, different color jobs (teal vs stop).

```
+----------------------------------------------------------+
|  +------------------------+  +------------------------+  |
|  | PRACTICE               |  | GET HELP NOW           |  |
|  |                        |  |                        |  |
|  | Try experiments that   |  | Stop, save evidence,   |  |
|  | put you inside the     |  | tell someone, send a   |  |
|  | trick. Needs an        |  | message. No account.   |  |
|  | account.               |  | Works offline after    |  |
|  |                        |  | the first visit.       |  |
|  |  [ Practice → ]        |  |  [ Get help now → ]    |  |
|  +------------------------+  +------------------------+  |
+----------------------------------------------------------+
```

Do not stack them as step 1 then step 2. Do not put a single full-width “Get started”. Keep the existing header Help control; these buttons are the ones a first-time scroller should hit.

---

## U4 — Footer

A thin paper-edge close: wordmark, the two paths again as text links, one line that Crisis never needs an account. No newsletter, social row, or fake company block.

```
+----------------------------------------------------------+
|  IsItFR          Practice              Get help now      |
|  Crisis help never asks you to sign in.                  |
+----------------------------------------------------------+
```
