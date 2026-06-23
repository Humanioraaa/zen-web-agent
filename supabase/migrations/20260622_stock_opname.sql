-- ============================================================================
-- Sprint 14 — Stock Opname (periodic physical inventory) : Phase 1 schema
-- Tables: stock_counts (session header) + stock_count_items (per-ingredient lines)
-- Function: create_stock_count() — atomically opens a draft session and prefills
--           one line per active ingredient with opening_qty (last finalized count),
--           purchased_qty (restocks since), and a unit_cost snapshot.
-- Periodic model: konsumsi = stok awal + pembelian − stok akhir (hitung fisik).
-- Additive only — no existing tables/columns changed.
-- ============================================================================

-- 1. stock_counts — one opname session --------------------------------------
create table if not exists public.stock_counts (
  id           uuid primary key default gen_random_uuid(),
  count_date   date    not null default current_date,
  status       text    not null check (status in ('draft', 'finalized')) default 'draft',
  note         text,
  total_value  numeric,                       -- snapshot of summed line value at finalize
  created_by   uuid references public.users(id),
  finalized_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists stock_counts_date_idx
  on public.stock_counts (count_date desc, created_at desc);

-- 2. stock_count_items — physical count per ingredient ----------------------
create table if not exists public.stock_count_items (
  id                 uuid primary key default gen_random_uuid(),
  stock_count_id     uuid    not null references public.stock_counts(id) on delete cascade,
  ingredient_id      uuid    not null references public.ingredients(id) on delete restrict,
  counted_qty        numeric not null default 0 check (counted_qty >= 0),  -- physical, base unit
  opening_qty        numeric,                  -- prev finalized count's counted_qty (null = first count)
  purchased_qty      numeric,                  -- restocks (base unit) since prev count (null = first count)
  unit_cost_snapshot numeric not null default 0,                            -- ingredient.unit_cost at open
  -- current on-hand value of the physical count
  line_value         numeric generated always as (counted_qty * unit_cost_snapshot) stored,
  note               text,
  created_at         timestamptz not null default now(),
  unique (stock_count_id, ingredient_id)
);

create index if not exists stock_count_items_count_idx
  on public.stock_count_items (stock_count_id);

-- 3. Row Level Security — mirror restocks/price-history (authenticated full) --
alter table public.stock_counts      enable row level security;
alter table public.stock_count_items enable row level security;

create policy "authenticated full access — stock_counts"
  on public.stock_counts for all
  to authenticated using (true) with check (true);

create policy "authenticated full access — stock_count_items"
  on public.stock_count_items for all
  to authenticated using (true) with check (true);

-- 4. create_stock_count() — open draft + prefill lines, atomically ----------
create or replace function public.create_stock_count(
  p_created_by uuid,
  p_count_date date,
  p_note       text
) returns uuid
language plpgsql
as $$
declare
  v_count_id   uuid;
  v_prev_id    uuid;
  v_prev_at    timestamptz;
begin
  -- open the session
  insert into public.stock_counts (count_date, status, note, created_by)
  values (p_count_date, 'draft', p_note, p_created_by)
  returning id into v_count_id;

  -- last finalized session (its counted_qty = this period's opening stock;
  -- its finalized_at = lower bound for "purchases since")
  select id, finalized_at
    into v_prev_id, v_prev_at
  from public.stock_counts
  where status = 'finalized' and id <> v_count_id
  order by count_date desc, finalized_at desc nulls last
  limit 1;

  -- one line per active ingredient
  insert into public.stock_count_items
    (stock_count_id, ingredient_id, counted_qty, opening_qty, purchased_qty, unit_cost_snapshot)
  select
    v_count_id,
    i.id,
    0,
    -- opening = prev count's physical qty for this ingredient (null if no prev session)
    case when v_prev_id is null then null
         else (select sci.counted_qty from public.stock_count_items sci
               where sci.stock_count_id = v_prev_id and sci.ingredient_id = i.id) end,
    -- purchased = base-unit restocks since the previous count (null if no prev session)
    case when v_prev_id is null then null
         else coalesce((
           select sum(r.packages * r.package_size_at_time)
           from public.restocks r
           where r.ingredient_id = i.id
             and (v_prev_at is null or r.created_at > v_prev_at)
         ), 0) end,
    coalesce(i.unit_cost, 0)
  from public.ingredients i
  where i.is_active = true;

  return v_count_id;
end;
$$;

grant execute on function public.create_stock_count(uuid, date, text) to authenticated, service_role;
