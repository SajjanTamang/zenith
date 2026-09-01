-- =========================================================
-- Zenith Finance
-- Protect archived accounts
-- =========================================================
--
-- Rules:
--
-- 1. An account may only be archived when its
--    calculated balance is exactly NPR 0.00.
--
-- 2. An account cannot be archived while an active
--    Game Session uses it as either:
--      - bankroll account
--      - funding account
--
-- 3. Archived accounts cannot be used for NEW:
--      - income
--      - expenses
--      - transfers
--      - loans
--      - repayments
--      - game sessions
--
-- 4. Historical records remain untouched.
--
-- 5. Notes/categories on historical transactions may
--    still be changed, but monetary fields cannot be
--    changed while they involve an archived account.
-- =========================================================


-- =========================================================
-- HELPER
-- =========================================================

create or replace function public.zenith_account_is_archived(
  p_user_id uuid,
  p_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where
      id = p_account_id
      and user_id = p_user_id
      and archived_at is not null
  );
$$;


create or replace function public.zenith_require_active_account(
  p_user_id uuid,
  p_account_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_archived_at timestamptz;
begin
  if p_account_id is null then
    return;
  end if;

  select archived_at
  into v_archived_at
  from public.accounts
  where
    id = p_account_id
    and user_id = p_user_id;

  if not found then
    raise exception
      'Account not found.';
  end if;

  if v_archived_at is not null then
    raise exception
      'Archived accounts cannot be used for new money movement.';
  end if;
end;
$$;


-- =========================================================
-- STRONGER ARCHIVE FUNCTION
-- =========================================================

create or replace function public.archive_account(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_account public.accounts%rowtype;

  v_transaction_balance numeric(18,2) := 0;
  v_game_balance numeric(18,2) := 0;
  v_lending_balance numeric(18,2) := 0;
  v_repayment_balance numeric(18,2) := 0;

  v_current_balance numeric(18,2) := 0;

  v_has_active_session boolean := false;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  select *
  into v_account
  from public.accounts
  where
    id = p_account_id
    and user_id = v_user_id
  for update;


  if not found then
    raise exception
      'Account not found.';
  end if;


  if v_account.archived_at is not null then
    return;
  end if;


  -- -------------------------------------------------------
  -- TRANSACTIONS
  -- -------------------------------------------------------

  select
    coalesce(
      sum(
        case
          when
            transaction_type = 'income'
            and to_account_id = p_account_id
          then amount

          when
            transaction_type = 'expense'
            and from_account_id = p_account_id
          then -amount

          when
            transaction_type = 'transfer'
            and from_account_id = p_account_id
          then -amount

          when
            transaction_type = 'transfer'
            and to_account_id = p_account_id
          then amount

          else 0
        end
      ),
      0
    )
  into v_transaction_balance
  from public.transactions
  where
    user_id = v_user_id
    and (
      from_account_id = p_account_id
      or to_account_id = p_account_id
    );


  -- -------------------------------------------------------
  -- COMPLETED GAME P&L
  -- -------------------------------------------------------

  select
    coalesce(
      sum(
        case
          when result_type = 'win'
          then coalesce(
            result_amount,
            0
          )

          when result_type = 'loss'
          then -coalesce(
            result_amount,
            0
          )

          else 0
        end
      ),
      0
    )
  into v_game_balance
  from public.game_sessions
  where
    user_id = v_user_id
    and bankroll_account_id = p_account_id
    and status = 'completed';


  -- -------------------------------------------------------
  -- MONEY LENT
  -- -------------------------------------------------------

  select
    coalesce(
      sum(
        -principal_amount
      ),
      0
    )
  into v_lending_balance
  from public.loans
  where
    user_id = v_user_id
    and source_account_id = p_account_id;


  -- -------------------------------------------------------
  -- REPAYMENTS
  -- -------------------------------------------------------

  select
    coalesce(
      sum(
        amount
      ),
      0
    )
  into v_repayment_balance
  from public.loan_repayments
  where
    user_id = v_user_id
    and to_account_id = p_account_id;


  -- -------------------------------------------------------
  -- FINAL ACCOUNT BALANCE
  -- -------------------------------------------------------

  v_current_balance :=
    v_account.opening_balance
    + v_transaction_balance
    + v_game_balance
    + v_lending_balance
    + v_repayment_balance;


  if v_current_balance <> 0 then
    raise exception
      'Account balance must be NPR 0.00 before archiving. Current balance: NPR %.',
      v_current_balance;
  end if;


  -- -------------------------------------------------------
  -- ACTIVE GAME SESSION
  --
  -- We protect BOTH:
  --   bankroll account
  --   original funding account
  --
  -- Otherwise a session could finish later and attempt
  -- to return money into an archived funding account.
  -- -------------------------------------------------------

  select exists (
    select 1
    from public.game_sessions
    where
      user_id = v_user_id
      and status = 'active'
      and (
        bankroll_account_id =
          p_account_id
        or funding_account_id =
          p_account_id
      )
  )
  into v_has_active_session;


  if v_has_active_session then
    raise exception
      'Finish the active Game Session before archiving this account.';
  end if;


  update public.accounts
  set
    archived_at = now()
  where
    id = p_account_id
    and user_id = v_user_id;
end;
$$;


-- =========================================================
-- RESTORE
-- =========================================================

create or replace function public.restore_account(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  update public.accounts
  set
    archived_at = null
  where
    id = p_account_id
    and user_id = v_user_id;


  if not found then
    raise exception
      'Account not found.';
  end if;
end;
$$;


-- =========================================================
-- TRANSACTION PROTECTION
-- =========================================================

create or replace function public.protect_archived_transaction_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- -------------------------------------------------------
  -- NEW TRANSACTION
  -- -------------------------------------------------------

  if TG_OP = 'INSERT' then
    perform public.zenith_require_active_account(
      new.user_id,
      new.from_account_id
    );

    perform public.zenith_require_active_account(
      new.user_id,
      new.to_account_id
    );

    return new;
  end if;


  -- -------------------------------------------------------
  -- EXISTING HISTORICAL TRANSACTION
  --
  -- If it currently touches an archived account, monetary
  -- fields cannot be changed.
  --
  -- Category/note corrections remain allowed.
  -- -------------------------------------------------------

  if
    (
      old.from_account_id is not null
      and public.zenith_account_is_archived(
        old.user_id,
        old.from_account_id
      )
    )
    or
    (
      old.to_account_id is not null
      and public.zenith_account_is_archived(
        old.user_id,
        old.to_account_id
      )
    )
  then
    if
      old.amount
        is distinct from
        new.amount
      or old.transaction_type
        is distinct from
        new.transaction_type
      or old.from_account_id
        is distinct from
        new.from_account_id
      or old.to_account_id
        is distinct from
        new.to_account_id
    then
      raise exception
        'Money movement cannot be changed while this transaction uses an archived account.';
    end if;
  end if;


  -- -------------------------------------------------------
  -- MOVING A TRANSACTION TO A DIFFERENT ACCOUNT
  -- -------------------------------------------------------

  if
    new.from_account_id
      is distinct from
      old.from_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.from_account_id
    );
  end if;


  if
    new.to_account_id
      is distinct from
      old.to_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.to_account_id
    );
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_archived_transaction_accounts_trigger
on public.transactions;


create trigger
  protect_archived_transaction_accounts_trigger
before insert or update
on public.transactions
for each row
execute function
  public.protect_archived_transaction_accounts();


-- =========================================================
-- LOAN PROTECTION
-- =========================================================

create or replace function public.protect_archived_loan_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.zenith_require_active_account(
      new.user_id,
      new.source_account_id
    );

    return new;
  end if;


  if
    public.zenith_account_is_archived(
      old.user_id,
      old.source_account_id
    )
    and (
      old.source_account_id
        is distinct from
        new.source_account_id
      or old.principal_amount
        is distinct from
        new.principal_amount
    )
  then
    raise exception
      'Money lent from an archived account cannot be changed.';
  end if;


  if
    new.source_account_id
      is distinct from
      old.source_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.source_account_id
    );
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_archived_loan_account_trigger
on public.loans;


