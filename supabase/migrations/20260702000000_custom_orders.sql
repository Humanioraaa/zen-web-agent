-- ============================================================================
-- Sprint 15 — Custom Orders (job costing for recurring custom/catering orders)
-- custom_orders (job header) + transactions.custom_order_id tag (nullable).
-- Per-order P&L is DERIVED at read time (paid = tagged income, cost = tagged
-- expense) — no stored totals, no menu/recipe/ingredient/stock coupling.
-- Item name is FREE TEXT (random menu). Additive only — backward compatible.
-- ============================================================================

-- 1. custom_orders — one job header -----------------------------------------
create table if not exists public.custom_orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text    not null,
  item_name     text    not null,                          -- free text (random menu)
  qty           numeric not null check (qty > 0),
  unit_price    numeric check (unit_price is null or unit_price >= 0),
  quoted_price  numeric not null check (quoted_price >= 0),  -- total agreed price
  order_date    date    not null default current_date,
  due_date      date,
  status        text    not null default 'quote'
                  check (status in ('quote', 'confirmed', 'in_progress', 'done', 'cancelled')),
  notes         text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists custom_orders_status_idx  on public.custom_orders (status, due_date);
create index if not exists custom_orders_created_idx on public.custom_orders (created_at desc);

-- 2. transactions tag (additive, nullable, SET NULL on order delete) --------
alter table public.transactions
  add column if not exists custom_order_id uuid references public.custom_orders(id) on delete set null;

create index if not exists transactions_custom_order_idx
  on public.transactions (custom_order_id);

-- 3. RLS — authenticated full access (service role bypasses RLS for bot) -----
alter table public.custom_orders enable row level security;

drop policy if exists "authenticated full access — custom_orders" on public.custom_orders;
create policy "authenticated full access — custom_orders"
  on public.custom_orders for all
  to authenticated using (true) with check (true);
