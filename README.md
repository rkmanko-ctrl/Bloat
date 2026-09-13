# Bloat

**Stop feeling bloated.** Bloat helps people who bloat often find the personal
patterns behind it — what they ate, when, and how — and turn a hunch into a
small, honest experiment. It is not a calorie tracker, a diagnostic tool, or
a generic gut-health app: the entire product is built around one loop.

```
MEAL → SYMPTOM → PATTERN → EXPERIMENT → RESULT
```

This repo is an MVP build: a working React Native app with a fully seeded,
interactive mock backend, a real (tested) statistical pattern-detection
engine, and a Postgres schema + repository interface shaped for a real
Supabase backend to drop in behind it without touching a single screen.

## Quick start

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # jest — pattern engine + repository logic
npm start           # expo start (requires a simulator/device or Expo Go)
```

No API keys are required to run the app. Every screen runs against
`MockRepository` (`src/lib/repository/mockRepository.ts`), which is seeded
with ~3 weeks of realistic meal/symptom history on launch — including a
clear "carbonated drinks" association and a "dairy" association that's too
sparse to be more than an early signal — so Patterns, History, and the
experiment flow all have real content immediately. From Profile, "Restart
onboarding" resets to a blank first-run state.

> This environment could not run `expo start`/Metro end-to-end (no outbound
> access to Expo's dependency-version API), so UI screens are verified by
> TypeScript's structural checks (`npm run typecheck`, clean) rather than a
> live simulator render. The pattern engine and repository logic — the parts
> with real decision-making in them — are covered by 21 passing Jest tests.
> Run `npm start` locally to see the UI.

## Why this stack

| Layer | Choice | Why |
|---|---|---|
| Client | React Native + Expo + TypeScript | Fastest path to a polished iOS/Android MVP from one codebase; Expo's managed workflow avoids native build setup for camera/notifications/storage. |
| Backend | Supabase (Postgres + Auth + Storage) | Postgres gives us real relational integrity for the data model in section 20 (and window functions/CTEs if pattern-scoring ever needs to move server-side); RLS maps cleanly onto "users only see their own raw data"; Storage handles meal photos without a separate service. |
| Payments | RevenueCat | Cross-platform receipt validation without hand-rolling App Store/Play Store billing edge cases. |
| Analytics | PostHog | Product analytics + feature flags in one tool, self-hostable later if needed. |
| Errors | Sentry | Standard RN crash/error reporting. |
| Push | Expo Notifications | Ships with Expo, no extra native config. |

Nothing here was swapped from the brief. The one addition is **Zustand**
for the small bit of transient onboarding form state (section 4) — it's ~1KB,
avoids prop-drilling five onboarding screens, and everything durable still
goes through the repository, not the store.

## Architecture

```
src/
  theme/            design tokens (color, type, spacing) — see "Visual design" below
  lib/
    types.ts         domain types mirroring the Postgres schema 1:1
    factors.ts        turns a meal's raw attributes into "candidate factor" tags
    safety.ts          red-flag copy + detection (section 15)
    supabase.ts         lazy Supabase client (null until env vars are set)
    ai/
      mealVision.ts       vision adapter interface + deterministic mock
      insightExplainer.ts  evidence -> 1-3 sentence plain English, template-based
    patternEngine/     the deterministic statistics core (see below) + tests
    repository/
      types.ts            BloatRepository — the interface every screen uses
      mockRepository.ts    in-memory implementation, seeded, fully interactive
      supabaseRepository.ts sketch of the production implementation
  state/
    onboardingStore.ts  zustand store for in-progress onboarding answers
  components/         Button, Card, Chip, SeverityScale, ProgressDots, etc.
  navigation/         RootNavigator (stack) > OnboardingNavigator / TabNavigator
  screens/            onboarding/ today/ meal/ symptom/ safety/ patterns/
                      experiments/ history/ profile/ paywall/
supabase/
  migrations/0001_init.sql   full Postgres schema + RLS + seed ingredient categories
