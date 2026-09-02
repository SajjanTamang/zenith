/*
  Zenith Finance
  Harden Game Winnings Receivables

  Rules:

  1. Game winnings receivable can only belong
     to a completed, non-voided WIN session.

  2. The receivable must come out of the exact
     funding/settlement account used by that session.

  3. Total game-winnings receivables attached to
     a session can never exceed that session's win.

  4. Once a game-winnings receivable exists,
     the financial result of that session is locked.

     Game name / note may still be corrected.
*/


/* =========================================================
   VALIDATE GAME WINNINGS RECEIVABLE
   ========================================================= */

create or replace function
public.validate_game_winnings_receivable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_result numeric :=
    0;

  v_funding_account_id uuid;

  v_existing_receivables numeric :=
    0;
begin

  /*
    claim_type itself is accounting history.

    Do not allow an existing row to be converted
    between Loan / Game Winnings / Other.
  */
  if
    TG_OP = 'UPDATE'
    and new.claim_type
      is distinct from
      old.claim_type
  then
    raise exception
      'Receivable type cannot be changed.';
  end if;


  /*
    Normal loans and generic receivables continue
    through the existing lending protections.
  */
  if
    new.claim_type <>
      'game_winnings'
  then
    return new;
  end if;


  if
    new.game_session_id
    is null
  then
    raise exception
      'Game winnings must be linked to a Game Session.';
  end if;


  /*
    Lock the Game Session while validating.

    This also serializes two receivables being
    created for the same session at once.
  */
  select
    result_amount,
    funding_account_id
  into
    v_session_result,
    v_funding_account_id
  from public.game_sessions
  where
    id =
      new.game_session_id
    and user_id =
      new.user_id
    and status =
      'completed'
    and voided_at
      is null
    and result_type =
      'win'
    and coalesce(
      result_amount,
      0
    ) >
      0
  for update;


  if not found then
    raise exception
      'Game winnings can only be recorded for a completed, non-voided winning session.';
  end if;


  if
    v_funding_account_id
    is null
  then
    raise exception
      'This session does not have an automatic settlement account.';
  end if;


  /*
    Zenith's Game Session engine settles the entire
    completed bankroll back to funding_account_id.

    A receivable therefore reclassifies money from
    that settlement account into "owed to me".
  */
  if
    new.source_account_id <>
      v_funding_account_id
  then
    raise exception
      'Game winnings owed must come from the session settlement account.';
  end if;


  /*
    Calculate other Game Winnings claims already
    attached to this session.
  */
  if
    TG_OP = 'UPDATE'
  then

    select
      coalesce(
        sum(
          principal_amount
        ),
        0
      )
    into
      v_existing_receivables
    from public.loans
    where
      user_id =
        new.user_id
      and game_session_id =
        new.game_session_id
      and claim_type =
        'game_winnings'
      and id <>
        old.id;

  else

    select
      coalesce(
        sum(
          principal_amount
        ),
        0
      )
    into
      v_existing_receivables
    from public.loans
    where
      user_id =
        new.user_id
      and game_session_id =
        new.game_session_id
      and claim_type =
        'game_winnings';

  end if;


  if
    v_existing_receivables
    +
    new.principal_amount
    >
    v_session_result
  then
    raise exception
      'Game winnings owed cannot exceed the Game Session win amount.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  validate_game_winnings_receivable_trigger
on public.loans;


create trigger
  validate_game_winnings_receivable_trigger
before insert or update
on public.loans
for each row
execute function
  public.validate_game_winnings_receivable();


/* =========================================================
   PROTECT SESSION AFTER GAME RECEIVABLE EXISTS

   Recording unpaid winnings establishes a financial
   claim based on that exact result.

   Therefore:

   allowed:
     - change game_type
     - change note

   blocked:
     - result_type
     - result_amount
     - voiding

   The receivable must be corrected/removed first
   before the Game Session financial result can move.
   ========================================================= */

create or replace function
public.protect_game_session_with_receivable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_receivable boolean :=
    false;
begin

  if
    old.status <>
      'completed'
  then
    return new;
  end if;


  if not (
    new.result_type
      is distinct from
      old.result_type

    or

    new.result_amount
      is distinct from
      old.result_amount

    or

    new.voided_at
      is distinct from
      old.voided_at

    or

    new.void_reason
      is distinct from
      old.void_reason

    or

    new.voided_original_result_type
      is distinct from
      old.voided_original_result_type

    or

    new.voided_original_result_amount
      is distinct from
      old.voided_original_result_amount
  ) then
    return new;
  end if;


  select exists (
    select 1
    from public.loans
    where
      user_id =
        old.user_id
      and game_session_id =
        old.id
      and claim_type =
        'game_winnings'
  )
  into
    v_has_receivable;


  if
    v_has_receivable
  then
    raise exception
      'This Game Session has game winnings recorded as money owed to you. Resolve that receivable before changing or voiding the financial result.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_game_session_with_receivable_trigger
