-- Bloat MVP schema
--
-- Design principles (see product spec sections 20-21):
--   1. Raw observations (what the user logged, what the vision model saw)
--      are stored separately from interpretation (patterns, insights) so
--      analysis can be recomputed later without losing source data.
--   2. Every observation carries a timestamp so temporal relationships
--      (meal -> symptom onset) can be analyzed.
--   3. Every generated insight/pattern stores the evidence used to produce
--      it (pattern_evidence), for auditability and re-explanation.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  timezone text not null default 'UTC',
  onboarding jsonb, -- OnboardingAnswers, see src/lib/types.ts
  baseline_started_at timestamptz,
  baseline_complete boolean not null default false
);

alter table public.users enable row level security;
create policy "users manage own row" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  provider text not null default 'revenuecat',
  product_id text,
  current_period_end timestamptz,
  status text not null default 'none'
    check (status in ('active', 'trialing', 'canceled', 'expired', 'none')),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "users read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
-- Writes to subscriptions happen via the RevenueCat webhook (service role),
-- never directly from the client.

-- ---------------------------------------------------------------------------
-- Ingredients & categories (shared reference data, not per-user)
-- ---------------------------------------------------------------------------

create table public.ingredient_categories (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique, -- e.g. 'dairy', 'carbonated', 'cruciferous_vegetables'
  label text not null,
  is_bloat_relevant boolean not null default true
);

create table public.ingredients (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique, -- normalized, e.g. 'broccoli'
  category_id uuid references public.ingredient_categories (id)
);

-- Readable by any authenticated user; writes are admin/service-role only.
alter table public.ingredient_categories enable row level security;
alter table public.ingredients enable row level security;
create policy "read categories" on public.ingredient_categories
  for select using (auth.role() = 'authenticated');
create policy "read ingredients" on public.ingredients
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Meals (raw observation layer)
-- ---------------------------------------------------------------------------

create table public.meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  logged_at timestamptz not null,
  created_at timestamptz not null default now(),
  portion_size text check (portion_size in ('small', 'medium', 'large')),
  notes text,
  source text not null check (source in ('photo', 'manual'))
);

create index meals_user_logged_at_idx on public.meals (user_id, logged_at desc);

alter table public.meals enable row level security;
create policy "users manage own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.meal_photos (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  storage_path text not null, -- Supabase Storage object path
  created_at timestamptz not null default now(),
  vision_raw_response jsonb, -- verbatim model output, kept for re-analysis
  vision_model text
);

alter table public.meal_photos enable row level security;
create policy "users manage own meal photos" on public.meal_photos
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create table public.meal_ingredients (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id),
  raw_label text not null, -- what was shown/typed, e.g. 'creamy sauce'
  source text not null check (source in ('vision', 'user_added', 'user_confirmed')),
  confidence numeric(3, 2) -- 0-1, from vision model; null for user-entered
);

create index meal_ingredients_meal_idx on public.meal_ingredients (meal_id);
create index meal_ingredients_ingredient_idx on public.meal_ingredients (ingredient_id);

alter table public.meal_ingredients enable row level security;
create policy "users manage own meal ingredients" on public.meal_ingredients
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Symptoms (raw observation layer)
-- ---------------------------------------------------------------------------

create table public.symptom_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  severity smallint not null check (severity between 0 and 5),
  types text[] not null default '{}', -- SymptomType[]
  notes text,
  red_flags text[] not null default '{}' -- RedFlagSymptom[]
);

create index symptom_events_user_occurred_at_idx
  on public.symptom_events (user_id, occurred_at desc);

alter table public.symptom_events enable row level security;
create policy "users manage own symptom events" on public.symptom_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Optional context factors (per-meal or per-day)
-- ---------------------------------------------------------------------------

create table public.context_factors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete cascade,
  occurred_at timestamptz not null,
  key text not null check (key in (
    'carbonated_drink', 'alcohol', 'coffee', 'unusually_large_meal',
    'ate_quickly', 'late_meal', 'stress', 'poor_sleep', 'menstrual_cycle'
  )),
  value jsonb
);

create index context_factors_user_occurred_at_idx
  on public.context_factors (user_id, occurred_at desc);

alter table public.context_factors enable row level security;
create policy "users manage own context factors" on public.context_factors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Patterns (interpretation layer)
-- ---------------------------------------------------------------------------

