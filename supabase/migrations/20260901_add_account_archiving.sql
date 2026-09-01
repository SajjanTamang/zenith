-- =========================================================
-- Zenith Finance
-- Account archiving
-- =========================================================
--
-- Archived accounts:
--   - remain available for historical calculations
--   - cannot be used for new financial activity
--   - can be restored
--
-- An account can only be archived when:
--   - its calculated current balance is exactly 0
--   - it is not involved in an active game session
-- =========================================================


-- ---------------------------------------------------------
-- ARCHIVE COLUMN
-- ---------------------------------------------------------

alter table public.accounts
add column if not exists archived_at timestamptz;


create index if not exists
  accounts_user_active_idx
on public.accounts(user_id)
where archived_at is null;


-- ---------------------------------------------------------
-- ACCOUNT EDITING
-- ---------------------------------------------------------
--
-- Replace the account-edit RPC so archived accounts
-- cannot be modified until they are restored.
-- ---------------------------------------------------------

create or replace function public.update_manual_account(
  p_account_id uuid,
  p_name text,
  p_opening_balance numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_account public.accounts%rowtype;

  v_clean_name text :=
    trim(
      coalesce(
        p_name,
        ''
      )
    );
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;

  if v_clean_name = '' then
    raise exception
      'Account name is required.';
  end if;

  if p_opening_balance is null then
    raise exception
      'Opening balance is required.';
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


  if
    v_account.archived_at
      is not null
  then
    raise exception
      'Restore this account before editing it.';
  end if;


  if
    v_account.account_type =
      'game_bankroll'
    and p_opening_balance
      is distinct from
      v_account.opening_balance
  then
    raise exception
      'Game Bankroll opening balance cannot be edited.';
  end if;


  update public.accounts
  set
    name =
      v_clean_name,

    opening_balance =
      case
        when v_account.account_type =
          'game_bankroll'
        then
          v_account.opening_balance
        else
          p_opening_balance
      end
  where
    id = p_account_id
    and user_id = v_user_id;
end;
$$;


-- ---------------------------------------------------------
-- ARCHIVE ACCOUNT
-- ---------------------------------------------------------

create or replace function public.archive_account(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_account
    public.accounts%rowtype;

  v_balance numeric(18,2) :=
    0;

  v_active_session_exists boolean :=
    false;
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


  if
    v_account.archived_at
      is not null
  then
    raise exception
      'Account is already archived.';
  end if;


  -- -------------------------------------------------------
  -- Calculate the same balance used by Zenith:
  --
  -- opening
  -- + income
  -- - expenses
  -- +/- transfers
  -- +/- game result
  -- - money lent
  -- + repayments
  -- -------------------------------------------------------

  v_balance :=
    v_account.opening_balance;


  select
    v_balance +
    coalesce(
      sum(
        case
          when
            transaction_type =
              'income'
            and to_account_id =
              p_account_id
          then
            amount

          when
            transaction_type =
              'expense'
            and from_account_id =
              p_account_id
          then
            -amount

          when
            transaction_type =
              'transfer'
            and to_account_id =
              p_account_id
          then
            amount

          when
            transaction_type =
              'transfer'
            and from_account_id =
              p_account_id
          then
            -amount

          else
            0
        end
      ),
      0
    )
  into v_balance
  from public.transactions
  where
    user_id = v_user_id
    and (
      from_account_id =
        p_account_id
      or
      to_account_id =
        p_account_id
    );


  select
    v_balance +
    coalesce(
      sum(
        case
          when
            result_type = 'win'
          then
            coalesce(
              result_amount,
              0
            )

          when
            result_type = 'loss'
          then
            -coalesce(
              result_amount,
              0
            )

          else
            0
        end
      ),
      0
    )
  into v_balance
  from public.game_sessions
  where
    user_id = v_user_id
    and bankroll_account_id =
      p_account_id
    and status =
      'completed';


  select
    v_balance -
    coalesce(
      sum(
        principal_amount
      ),
      0
    )
  into v_balance
  from public.loans
  where
    user_id = v_user_id
    and source_account_id =
      p_account_id;


  select
    v_balance +
    coalesce(
      sum(
        amount
      ),
      0
    )
  into v_balance
  from public.loan_repayments
  where
    user_id = v_user_id
    and to_account_id =
      p_account_id;


  if
    v_balance <> 0
  then
    raise exception
      'Account balance must be NPR 0.00 before it can be archived.';
  end if;


  -- -------------------------------------------------------
  -- Active session protection
  --
  -- We protect BOTH:
  --   bankroll account
  --   original funding account
  --
  -- Otherwise settlement could fail later.
  -- -------------------------------------------------------

  select exists(
    select 1
    from public.game_sessions
    where
      user_id = v_user_id
      and status = 'active'
      and (
        bankroll_account_id =
          p_account_id
        or
        funding_account_id =
          p_account_id
      )
  )
  into
    v_active_session_exists;


  if
    v_active_session_exists
  then
    raise exception
      'This account is being used by an active Game Session.';
  end if;


  update public.accounts
  set
    archived_at =
      now()
  where
    id = p_account_id
    and user_id = v_user_id;
end;
$$;


-- ---------------------------------------------------------
-- RESTORE ACCOUNT
-- ---------------------------------------------------------

create or replace function public.restore_account(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  update public.accounts
  set
    archived_at =
      null
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
-- PROTECT ARCHIVED ACCOUNTS FROM NEW FINANCIAL ACTIVITY
-- =========================================================


-- ---------------------------------------------------------
-- TRANSACTIONS
-- ---------------------------------------------------------

create or replace function public.guard_archived_transaction_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_account_id uuid;

  v_to_account_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_from_account_id :=
      old.from_account_id;

    v_to_account_id :=
      old.to_account_id;
  else
    v_from_account_id :=
      new.from_account_id;

    v_to_account_id :=
      new.to_account_id;
  end if;


  if
    v_from_account_id is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          v_from_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the archived source account before modifying this transaction.';
  end if;


  if
    v_to_account_id is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          v_to_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the archived destination account before modifying this transaction.';
  end if;


  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


drop trigger if exists
  guard_archived_transaction_accounts_trigger
on public.transactions;


create trigger
  guard_archived_transaction_accounts_trigger
before insert or update or delete
on public.transactions
for each row
execute function
  public.guard_archived_transaction_accounts();


-- ---------------------------------------------------------
-- LOANS
-- ---------------------------------------------------------

create or replace function public.guard_archived_loan_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_account_id :=
      old.source_account_id;
  else
    v_account_id :=
      new.source_account_id;
  end if;


  if
    v_account_id is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          v_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the archived account before modifying this loan.';
  end if;


  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


drop trigger if exists
  guard_archived_loan_accounts_trigger
on public.loans;


create trigger
  guard_archived_loan_accounts_trigger
before insert or update or delete
on public.loans
for each row
execute function
  public.guard_archived_loan_accounts();


-- ---------------------------------------------------------
-- LOAN REPAYMENTS
-- ---------------------------------------------------------

create or replace function public.guard_archived_repayment_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_account_id :=
      old.to_account_id;
  else
    v_account_id :=
      new.to_account_id;
  end if;


  if
    v_account_id is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          v_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the archived account before modifying this repayment.';
  end if;


  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


drop trigger if exists
  guard_archived_repayment_accounts_trigger
on public.loan_repayments;


create trigger
  guard_archived_repayment_accounts_trigger
before insert or update or delete
on public.loan_repayments
for each row
execute function
  public.guard_archived_repayment_accounts();


-- ---------------------------------------------------------
-- GAME SESSIONS
-- ---------------------------------------------------------

create or replace function public.guard_archived_game_session_accounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    new.bankroll_account_id
      is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          new.bankroll_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the Game Bankroll account before using it in a session.';
  end if;


  if
    new.funding_account_id
      is not null
    and exists(
      select 1
      from public.accounts
      where
        id =
          new.funding_account_id
        and archived_at
          is not null
    )
  then
    raise exception
      'Restore the funding account before using it in a session.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  guard_archived_game_session_accounts_trigger
on public.game_sessions;


create trigger
  guard_archived_game_session_accounts_trigger
before insert or update
on public.game_sessions
for each row
execute function
  public.guard_archived_game_session_accounts();


-- ---------------------------------------------------------
-- PERMISSIONS
-- ---------------------------------------------------------

revoke all
on function public.archive_account(uuid)
from public;

revoke all
on function public.restore_account(uuid)
from public;


grant execute
on function public.archive_account(uuid)
to authenticated;

grant execute
on function public.restore_account(uuid)
to authenticated;


notify pgrst, 'reload schema';