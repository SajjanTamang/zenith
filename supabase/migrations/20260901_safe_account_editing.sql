-- =========================================================
-- Zenith Finance
-- Safe account editing
-- =========================================================
--
-- Users may edit:
--   - account name
--   - opening balance for normal accounts
--
-- Users may NOT:
--   - change account type after creation
--   - change a Game Bankroll opening balance
--
-- New Game Bankroll accounts must start at 0.
-- Existing historical Game Bankroll balances are preserved.
-- =========================================================


-- ---------------------------------------------------------
-- SAFE ACCOUNT UPDATE
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


  /*
    Game Bankroll opening balances are
    controlled by the bankroll/session
    accounting model.

    Existing historical values are allowed
    to remain exactly as they are.
  */
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
-- PROTECT CORE ACCOUNT FIELDS
-- ---------------------------------------------------------

create or replace function public.protect_account_core_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  /*
    New Game Bankroll accounts must
    start with no persistent balance.
  */
  if TG_OP = 'INSERT' then
    if
      new.account_type =
        'game_bankroll'
      and new.opening_balance
        is distinct from
        0::numeric
    then
      raise exception
        'Game Bankroll accounts must start at 0.';
    end if;

    return new;
  end if;


  /*
    Account type is permanent after
    account creation.
  */
  if
    old.account_type
      is distinct from
      new.account_type
  then
    raise exception
      'Account type cannot be changed after creation.';
  end if;


  /*
    Preserve existing Game Bankroll
    opening balances, including older
    historical/reconciliation data.
  */
  if
    old.account_type =
      'game_bankroll'
    and new.opening_balance
      is distinct from
      old.opening_balance
  then
    raise exception
      'Game Bankroll opening balance cannot be changed.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_account_core_fields_trigger
on public.accounts;


create trigger
  protect_account_core_fields_trigger
before insert or update
on public.accounts
for each row
execute function
  public.protect_account_core_fields();


-- ---------------------------------------------------------
-- FUNCTION PERMISSIONS
-- ---------------------------------------------------------

revoke all
on function public.update_manual_account(
  uuid,
  text,
  numeric
)
from public;


grant execute
on function public.update_manual_account(
  uuid,
  text,
  numeric
)
to authenticated;


-- Reload PostgREST RPC schema.
notify pgrst, 'reload schema';