create table public.patterns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  factor_type text not null check (
    factor_type in ('ingredient_category', 'context_factor', 'portion_size', 'meal_timing')
  ),
  factor_key text not null,
  factor_label text not null,
  confidence text not null check (
    confidence in ('early_signal', 'possible_pattern', 'stronger_pattern')
  ),
  summary text not null, -- LLM-authored explanation, derived from evidence only
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patterns_user_active_idx on public.patterns (user_id, is_active);

alter table public.patterns enable row level security;
create policy "users read own patterns" on public.patterns
  for select using (auth.uid() = user_id);
-- Patterns are written by a trusted server-side job (service role), not
-- directly by the client, since they must always be backed by evidence
-- computed from the deterministic pattern engine.

create table public.pattern_evidence (
  id uuid primary key default uuid_generate_v4(),
  pattern_id uuid not null references public.patterns (id) on delete cascade,
  computed_at timestamptz not null default now(),
  exposed_count int not null,
  exposed_symptom_count int not null,
  unexposed_count int not null,
  unexposed_symptom_count int not null,
  exposed_avg_severity numeric(4, 2) not null,
  unexposed_avg_severity numeric(4, 2) not null,
  effect_size numeric(4, 3) not null,
  p_value numeric(6, 5),
  median_onset_hours numeric(5, 2),
  exposed_meal_ids uuid[] not null default '{}',
  unexposed_meal_ids uuid[] not null default '{}'
);

create index pattern_evidence_pattern_idx on public.pattern_evidence (pattern_id);

alter table public.pattern_evidence enable row level security;
create policy "users read own pattern evidence" on public.pattern_evidence
  for select using (
    exists (select 1 from public.patterns p where p.id = pattern_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Experiments
-- ---------------------------------------------------------------------------

create table public.experiments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  pattern_id uuid references public.patterns (id),
  title text not null,
  factor_type text not null,
  factor_key text not null,
  factor_label text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  duration_days int not null default 7,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  baseline_avg_severity numeric(4, 2)
);

create index experiments_user_status_idx on public.experiments (user_id, status);

alter table public.experiments enable row level security;
create policy "users manage own experiments" on public.experiments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.experiment_observations (
  id uuid primary key default uuid_generate_v4(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  date date not null,
  avg_severity numeric(4, 2),
  symptom_count int not null default 0,
  adhered_to_experiment boolean not null default true,
  unique (experiment_id, date)
);

alter table public.experiment_observations enable row level security;
create policy "users manage own experiment observations" on public.experiment_observations
  for all using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Insights (LLM-authored, always traceable to a pattern/experiment)
-- ---------------------------------------------------------------------------

create table public.user_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  pattern_id uuid references public.patterns (id),
  experiment_id uuid references public.experiments (id),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('pattern_found', 'experiment_result', 'milestone', 'safety')),
  text text not null,
  seen_at timestamptz
);

create index user_insights_user_created_idx on public.user_insights (user_id, created_at desc);

alter table public.user_insights enable row level security;
create policy "users read own insights" on public.user_insights
  for select using (auth.uid() = user_id);
create policy "users mark own insights seen" on public.user_insights
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed reference data: a starter set of bloat-relevant ingredient categories
-- ---------------------------------------------------------------------------

insert into public.ingredient_categories (key, label, is_bloat_relevant) values
  ('dairy', 'Dairy', true),
  ('carbonated', 'Carbonated drinks', true),
  ('cruciferous_vegetables', 'Cruciferous vegetables', true),
  ('legumes', 'Beans & legumes', true),
  ('high_fat', 'High-fat', true),
  ('fried', 'Fried food', true),
  ('gluten_grains', 'Wheat & gluten grains', true),
  ('onion_garlic', 'Onion & garlic', true),
  ('artificial_sweeteners', 'Artificial sweeteners', true),
  ('spicy', 'Spicy food', true),
  ('alcohol', 'Alcohol', true),
  ('caffeine', 'Caffeine', true),
  ('processed', 'Processed / packaged food', false),
  ('lean_protein', 'Lean protein', false),
  ('fruit', 'Fruit', false),
  ('leafy_greens', 'Leafy greens', false)
on conflict (key) do nothing;
