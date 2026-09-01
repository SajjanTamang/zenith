-- =========================================================
-- Zenith Finance
-- Safe manual transaction editing
-- =========================================================
--
-- Allows authenticated users to update/delete their own:
--
--   income
--   expense
--   normal manual transfers
--
-- Protects automatic Game Bankroll transactions:
--
--   Game Bankroll Funding
--   Game Bankroll Settlement
--
-- Transaction type itself cannot be changed.
-- =========================================================


-- ---------------------------------------------------------
-- UPDATE MANUAL TRANSACTION
-- ---------------------------------------------------------

create or replace function public.update_manual_transaction(
  p_transaction_id uuid,
  p_amount numeric,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_category text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_transaction public.transactions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception 'Amount must be greater than 0.';
  end if;


  /*
    Lock the transaction while editing.
  */
  select *
  into v_transaction
  from public.transactions
  where
    id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;


  /*
    Automatic Game Bankroll transactions
    are controlled by Game Sessions.
  */
  if
    v_transaction.transaction_type = 'transfer'
    and v_transaction.category in (
      'Game Bankroll Funding',
      'Game Bankroll Settlement'
    )
  then
    raise exception
      'Automatic Game Bankroll transactions cannot be edited independently.';
  end if;


  /*
    Income
  */
  if
    v_transaction.transaction_type = 'income'
  then
    if p_to_account_id is null then
      raise exception 'Income requires a destination account.';
    end if;

    perform 1
    from public.accounts
    where
      id = p_to_account_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Destination account not found.';
    end if;

    update public.transactions
    set
      amount = p_amount,
      from_account_id = null,
      to_account_id = p_to_account_id,
      category =
        nullif(
          trim(
            coalesce(
              p_category,
              ''
            )
          ),
          ''
        ),
      note =
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        )
    where id = p_transaction_id;

    return;
  end if;


  /*
    Expense
  */
  if
    v_transaction.transaction_type = 'expense'
  then
    if p_from_account_id is null then
      raise exception 'Expense requires a source account.';
    end if;

    perform 1
    from public.accounts
    where
      id = p_from_account_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Source account not found.';
    end if;

    update public.transactions
    set
      amount = p_amount,
      from_account_id = p_from_account_id,
      to_account_id = null,
      category =
        nullif(
          trim(
            coalesce(
              p_category,
              ''
            )
          ),
          ''
        ),
      note =
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        )
    where id = p_transaction_id;

    return;
  end if;


  /*
    Manual transfer
  */
  if
    v_transaction.transaction_type = 'transfer'
  then
    if
      p_from_account_id is null
      or p_to_account_id is null
    then
      raise exception 'Transfer requires both accounts.';
    end if;

    if
      p_from_account_id =
      p_to_account_id
    then
      raise exception 'From account and to account must be different.';
    end if;

    perform 1
    from public.accounts
    where
      id = p_from_account_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Source account not found.';
    end if;

    perform 1
    from public.accounts
    where
      id = p_to_account_id
      and user_id = v_user_id;

    if not found then
      raise exception 'Destination account not found.';
    end if;

    update public.transactions
    set
      amount = p_amount,
      from_account_id = p_from_account_id,
      to_account_id = p_to_account_id,
      category = null,
      note =
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        )
    where id = p_transaction_id;

    return;
  end if;


  raise exception 'Unsupported transaction type.';
end;
$$;


-- ---------------------------------------------------------
-- DELETE MANUAL TRANSACTION
-- ---------------------------------------------------------

create or replace function public.delete_manual_transaction(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_transaction public.transactions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_transaction
  from public.transactions
  where
    id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if
    v_transaction.transaction_type = 'transfer'
    and v_transaction.category in (
      'Game Bankroll Funding',
      'Game Bankroll Settlement'
    )
  then
    raise exception
      'Automatic Game Bankroll transactions cannot be deleted independently.';
  end if;

  delete from public.transactions
  where
    id = p_transaction_id
    and user_id = v_user_id;
end;
$$;


-- ---------------------------------------------------------
-- PERMISSIONS
-- ---------------------------------------------------------

revoke all
on function public.update_manual_transaction(
  uuid,
  numeric,
  uuid,
  uuid,
  text,
  text
)
from public;

revoke all
on function public.delete_manual_transaction(
  uuid
)
from public;


grant execute
on function public.update_manual_transaction(
  uuid,
  numeric,
  uuid,
  uuid,
  text,
  text
)
to authenticated;

grant execute
on function public.delete_manual_transaction(
  uuid
)
to authenticated;