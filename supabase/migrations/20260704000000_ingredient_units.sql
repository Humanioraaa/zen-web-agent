-- ============================================================================
-- Sprint 16 F1 — Multi-unit ingredients (packaging tiers)
-- Each ingredient gets counting/purchase tiers (karton → pcs → base) each with a
-- factor to the base (recipe) unit, so stock can be counted/bought naturally and
-- converted to base for all math. Recipes + unit_cost unchanged (purely additive).
-- Backfill: a base tier (factor 1) + a 'kemasan' tier (= package_size) per ingredient.
-- ============================================================================

create table if not exists public.ingredient_units (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid    not null references public.ingredients(id) on delete cascade,
  label          text    not null,                       -- single word: 'karton','pcs','ml'
  factor_to_base numeric not null check (factor_to_base > 0),  -- base units per 1 of this tier
  is_base        boolean not null default false,         -- the recipe/base unit (factor 1)
  sort_order     integer not null default 0,             -- biggest→smallest for display
  created_at     timestamptz not null default now(),
  unique (ingredient_id, label)
);

create index if not exists ingredient_units_ingredient_idx
  on public.ingredient_units (ingredient_id, sort_order);

alter table public.ingredient_units enable row level security;

drop policy if exists "authenticated full access — ingredient_units" on public.ingredient_units;
create policy "authenticated full access — ingredient_units"
  on public.ingredient_units for all
  to authenticated using (true) with check (true);

-- Backfill base tier (label = base_unit, factor 1) for every ingredient ----------
insert into public.ingredient_units (ingredient_id, label, factor_to_base, is_base, sort_order)
select i.id, i.base_unit, 1, true, 0
from public.ingredients i
where not exists (
  select 1 from public.ingredient_units u where u.ingredient_id = i.id and u.is_base = true
);

-- Backfill a 'kemasan' tier (= package_size) where the package is bigger than base --
insert into public.ingredient_units (ingredient_id, label, factor_to_base, is_base, sort_order)
select i.id, 'kemasan', i.package_size, false, 1
from public.ingredients i
where i.package_size is not null and i.package_size <> 1
  and not exists (
    select 1 from public.ingredient_units u where u.ingredient_id = i.id and u.label = 'kemasan'
  );
