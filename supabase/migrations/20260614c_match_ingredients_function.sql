-- ============================================================================
-- Sprint 12 — Phase 3 : fuzzy ingredient matching (pg_trgm)
-- Returns active ingredients ranked by trigram similarity to the query, plus
-- any exact (case-insensitive) name match. Used by the bot to resolve typos.
-- ============================================================================

create or replace function public.match_ingredients(p_query text, p_limit int default 5)
returns table (
  id uuid,
  name text,
  base_unit text,
  package_size numeric,
  package_cost numeric,
  price_alert_threshold_pct numeric,
  similarity real
)
language sql
stable
as $$
  select i.id, i.name, i.base_unit, i.package_size, i.package_cost, i.price_alert_threshold_pct,
         similarity(i.name, p_query) as similarity
  from public.ingredients i
  where i.is_active = true
    and (i.name % p_query or lower(i.name) = lower(p_query))
  order by (lower(i.name) = lower(p_query)) desc, similarity desc, i.name
  limit p_limit;
$$;

grant execute on function public.match_ingredients(text, int) to authenticated, service_role;
