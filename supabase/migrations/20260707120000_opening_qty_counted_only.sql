-- ============================================================================
-- Sprint 16 F4 fix — create_stock_count opening_qty must respect the `counted` flag.
-- Previously the opening baseline (prev period on-hand) copied the prior finalized
-- session's counted_qty for EVERY ingredient — including ones that were SKIPPED
-- (counted=false, counted_qty defaults to 0) — seeding opening_qty=0 instead of null.
-- That silently understated opening stock and inflated consumed/variance for any item
-- skipped one period then recounted the next. Fix: the opening subquery now reads only
-- COUNTED prior lines; a skipped item yields no row → opening_qty=null (unknown), which
-- the consumption/variance math already excludes. Function replace only; additive.
-- ============================================================================

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

  insert into public.stock_count_items
    (stock_count_id, ingredient_id, counted_qty, opening_qty, purchased_qty, unit_cost_snapshot)
  select
    v_count_id, i.id, 0,
    -- opening = prev period's physical qty, ONLY if that line was actually counted
    -- (a skipped prior line → null, not a bogus 0).
    case when v_prev_id is null then null
         else (select sci.counted_qty from public.stock_count_items sci
               where sci.stock_count_id = v_prev_id and sci.ingredient_id = i.id
                 and sci.counted) end,
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