create trigger
  protect_archived_loan_account_trigger
before insert or update
on public.loans
for each row
execute function
  public.protect_archived_loan_account();


-- =========================================================
-- REPAYMENT PROTECTION
-- =========================================================

create or replace function public.protect_archived_repayment_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.zenith_require_active_account(
      new.user_id,
      new.to_account_id
    );

    return new;
  end if;


  if
    public.zenith_account_is_archived(
      old.user_id,
      old.to_account_id
    )
    and (
      old.to_account_id
        is distinct from
        new.to_account_id
      or old.amount
        is distinct from
        new.amount
    )
  then
    raise exception
      'A repayment into an archived account cannot be changed.';
  end if;


  if
    new.to_account_id
      is distinct from
      old.to_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.to_account_id
    );
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_archived_repayment_account_trigger
on public.loan_repayments;


create trigger
  protect_archived_repayment_account_trigger
before insert or update
on public.loan_repayments
for each row
execute function
  public.protect_archived_repayment_account();


-- =========================================================
-- GAME SESSION PROTECTION
-- =========================================================

create or replace function public.protect_archived_game_session_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.zenith_require_active_account(
      new.user_id,
      new.bankroll_account_id
    );

    perform public.zenith_require_active_account(
      new.user_id,
      new.funding_account_id
    );

    return new;
  end if;


  /*
    Changing an account attached to an existing session
    must always point to an active account.
  */
  if
    new.bankroll_account_id
      is distinct from
      old.bankroll_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.bankroll_account_id
    );
  end if;


  if
    new.funding_account_id
      is distinct from
      old.funding_account_id
  then
    perform public.zenith_require_active_account(
      new.user_id,
      new.funding_account_id
    );
  end if;


  /*
    An old completed Game Session using an archived
    bankroll cannot have its P&L changed.
  */
  if
    public.zenith_account_is_archived(
      old.user_id,
      old.bankroll_account_id
    )
    and (
      old.status
        is distinct from
        new.status
      or old.result_type
        is distinct from
        new.result_type
      or old.result_amount
        is distinct from
        new.result_amount
      or old.bankroll_account_id
        is distinct from
        new.bankroll_account_id
    )
  then
    raise exception
      'A completed Game Session using an archived bankroll cannot have its money result changed.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_archived_game_session_accounts_trigger
on public.game_sessions;


create trigger
  protect_archived_game_session_accounts_trigger
before insert or update
on public.game_sessions
for each row
execute function
  public.protect_archived_game_session_accounts();


-- =========================================================
-- PERMISSIONS
-- =========================================================

revoke all
on function public.zenith_account_is_archived(
  uuid,
  uuid
)
from public;

revoke all
on function public.zenith_require_active_account(
  uuid,
  uuid
)
from public;

revoke all
on function public.archive_account(
  uuid
)
from public;

revoke all
on function public.restore_account(
  uuid
)
from public;


grant execute
on function public.archive_account(
  uuid
)
to authenticated;

grant execute
on function public.restore_account(
  uuid
)
to authenticated;


-- Reload PostgREST so archive/restore RPCs are available.
notify pgrst, 'reload schema';