```

**Screens never import `MockRepository` or `SupabaseRepository` directly** —
only `repository` from `src/lib/repository/index.ts`. Swapping to a live
Supabase project is a one-line change there once `supabaseRepository.ts` is
filled in against a real project (it already implements the simple CRUD
paths against the schema below; see the comment on that file for why
pattern/experiment computation is left as a documented gap rather than a
guess at Edge Function code nobody can run).

## The pattern engine — the actual product

`src/lib/patternEngine/` (100% unit tested, 16 tests) is a small,
dependency-free, deterministic statistics layer. It is deliberately **not**
"send everything to an LLM and ask what causes bloating" — section 21 of the
brief is explicit that an LLM should explain results, not compute them.

For every candidate factor found in a user's logged meals (an ingredient
category like *dairy*, a context factor like *carbonated drink*, *large
portion*, or an *evening meal* timing bucket):

1. **Attribution** — each symptom event is attached to the single nearest
   *preceding* meal within a configurable window (default 4h). Attributing
   to the nearest meal, not "every meal in the past N hours," avoids
   crediting one bloating episode to several back-to-back meals and
   inflating every factor's apparent association.
2. **2×2 comparison** — meals are split into *exposed* (has the factor) vs
   *unexposed*, each further split into symptom-positive (severity ≥
   threshold) vs not.
3. **Significance** — a one-sided **Fisher's exact test** (computed exactly,
   via log-factorials, no external stats library) on that 2×2 table asks
   "is the exposed group's symptom rate higher than chance would predict,
   given these exact sample sizes?" This is the right test for small,
   uneven samples — the situation every user is in for their first few
   weeks — where a normal approximation would be misleading.
4. **Confidence tiering** (`early_signal` / `possible_pattern` /
   `stronger_pattern`) is threshold-based on sample size **first**, then
   effect size and p-value — never on p-value alone, so a technically
   "significant" result from 6 meals still reads as *early signal*, and a
   real effect with too little data yet isn't overclaimed. A factor with
   plenty of data but essentially no gap between exposed/unexposed isn't
   reported as a weak pattern — it's dropped, because that's evidence
   *against* a link, not for one.
5. **Onset timing** — median and interquartile range of hours between a
   qualifying meal and its attributed symptom, shown as "~1-3 hours later."

`src/lib/patternEngine/experiment.ts` applies the same "don't overclaim"
posture to a finished 7-day experiment: it needs at least 5 days of data
before rendering any verdict, and requires the baseline-vs-experiment gap to
clear a minimum absolute threshold (0.75 on the 0-5 severity scale) before
calling it "improved," rather than reacting to any nonzero difference.

**Every number shown to the user comes from this layer.** The LLM-facing
explainer (`src/lib/ai/insightExplainer.ts`) is a template today and would
become an actual LLM call in production — but its prompt would be
constrained to *reformulate these exact numbers in plain English*, never to
introduce new ones. That's why the wording is careful to say "bloating has
been logged more often after..." and never "X causes your bloating."

## Data model

`supabase/migrations/0001_init.sql` implements the section 20 schema:
`users`, `subscriptions`, `ingredient_categories` / `ingredients`, `meals` /
`meal_photos` / `meal_ingredients`, `symptom_events`, `context_factors`,
`patterns` / `pattern_evidence`, `experiments` / `experiment_observations`,
`user_insights`. A few decisions worth calling out:

- **Raw observations vs. interpretation are different tables with different
  write permissions.** Clients can insert/select their own meals, symptoms,
  and context factors (RLS: `auth.uid() = user_id`). `patterns` and
  `pattern_evidence` are client-*readable* only — they're meant to be
  written by a trusted server-side job (service role) running the pattern
  engine, so the numbers a user sees always came from that one deterministic
  place, not from whatever the client happened to compute locally with
  possibly-stale data.
- **`pattern_evidence` stores the counts, not just a confidence label** —
  exposed/unexposed counts and meal IDs, effect size, p-value, onset
  timing — so a "why am I seeing this" audit or a future re-scoring never
  needs to touch raw meals/symptoms again.
- Every observation table carries both `occurred_at`/`logged_at` (when it
  happened) and `created_at` (when it was recorded), since the pattern
  engine's attribution step depends entirely on real elapsed time between
  meal and symptom, not entry order.

## Safety (section 15)

Bloat is a wellness product, not a diagnostic one. It never names a
condition (IBS, SIBO, intolerance, allergy, celiac). The bloat check-in has
a de-emphasized "this feels like more than usual bloating" disclosure
(`src/screens/symptom/BloatCheckInScreen.tsx`) that, if the user selects any
red-flag symptom (severe/persistent pain, blood in stool, repeated
vomiting, unexplained weight loss, fever), routes to
`SafetyFlowScreen` instead of back to the normal logging flow — that screen
has no path back into pattern/experiment features, only toward care
guidance. The same disclaimer text is always visible from Profile,
unpaywalled, per the brief's "never paywall basic safety information."

## Monetization (section 17)

`PatternsScreen` shows the single strongest pattern in full and blurs/locks
the rest behind "Unlock my patterns" once there's more than one — the
paywall moment the brief asks for ("we found N possible patterns..."),
not a generic upsell shown on day one. `MockRepository.setSubscriptionTier`
stands in for RevenueCat's purchase flow; in production that write happens
via RevenueCat's webhook into the `subscriptions` table, never directly from
the client (see the RLS policy comment in the migration).

## Visual design

`src/theme/index.ts` defines the palette: warm off-white background, soft
charcoal text, a single warm terracotta accent used only for primary
actions, and a severity scale that goes neutral → warm rather than
green → red, so a "5" reads as *intense*, not *bad/failing*. No hospital
blues, no meditation-app gradients, no health-tech green wash — the goal
was something closer to a calm, premium nutrition-brand feel than a
clinical dashboard.

## What's mocked vs. real

| Area | Status |
|---|---|
| Pattern-detection statistics | **Real**, tested (16 tests) |
| Experiment baseline/comparison logic | **Real**, tested |
| Repository interactivity (logging meals/symptoms updates Today/Patterns/History live) | **Real**, tested |
| Supabase schema | **Real**, ready to run as a migration on a fresh project |
| Meal photo → ingredients (vision) | **Mocked** — `MockMealVisionAdapter` returns a fixed, believable result; swap by implementing `MealVisionAdapter` against a real vision model call from a Supabase Edge Function (keeps the API key server-side) |
| Pattern explanations in plain English | **Templated**, not LLM-generated — see the note in `insightExplainer.ts` on how to constrain a real LLM call to the same evidence-only posture |
| Supabase/RevenueCat/PostHog/Sentry wiring | **Not connected** — no project credentials exist in this environment. `supabaseRepository.ts` and `.env.example` show the intended shape |

## Suggested next steps

1. Stand up a Supabase project, run `supabase/migrations/0001_init.sql`, and
   fill in `.env` from `.env.example`.
2. Write the `analyze-meal` and `analyze-patterns` Edge Functions — the
   latter should just import and call `analyzeCandidateFactors` from
   `src/lib/patternEngine`, the same function the mock repository already
   uses, so behavior never diverges between dev and production.
3. Implement the remaining `SupabaseRepository` methods and flip
   `src/lib/repository/index.ts` to export it instead of `mockRepository`.
4. Wire RevenueCat, PostHog, and Sentry per their Expo SDK docs; none of the
   app code assumes a particular analytics/monitoring vendor beyond the
   repository boundary.
