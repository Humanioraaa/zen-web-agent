-- ============================================================================
-- Sprint 16 F2 — Opname schema fixes + area scoping
-- (1) stock_count_items.counted — distinguishes "counted = 0" from "not counted"
--     (default-0 conflated them → wrong consumption + broken resume).
-- (2) stock_counts.category_id — area (Bahan Baku Kitchen / Bar); null = full-shop.
-- (3) create_stock_count(... p_category_id) — prefills only that area's active
--     ingredients; the opening/purchased baseline uses the last finalized session
--     OF THE SAME AREA. Additive.
-- ============================================================================

alter table public.stock_count_items add column if not exists counted boolean not null default false;

alter table public.stock_counts add column if not exists category_id uuid references public.categories(id);
create index if not exists stock_counts_category_idx on public.stock_counts (category_id, count_date desc);

-- Replace the 3-arg fn with an area-scoped 4-arg version.
drop function if exists public.create_stock_count(uuid, date, text);

create or replace function public.create_stock_count(
  p_created_by  uuid,
  p_count_date  date,
  p_note        text,
  p_category_id uuid default null
) returns uuid
language plpgsql
as $$
declare
  v_count_id uuid;
  v_prev_id  uuid;
  v_prev_at  timestamptz;
begin
  insert into public.stock_counts (count_date, status, note, created_by, category_id)
  values (p_count_date, 'draft', p_note, p_created_by, p_category_id)
  returning id into v_count_id;

  -- last finalized session of the SAME area (null area matches null area)
  select id, finalized_at
    into v_prev_id, v_prev_at
  from public.stock_counts
  where status = 'finalized'
    and id <> v_count_id
    and category_id is not distinct from p_category_id
  order by count_date desc, finalized_at desc nulls last
  limit 1;

  -- one line per active ingredient in this area (all active when p_category_id is null)
  insert into public.stock_count_items
    (stock_count_id, ingredient_id, counted_qty, opening_qty, purchased_qty, unit_cost_snapshot)
  select
    v_count_id, i.id, 0,
    case when v_prev_id is null then null
         else (select sci.counted_qty from public.stock_count_items sci
               where sci.stock_count_id = v_prev_id and sci.ingredient_id = i.id) end,
    case when v_prev_id is null then null
         else coalesce((
           select sum(r.packages * r.package_size_at_time)
           from public.restocks r
           where r.ingredient_id = i.id
             and (v_prev_at is null or r.created_at > v_prev_at)
         ), 0) end,
    coalesce(i.unit_cost, 0)
  from public.ingredients i
  where i.is_active = true
    and (p_category_id is null or i.category_id = p_category_id);

  return v_count_id;
end;
$$;

grant execute on function public.create_stock_count(uuid, date, text, uuid) to authenticated, service_role;
