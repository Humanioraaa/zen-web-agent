-- ============================================================================
-- Sprint 12 — Smart Price Tracking : Phase 1 schema
-- Tables: restocks, ingredient_price_history
-- Column: ingredients.price_alert_threshold_pct
-- Extension: pg_trgm (fuzzy ingredient matching, Phase 3)
-- Backfill: one 'seed' price-history row per existing ingredient
-- Additive only — Sprint 11 tables untouched except the one new column.
-- ============================================================================

-- 1. Fuzzy-match extension + trigram index on ingredient names ---------------
create extension if not exists pg_trgm;

create index if not exists ingredients_name_trgm_idx
  on public.ingredients using gin (name gin_trgm_ops);

-- 2. Per-ingredient alert threshold override (null = use global default 20%) --
alter table public.ingredients
  add column if not exists price_alert_threshold_pct numeric
    check (price_alert_threshold_pct is null
           or (price_alert_threshold_pct > 0 and price_alert_threshold_pct <= 100));

-- 3. restocks — first-class purchase event -----------------------------------
create table if not exists public.restocks (
  id                     uuid primary key default gen_random_uuid(),
  ingredient_id          uuid not null references public.ingredients(id) on delete restrict,
  qty_value              numeric not null check (qty_value > 0),
  qty_unit               text    not null check (qty_unit in ('package', 'base')),
  packages               numeric not null check (packages > 0),   -- derived, stored
  total_cost             numeric not null check (total_cost >= 0),
  package_cost           numeric not null check (package_cost >= 0), -- derived = total_cost / packages
  package_size_at_time   numeric not null,                          -- ingredient package_size snapshot
  expense_transaction_id uuid references public.transactions(id) on delete set null,
  note                   text,
  created_by             uuid references public.users(id),
  created_at             timestamptz not null default now()
);

create index if not exists restocks_ingredient_created_idx
  on public.restocks (ingredient_id, created_at desc);

-- 4. ingredient_price_history — audit trail of every price observation -------
create table if not exists public.ingredient_price_history (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  package_cost  numeric not null,
  package_size  numeric not null,
  unit_cost     numeric not null,                 -- snapshot of price at this point
  source        text not null check (source in ('restock', 'manual', 'seed')),
  restock_id    uuid references public.restocks(id) on delete set null,
  pct_change    numeric,                          -- vs previous price; null for baseline/seed
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists price_history_ingredient_created_idx
  on public.ingredient_price_history (ingredient_id, created_at desc);

-- 5. Row Level Security ------------------------------------------------------
-- Mirror the Sprint 11 pattern: web routes use the user-scoped client, so
-- authenticated users need access; the bot uses the service role (bypasses RLS).
-- NOTE: confirm this matches how `ingredients` RLS is set up before relying on it.
alter table public.restocks                 enable row level security;
alter table public.ingredient_price_history enable row level security;

create policy "authenticated full access — restocks"
  on public.restocks for all
  to authenticated using (true) with check (true);

create policy "authenticated full access — price history"
  on public.ingredient_price_history for all
  to authenticated using (true) with check (true);

-- 6. Backfill baseline price history (idempotent) ----------------------------
-- One 'seed' row per ingredient that has no history yet.
insert into public.ingredient_price_history
  (ingredient_id, package_cost, package_size, unit_cost, source, pct_change)
select
  i.id,
  i.package_cost,
  i.package_size,
  coalesce(i.unit_cost, i.package_cost / nullif(i.package_size, 0)),
  'seed',
  null
from public.ingredients i
where not exists (
  select 1 from public.ingredient_price_history h where h.ingredient_id = i.id
);
