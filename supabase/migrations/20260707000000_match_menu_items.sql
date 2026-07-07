-- ============================================================================
-- Sprint 16 F4 — Kasir Pintar sales import : fuzzy menu matching (pg_trgm)
-- match_menu_items() ranks active menu items by trigram similarity to a KP
-- product name (+ exact case-insensitive hit first). Powers the sales-import
-- name→menu mapping (KP export has no shared code, so we match on name).
-- Mirrors match_ingredients() (Sprint 12). Additive only.
-- ============================================================================

create extension if not exists pg_trgm with schema public;

create index if not exists menu_items_name_trgm_idx
  on public.menu_items using gin (name gin_trgm_ops);

create or replace function public.match_menu_items(p_query text, p_limit int default 5)
returns table (
  id uuid,
  name text,
  similarity real
)
language sql
stable
as $$
  select m.id, m.name, similarity(m.name, p_query) as similarity
  from public.menu_items m
  where m.is_active = true
    and (m.name % p_query or lower(m.name) = lower(p_query))
  order by (lower(m.name) = lower(p_query)) desc, similarity desc, m.name
  limit p_limit;
$$;

grant execute on function public.match_menu_items(text, int) to authenticated, service_role;
