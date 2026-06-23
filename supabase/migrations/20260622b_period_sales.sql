-- ============================================================================
-- Sprint 14 — Stock Opname : Phase 3 (theoretical usage / variance)
-- Table: period_sales — units sold per menu during a stock-count period.
-- Theoretical ingredient usage = Σ (qty_sold × recipe_items.quantity).
-- Variance = konsumsi nyata (Fase 2) − pemakaian teoretis = waste + susut.
-- The period a sale belongs to is the count that CLOSES it (stock_count_id).
-- Additive only.
-- ============================================================================

create table if not exists public.period_sales (
  id             uuid primary key default gen_random_uuid(),
  stock_count_id uuid    not null references public.stock_counts(id) on delete cascade,
  menu_id        uuid    not null references public.menu_items(id) on delete restrict,
  qty_sold       numeric not null default 0 check (qty_sold >= 0),
  created_at     timestamptz not null default now(),
  unique (stock_count_id, menu_id)
);

create index if not exists period_sales_count_idx
  on public.period_sales (stock_count_id);

alter table public.period_sales enable row level security;

create policy "authenticated full access — period_sales"
  on public.period_sales for all
  to authenticated using (true) with check (true);
