-- ============================================================================
-- Sprint 12 — Phase 2 : atomic restock commit
-- One transaction; if any step fails the whole thing ROLLs BACK.
-- Effects: expense transaction + wallet balance + restock row + price history
--          + (conditional) ingredient current-price update.
-- The service computes all derived values (packages, package_cost, pct_change,
-- apply_price); this function only persists them atomically.
-- ============================================================================

create or replace function public.create_restock(
  p_ingredient_id        uuid,
  p_qty_value            numeric,
  p_qty_unit             text,
  p_packages             numeric,
  p_total_cost           numeric,
  p_package_cost         numeric,
  p_package_size_at_time numeric,
  p_pct_change           numeric,
  p_apply_price          boolean,
  p_wallet_id            uuid,
  p_category_id          uuid,
  p_created_by           uuid,
  p_source               text,
  p_date                 date,
  p_note                 text
) returns jsonb
language plpgsql
as $$
declare
  v_tx_id      uuid;
  v_restock_id uuid;
  v_unit_cost  numeric;
begin
  v_unit_cost := p_package_cost / nullif(p_package_size_at_time, 0);

  -- 1. expense transaction (money out)
  insert into public.transactions (type, amount, wallet_id, category_id, note, date, source, created_by)
  values ('expense'::public.transaction_type, p_total_cost, p_wallet_id, p_category_id, p_note, p_date,
          p_source::public.transaction_source, p_created_by)
  returning id into v_tx_id;

  -- 2. wallet balance
  update public.wallets set balance = balance - p_total_cost where id = p_wallet_id;

  -- 3. restock event
  insert into public.restocks
    (ingredient_id, qty_value, qty_unit, packages, total_cost, package_cost,
     package_size_at_time, expense_transaction_id, note, created_by)
  values
    (p_ingredient_id, p_qty_value, p_qty_unit, p_packages, p_total_cost, p_package_cost,
     p_package_size_at_time, v_tx_id, p_note, p_created_by)
  returning id into v_restock_id;

  -- 4. price history (always records the observed price)
  insert into public.ingredient_price_history
    (ingredient_id, package_cost, package_size, unit_cost, source, restock_id, pct_change)
  values
    (p_ingredient_id, p_package_cost, p_package_size_at_time, v_unit_cost, 'restock', v_restock_id, p_pct_change);

  -- 5. update current price only when accepted (unit_cost generated column recomputes)
  if p_apply_price then
    update public.ingredients
      set package_cost = p_package_cost, updated_at = now()
      where id = p_ingredient_id;
  end if;

  return jsonb_build_object(
    'restock_id', v_restock_id,
    'transaction_id', v_tx_id,
    'applied', p_apply_price,
    'package_cost', p_package_cost,
    'unit_cost', v_unit_cost
  );
end;
$$;

grant execute on function public.create_restock(
  uuid, numeric, text, numeric, numeric, numeric, numeric, numeric, boolean, uuid, uuid, uuid, text, date, text
) to authenticated, service_role;