on public.game_sessions;


create trigger
  protect_game_session_with_receivable_trigger
before update
on public.game_sessions
for each row
execute function
  public.protect_game_session_with_receivable();


/* =========================================================
   REPLACE CREATE RECEIVABLE RPC

   Game winnings:

   Session WIN +1600
   Settlement → Cash

   Person still owes 500:

     Cash        -500
     Receivable  +500

   Net worth unchanged.
   Game P&L unchanged.
   ========================================================= */

create or replace function
public.create_receivable(
  p_person_name text,
  p_source_account_id uuid,
  p_principal_amount numeric,
  p_claim_type text,
  p_game_session_id uuid,
  p_due_date date,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_person_id uuid;

  v_available_balance numeric :=
    0;

  v_receivable_id uuid;

  v_session_result numeric :=
    0;

  v_session_funding_account_id uuid;

  v_existing_game_receivables numeric :=
    0;
begin

  if
    v_user_id
    is null
  then
    raise exception
      'Not authenticated.';
  end if;


  if
    p_claim_type not in (
      'game_winnings',
      'other'
    )
  then
    raise exception
      'Invalid receivable type.';
  end if;


  if
    p_source_account_id
    is null
  then
    raise exception
      'Source account is required.';
  end if;


  if
    p_principal_amount
    is null
    or
    p_principal_amount <=
      0
  then
    raise exception
      'Receivable amount must be greater than 0.';
  end if;


  if
    round(
      p_principal_amount,
      2
    ) <>
    p_principal_amount
  then
    raise exception
      'Receivable amount cannot have more than 2 decimal places.';
  end if;


  perform
    public.zenith_require_active_account(
      v_user_id,
      p_source_account_id
    );


  /* -------------------------------------------------------
     GAME WINNINGS RULES
     ------------------------------------------------------- */

  if
    p_claim_type =
      'game_winnings'
  then

    if
      p_game_session_id
      is null
    then
      raise exception
        'Select the Game Session for these unpaid winnings.';
    end if;


    /*
      Lock the Game Session.
    */
    select
      result_amount,
      funding_account_id
    into
      v_session_result,
      v_session_funding_account_id
    from public.game_sessions
    where
      id =
        p_game_session_id
      and user_id =
        v_user_id
      and status =
        'completed'
      and voided_at
        is null
      and result_type =
        'win'
      and coalesce(
        result_amount,
        0
      ) >
        0
    for update;


    if not found then
      raise exception
        'Game winnings can only be recorded for a completed, non-voided winning session.';
    end if;


    if
      v_session_funding_account_id
      is null
    then
      raise exception
        'This session does not have an automatic settlement account.';
    end if;


    if
      p_source_account_id <>
        v_session_funding_account_id
    then
      raise exception
        'Game winnings owed must come from the session settlement account.';
    end if;


    select
      coalesce(
        sum(
          principal_amount
        ),
        0
      )
    into
      v_existing_game_receivables
    from public.loans
    where
      user_id =
        v_user_id
      and game_session_id =
        p_game_session_id
      and claim_type =
        'game_winnings';


    if
      v_existing_game_receivables
      +
      p_principal_amount
      >
      v_session_result
    then
      raise exception
        'Game winnings owed cannot exceed the Game Session win amount.';
    end if;

  end if;


  /*
    The receivable moves value out of an owned
    account and into an asset owed to the user.

    Therefore the account needs enough available
    money for the accounting reclassification.
  */
  v_available_balance :=
    public.zenith_account_balance(
      p_source_account_id
    );


  if
    v_available_balance <
    p_principal_amount
  then
    raise exception
      'Source account does not have enough available money for this receivable.';
  end if;


  v_person_id :=
    public.zenith_get_or_create_money_person(
      v_user_id,
      p_person_name
    );


  insert into public.loans (
    user_id,
    person_id,
    source_account_id,
    principal_amount,
    game_session_id,
    due_date,
    note,
    claim_type
  )
  values (
    v_user_id,
    v_person_id,
    p_source_account_id,
    p_principal_amount,

    case
      when
        p_claim_type =
          'game_winnings'
      then
        p_game_session_id
      else
        null
    end,

    p_due_date,

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),

    p_claim_type
  )
  returning id
  into
    v_receivable_id;


  return
    v_receivable_id;
end;
$$;


/* =========================================================
   PERMISSIONS
   ========================================================= */

revoke all
on function
  public.create_receivable(
    text,
    uuid,
    numeric,
    text,
    uuid,
    date,
    text
  )
from public;


grant execute
on function
  public.create_receivable(
    text,
    uuid,
    numeric,
    text,
    uuid,
    date,
    text
  )
to authenticated;


/* =========================================================
   POSTGREST
   ========================================================= */

notify pgrst, 'reload schema';