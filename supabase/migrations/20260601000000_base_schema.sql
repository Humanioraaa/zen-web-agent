-- ============================================================================
-- Base schema (Sprint 11 and earlier) — created retroactively for staging seed.
-- All CREATE TABLE / CREATE TYPE use IF NOT EXISTS / DO $$ so this is idempotent
-- against a fresh DB and harmless if any pieces already exist.
-- ============================================================================

-- Enums -------------------------------------------------------------------
do $$ begin
  create type public.category_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_source as enum ('web', 'telegram');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_action as enum ('create', 'update', 'delete');
exception when duplicate_object then null; end $$;

-- users (mirrors auth.users, owned by app) ---------------------------------
create table if not exists public.users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  name                  text not null,
  onboarding_completed  boolean not null default false,
  telegram_user_id      text unique,
  created_at            timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: own row"
  on public.users for all
  to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- wallets ------------------------------------------------------------------
create table if not exists public.wallets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  balance    numeric not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

create policy "wallets: authenticated full access"
  on public.wallets for all
  to authenticated using (true) with check (true);

-- categories ---------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       public.category_type not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories: authenticated full access"
  on public.categories for all
  to authenticated using (true) with check (true);

-- transactions -------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  type        public.transaction_type not null,
  amount      numeric not null check (amount > 0),
  wallet_id   uuid not null references public.wallets(id) on delete restrict,
  wallet_to_id uuid references public.wallets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  note        text,
  date        date not null default current_date,
  source      public.transaction_source not null default 'web',
  created_by  uuid not null references public.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index if not exists transactions_wallet_date_idx on public.transactions (wallet_id, date desc);
create index if not exists transactions_created_by_idx  on public.transactions (created_by);

alter table public.transactions enable row level security;

create policy "transactions: authenticated full access"
  on public.transactions for all
  to authenticated using (true) with check (true);

-- ingredients --------------------------------------------------------------
create table if not exists public.ingredients (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  base_unit                 text not null,
  package_size              numeric not null check (package_size > 0),
  package_cost              numeric not null check (package_cost >= 0),
  unit_cost                 numeric generated always as (package_cost / package_size) stored,
  is_active                 boolean not null default true,
  category_id               uuid references public.categories(id) on delete set null,
  price_alert_threshold_pct numeric check (
    price_alert_threshold_pct is null
    or (price_alert_threshold_pct > 0 and price_alert_threshold_pct <= 100)
  ),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients: authenticated full access"
  on public.ingredients for all
  to authenticated using (true) with check (true);

-- menu_categories ----------------------------------------------------------
create table if not exists public.menu_categories (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  sort_order        integer not null default 0,
  safe_threshold    numeric not null default 58,
  warning_threshold numeric not null default 50,
  created_at        timestamptz not null default now()
);

alter table public.menu_categories enable row level security;

create policy "menu_categories: authenticated full access"
  on public.menu_categories for all
  to authenticated using (true) with check (true);

-- menu_items ---------------------------------------------------------------
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category_id   uuid not null references public.menu_categories(id) on delete restrict,
  selling_price numeric not null check (selling_price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.menu_items enable row level security;

create policy "menu_items: authenticated full access"
  on public.menu_items for all
  to authenticated using (true) with check (true);

-- recipe_items -------------------------------------------------------------
create table if not exists public.recipe_items (
  id            uuid primary key default gen_random_uuid(),
  menu_id       uuid not null references public.menu_items(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity      numeric not null check (quantity > 0),
  unique (menu_id, ingredient_id)
);

alter table public.recipe_items enable row level security;

create policy "recipe_items: authenticated full access"
  on public.recipe_items for all
  to authenticated using (true) with check (true);

-- item_category_memory -----------------------------------------------------
create table if not exists public.item_category_memory (
  id              uuid primary key default gen_random_uuid(),
  keyword         text not null,
  category_id     uuid not null references public.categories(id) on delete cascade,
  wallet_id       uuid references public.wallets(id) on delete set null,
  confirmed_count integer not null default 1,
  created_at      timestamptz not null default now(),
  unique (keyword, category_id)
);

alter table public.item_category_memory enable row level security;

create policy "item_category_memory: authenticated full access"
  on public.item_category_memory for all
  to authenticated using (true) with check (true);

-- audit_log ----------------------------------------------------------------
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    text not null,
  action       public.audit_action not null,
  before       jsonb,
  after        jsonb,
  performed_by uuid not null references public.users(id) on delete restrict,
  created_at   timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log: authenticated full access"
  on public.audit_log for all
  to authenticated using (true) with check (true);

-- bot_sessions -------------------------------------------------------------
create table if not exists public.bot_sessions (
  telegram_user_id text primary key,
  state            text not null default 'IDLE',
  context          jsonb,
  updated_at       timestamptz not null default now()
);

alter table public.bot_sessions enable row level security;

create policy "bot_sessions: service role only"
  on public.bot_sessions for all
  to service_role using (true) with check (true);

-- Seed: default expense + income categories --------------------------------
insert into public.categories (name, type, is_default)
values
  ('Bahan Baku Bar',    'expense', true),
  ('Bahan Baku Kitchen','expense', false),
  ('Operasional',       'expense', false),
  ('Lain-lain',         'expense', false),
  ('Penjualan',         'income',  true),
  ('Modal',             'income',  false)
on conflict do nothing;

-- Seed: wallets ------------------------------------------------------------
insert into public.wallets (name, balance)
values
  ('Kas', 0),
  ('BCA', 0),
  ('GoPay', 0)
on conflict do nothing;
