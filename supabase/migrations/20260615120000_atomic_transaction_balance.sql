-- F1 P2: make wallet-balance arithmetic atomic + transactionally correct.
-- Replaces the non-atomic read-then-write in adjustWalletBalance and the multi-step
-- reverse/reapply in editTransaction/removeTransaction (race + crash-window corruption +
-- transfer-hole where a nulled wallet_to_id made money vanish).
-- SECURITY INVOKER so RLS still applies (web = authenticated; bot = service_role).

-- Atomic single-statement balance change (no read-then-write race).
create or replace function public.increment_wallet_balance(p_wallet_id uuid, p_delta numeric)
returns public.wallets
language plpgsql
security invoker
as $$
declare
  v_wallet public.wallets;
begin
  update public.wallets
    set balance = balance + p_delta
    where id = p_wallet_id
    returning * into v_wallet;
  if not found then
    raise exception 'Wallet not found' using errcode = 'P0002';
  end if;
  return v_wallet;
end;
$$;

-- Edit a transaction: reverse the old balance effect, apply the new one, and update the
-- row — all in one transaction. Reversal is recomputed from the DB row, never the client.
-- `type` is immutable here (not read from the patch). A transfer must keep its destination.
create or replace function public.edit_transaction(p_id uuid, p_patch jsonb)
returns public.transactions
language plpgsql
security invoker
as $$
declare
  v_before public.transactions;
  v_after public.transactions;
  v_amount numeric;
  v_wallet_id uuid;
  v_wallet_to_id uuid;
  v_category_id uuid;
  v_note text;
  v_date date;
begin
  select * into v_before from public.transactions where id = p_id;
  if not found then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  -- reverse old effect
  if v_before.type = 'expense' then
    update public.wallets set balance = balance + v_before.amount where id = v_before.wallet_id;
  elsif v_before.type = 'income' then
    update public.wallets set balance = balance - v_before.amount where id = v_before.wallet_id;
  elsif v_before.type = 'transfer' then
    update public.wallets set balance = balance + v_before.amount where id = v_before.wallet_id;
    if v_before.wallet_to_id is not null then
      update public.wallets set balance = balance - v_before.amount where id = v_before.wallet_to_id;
    end if;
  end if;

  -- merge patch over existing values (presence-aware for nullable fields)
  v_amount := coalesce((p_patch->>'amount')::numeric, v_before.amount);
  v_wallet_id := coalesce((p_patch->>'wallet_id')::uuid, v_before.wallet_id);
  if p_patch ? 'wallet_to_id' then v_wallet_to_id := (p_patch->>'wallet_to_id')::uuid; else v_wallet_to_id := v_before.wallet_to_id; end if;
  if p_patch ? 'category_id' then v_category_id := (p_patch->>'category_id')::uuid; else v_category_id := v_before.category_id; end if;
  if p_patch ? 'note' then v_note := p_patch->>'note'; else v_note := v_before.note; end if;
  v_date := coalesce((p_patch->>'date')::date, v_before.date);

  if v_amount is null or v_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  if v_before.type = 'transfer' and v_wallet_to_id is null then
    raise exception 'Transfer requires a destination wallet';
  end if;

  update public.transactions
    set amount = v_amount,
        wallet_id = v_wallet_id,
        wallet_to_id = v_wallet_to_id,
        category_id = v_category_id,
        note = v_note,
        date = v_date
    where id = p_id
    returning * into v_after;

  -- apply new effect
  if v_after.type = 'expense' then
    update public.wallets set balance = balance - v_after.amount where id = v_after.wallet_id;
  elsif v_after.type = 'income' then
    update public.wallets set balance = balance + v_after.amount where id = v_after.wallet_id;
  elsif v_after.type = 'transfer' then
    update public.wallets set balance = balance - v_after.amount where id = v_after.wallet_id;
    update public.wallets set balance = balance + v_after.amount where id = v_after.wallet_to_id;
  end if;

  return v_after;
end;
$$;

-- Delete a transaction: reverse its balance effect and remove the row in one transaction.
create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_tx public.transactions;
begin
  select * into v_tx from public.transactions where id = p_id;
  if not found then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  if v_tx.type = 'expense' then
    update public.wallets set balance = balance + v_tx.amount where id = v_tx.wallet_id;
  elsif v_tx.type = 'income' then
    update public.wallets set balance = balance - v_tx.amount where id = v_tx.wallet_id;
  elsif v_tx.type = 'transfer' then
    update public.wallets set balance = balance + v_tx.amount where id = v_tx.wallet_id;
    if v_tx.wallet_to_id is not null then
      update public.wallets set balance = balance - v_tx.amount where id = v_tx.wallet_to_id;
    end if;
  end if;

  delete from public.transactions where id = p_id;
end;
$$;

grant execute on function public.increment_wallet_balance(uuid, numeric) to authenticated, service_role;
grant execute on function public.edit_transaction(uuid, jsonb) to authenticated, service_role;
grant execute on function public.delete_transaction(uuid) to authenticated, service_role;
