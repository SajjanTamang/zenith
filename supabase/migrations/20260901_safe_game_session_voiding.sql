/*
  Zenith Finance
  Safe Game Session voiding

  IMPORTANT:
  game_sessions.status currently supports only:

    active
    completed

  We intentionally DO NOT add a new "voided" status.

  A voided session remains:
    status = 'completed'

  and receives:
    voided_at
    void_reason
    voided_original_result_type
    voided_original_result_amount

  Its current financial result becomes:
    result_type = 'even'
    result_amount = 0

  This makes its current Game P&L exactly zero while
  preserving the original result for audit/history.


  Example:

    Original:
      Win +NPR 500

    Void:
      original result saved as WIN 500
      current result becomes EVEN 0

    Financial correction:
      NPR 500 moves from funding -> Game Bankroll

    Result:
      Game Bankroll = NPR 0
      original funding account loses the mistaken +500
      total wealth returns to where it would have been
      if the mistaken session had never produced P&L
*/


/* =========================================================
   VOID AUDIT COLUMNS
   ========================================================= */

alter table public.game_sessions
add column if not exists voided_at timestamptz;


alter table public.game_sessions
add column if not exists void_reason text;


alter table public.game_sessions
add column if not exists voided_original_result_type text;


alter table public.game_sessions
add column if not exists voided_original_result_amount numeric;


/* ---------------------------------------------------------
   ORIGINAL RESULT TYPE SAFETY
   --------------------------------------------------------- */

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'game_sessions_voided_original_result_type_check'
      and
      conrelid =
        'public.game_sessions'::regclass
  ) then

    alter table public.game_sessions
    add constraint
      game_sessions_voided_original_result_type_check
    check (
      voided_original_result_type is null
      or
      voided_original_result_type in (
        'win',
        'loss',
        'even'
      )
    );

  end if;
end;
$$;


/* ---------------------------------------------------------
   ORIGINAL RESULT AMOUNT SAFETY
   --------------------------------------------------------- */

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'game_sessions_voided_original_result_amount_check'
      and
      conrelid =
        'public.game_sessions'::regclass
  ) then

    alter table public.game_sessions
    add constraint
      game_sessions_voided_original_result_amount_check
    check (
      voided_original_result_amount is null
      or
      voided_original_result_amount >= 0
    );

  end if;
end;
$$;


/* ---------------------------------------------------------
   INDEX
   --------------------------------------------------------- */

create index if not exists
  game_sessions_user_voided_at_idx
on public.game_sessions (
  user_id,
  voided_at
);


/* =========================================================
   UPDATE SAFE SESSION CORRECTION

   A session that has already been voided
   can never be corrected again.
   ========================================================= */

create or replace function public.correct_game_session(
  p_session_id uuid,
  p_game_type text,
  p_note text,
  p_result_type text,
  p_result_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_session public.game_sessions%rowtype;

  v_clean_game_type text;

  v_new_result_amount numeric;

  v_old_pnl numeric :=
    0;

  v_new_pnl numeric :=
    0;

  v_delta numeric :=
    0;

  v_bankroll_before numeric :=
    0;

  v_bankroll_after numeric :=
    0;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  /* -------------------------------------------------------
     LOCK + LOAD
     ------------------------------------------------------- */

  select *
  into v_session
  from public.game_sessions
  where
    id =
      p_session_id
    and
    user_id =
      v_user_id
  for update;


  if not found then
    raise exception
      'Session not found.';
  end if;


  if v_session.status <> 'completed' then
    raise exception
      'Only completed Game Sessions can be corrected.';
  end if;


  if v_session.voided_at is not null then
    raise exception
      'Voided Game Sessions cannot be corrected.';
  end if;


  /* -------------------------------------------------------
     GAME TYPE
     ------------------------------------------------------- */

  v_clean_game_type :=
    trim(
      coalesce(
        p_game_type,
        ''
      )
    );


  if v_clean_game_type = '' then
    raise exception
      'Game type is required.';
  end if;


  /* -------------------------------------------------------
     RESULT
     ------------------------------------------------------- */

  if p_result_type not in (
    'win',
    'loss',
    'even'
  ) then
    raise exception
      'Invalid result type.';
  end if;


  if p_result_type = 'even' then

    v_new_result_amount :=
      0;

  else

    if
      p_result_amount is null
      or
      p_result_amount <= 0
    then
      raise exception
        'Result amount must be greater than 0.';
    end if;


    if
      round(
        p_result_amount,
        2
      ) <>
      p_result_amount
    then
      raise exception
        'Result amount cannot have more than 2 decimal places.';
    end if;


    v_new_result_amount :=
      p_result_amount;

  end if;


  if
    p_result_type = 'loss'
    and
    v_new_result_amount >
      v_session.playing_amount
  then
    raise exception
      'Loss cannot be greater than the playing amount.';
  end if;


  /* -------------------------------------------------------
     OLD P&L
     ------------------------------------------------------- */

  v_old_pnl :=
    case

      when
        v_session.result_type = 'win'
      then
        coalesce(
          v_session.result_amount,
          0
        )

      when
        v_session.result_type = 'loss'
      then
        -coalesce(
          v_session.result_amount,
          0
        )

      else
        0

    end;


  /* -------------------------------------------------------
     NEW P&L
     ------------------------------------------------------- */

  v_new_pnl :=
    case

      when
        p_result_type = 'win'
      then
        v_new_result_amount

      when
        p_result_type = 'loss'
      then
        -v_new_result_amount

      else
        0

    end;


  v_delta :=
    v_new_pnl -
    v_old_pnl;


  /* =======================================================
     MONEY SAFETY
     ======================================================= */

  if v_delta <> 0 then

    if
      v_session.funding_account_id
      is null
    then
      raise exception
        'This older session does not have an automatic settlement account.';
    end if;


    /*
      Do not correct historical game money
      while another session is active.
    */
    if exists (
      select 1
      from public.game_sessions
      where
        user_id =
          v_user_id
        and status =
          'active'
    ) then
      raise exception
        'Finish the active Game Session before correcting a completed session.';
    end if;


    perform
      public.zenith_require_active_account(
        v_user_id,
        v_session.bankroll_account_id
      );


    perform
      public.zenith_require_active_account(
        v_user_id,
        v_session.funding_account_id
      );


    v_bankroll_before :=
      public.zenith_account_balance(
        v_session.bankroll_account_id
      );


    if v_bankroll_before <> 0 then
      raise exception
        'Game Bankroll must be NPR 0.00 before correcting this session.';
    end if;


    /*
      If the corrected result is worse,
      money needs to move from funding
      back into the Game Bankroll.

      Make sure the funding account
      can afford that correction.
    */
    if v_delta < 0 then

      if
        public.zenith_account_balance(
          v_session.funding_account_id
        )
        <
        abs(
          v_delta
        )
      then
        raise exception
          'The original funding account does not currently have enough money for this correction.';
      end if;

    end if;

  end if;


  /* =======================================================
     AUTHORIZE CONTROLLED COMPLETED-SESSION UPDATE
     ======================================================= */

  perform set_config(
    'zenith.allow_game_session_correction',
    '1',
    true
  );


  /* -------------------------------------------------------
     UPDATE
     ------------------------------------------------------- */

  update public.game_sessions
  set
    game_type =
      v_clean_game_type,

    note =
      nullif(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      ),

    result_type =
      p_result_type,

    result_amount =
      v_new_result_amount

  where
    id =
      v_session.id
    and
    user_id =
      v_user_id;


  /* =======================================================
     BALANCE CORRECTION
     ======================================================= */

  if v_delta > 0 then

    insert into public.transactions (
      user_id,
      transaction_type,
      amount,
      from_account_id,
      to_account_id,
      category,
      note,
      occurred_at
    )
    values (
      v_user_id,
      'transfer',
      v_delta,
      v_session.bankroll_account_id,
      v_session.funding_account_id,
      'Game Bankroll Correction',
      'Session correction: ' ||
        v_clean_game_type,
      now()
    );

  end if;


  if v_delta < 0 then

    insert into public.transactions (
      user_id,
      transaction_type,
      amount,
      from_account_id,
      to_account_id,
      category,
      note,
      occurred_at
    )
    values (
      v_user_id,
      'transfer',
      abs(
        v_delta
      ),
      v_session.funding_account_id,
      v_session.bankroll_account_id,
      'Game Bankroll Correction',
      'Session correction: ' ||
        v_clean_game_type,
      now()
    );

  end if;


  /* -------------------------------------------------------
     FINAL BANKROLL CHECK
     ------------------------------------------------------- */

  if v_delta <> 0 then

    v_bankroll_after :=
      public.zenith_account_balance(
        v_session.bankroll_account_id
      );


    if v_bankroll_after <> 0 then
      raise exception
        'Game correction could not return the Game Bankroll to NPR 0.00. No changes were saved.';
    end if;

  end if;


  return v_delta;
end;
$$;


/* =========================================================
   VOID GAME SESSION
   ========================================================= */

create or replace function public.void_game_session(
  p_session_id uuid,
  p_reason text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_session public.game_sessions%rowtype;

  v_clean_reason text;

  v_old_pnl numeric :=
    0;

  v_delta numeric :=
    0;

  v_bankroll_before numeric :=
    0;

  v_bankroll_after numeric :=
    0;

  v_funding_balance numeric :=
    0;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  /* -------------------------------------------------------
     REASON
     ------------------------------------------------------- */

  v_clean_reason :=
    trim(
      coalesce(
        p_reason,
        ''
      )
    );


  if v_clean_reason = '' then
    raise exception
      'Enter a reason for voiding this session.';
  end if;


  /* -------------------------------------------------------
     LOCK SESSION
     ------------------------------------------------------- */

  select *
  into v_session
  from public.game_sessions
  where
    id =
      p_session_id
    and
    user_id =
      v_user_id
  for update;


  if not found then
    raise exception
      'Session not found.';
  end if;


  if v_session.status <> 'completed' then
    raise exception
      'Only completed Game Sessions can be voided.';
  end if;


  if v_session.voided_at is not null then
    raise exception
      'This Game Session has already been voided.';
  end if;


  /* -------------------------------------------------------
     CURRENT P&L
     ------------------------------------------------------- */

  v_old_pnl :=
    case

      when
        v_session.result_type = 'win'
      then
        coalesce(
          v_session.result_amount,
          0
        )

      when
        v_session.result_type = 'loss'
      then
        -coalesce(
          v_session.result_amount,
          0
        )

      else
        0

    end;


  /*
    New P&L after voiding = zero.

      delta = new - old
            = 0 - old
  */
  v_delta :=
    -v_old_pnl;


  /* =======================================================
     MONEY SAFETY
     ======================================================= */

  if v_delta <> 0 then

    if
      v_session.funding_account_id
      is null
    then
      raise exception
        'This older session does not have an automatic settlement account and cannot be safely voided while it has non-zero P&L.';
    end if;


    /*
      Never rewrite historical Game P&L
      while another Game Session is active.
    */
    if exists (
      select 1
      from public.game_sessions
      where
        user_id =
          v_user_id
        and status =
          'active'
    ) then
      raise exception
        'Finish the active Game Session before voiding a completed session.';
    end if;


    perform
      public.zenith_require_active_account(
        v_user_id,
        v_session.bankroll_account_id
      );


    perform
      public.zenith_require_active_account(
        v_user_id,
        v_session.funding_account_id
      );


    v_bankroll_before :=
      public.zenith_account_balance(
        v_session.bankroll_account_id
      );


    if v_bankroll_before <> 0 then
      raise exception
        'Game Bankroll must be NPR 0.00 before voiding this session.';
    end if;


    /*
      If the session currently has a WIN,
      voiding removes that win.

      Therefore money must travel:

        funding -> bankroll

      Ensure funding has enough money.
    */
    if v_delta < 0 then

      v_funding_balance :=
        public.zenith_account_balance(
          v_session.funding_account_id
        );


      if
        v_funding_balance <
        abs(
          v_delta
        )
      then
        raise exception
          'The original funding account does not currently have enough money to reverse this session result.';
      end if;

    end if;

  end if;


  /* =======================================================
     AUTHORIZE VOID UPDATE
     ======================================================= */

  perform set_config(
    'zenith.allow_game_session_void',
    '1',
    true
  );


  perform set_config(
    'zenith.allow_game_session_correction',
    '1',
    true
  );


  /* -------------------------------------------------------
     SAVE AUDIT + ZERO CURRENT P&L
     ------------------------------------------------------- */

  update public.game_sessions
  set
    voided_at =
      now(),

    void_reason =
      v_clean_reason,

    voided_original_result_type =
      v_session.result_type,

    voided_original_result_amount =
      coalesce(
        v_session.result_amount,
        0
      ),

    result_type =
      'even',

    result_amount =
      0

  where
    id =
      v_session.id
    and
    user_id =
      v_user_id;


  /* =======================================================
     VOID BALANCE CORRECTION
     ======================================================= */

  /*
    v_delta > 0

    Example:
      original loss = -20
      voided result = 0
      delta = +20

    The Game Bankroll gains 20 from
    removing the loss.

    Send that 20 back to funding.
  */
  if v_delta > 0 then

    insert into public.transactions (
      user_id,
      transaction_type,
      amount,
      from_account_id,
      to_account_id,
      category,
      note,
      occurred_at
    )
    values (
      v_user_id,
      'transfer',
      v_delta,
      v_session.bankroll_account_id,
      v_session.funding_account_id,
      'Game Bankroll Void Correction',
      'Voided session: ' ||
        v_session.game_type,
      now()
    );

  end if;


  /*
    v_delta < 0

    Example:
      original win = +20
      voided result = 0
      delta = -20

    Removing the win makes the bankroll
    calculation lower by 20.

    Move 20 from funding -> bankroll.
  */
  if v_delta < 0 then

    insert into public.transactions (
      user_id,
      transaction_type,
      amount,
      from_account_id,
      to_account_id,
      category,
      note,
      occurred_at
    )
    values (
      v_user_id,
      'transfer',
      abs(
        v_delta
      ),
      v_session.funding_account_id,
      v_session.bankroll_account_id,
      'Game Bankroll Void Correction',
      'Voided session: ' ||
        v_session.game_type,
      now()
    );

  end if;


  /* -------------------------------------------------------
     FINAL SAFETY CHECK
     ------------------------------------------------------- */

  if v_delta <> 0 then

    v_bankroll_after :=
      public.zenith_account_balance(
        v_session.bankroll_account_id
      );


    if v_bankroll_after <> 0 then
      raise exception
        'Voiding this session could not return the Game Bankroll to NPR 0.00. No changes were saved.';
    end if;

  end if;


  return v_delta;
end;
$$;


/* =========================================================
   COMPLETED / VOIDED SESSION PROTECTION
   ========================================================= */

create or replace function public.protect_completed_game_session_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correction_allowed text;

  v_void_allowed text;
begin

  /*
    Never allow normal authenticated users
    to physically delete a Game Session.
  */
  if TG_OP = 'DELETE' then

    if auth.uid() is not null then
      raise exception
        'Game Sessions cannot be deleted directly.';
    end if;

    return old;

  end if;


  v_correction_allowed :=
    coalesce(
      current_setting(
        'zenith.allow_game_session_correction',
        true
      ),
      ''
    );


  v_void_allowed :=
    coalesce(
      current_setting(
        'zenith.allow_game_session_void',
        true
      ),
      ''
    );


  /*
    A session already marked voided becomes
    financially immutable for the signed-in user.
  */
  if
    old.voided_at is not null
    and
    auth.uid() is not null
    and
    v_void_allowed <> '1'
  then
    raise exception
      'Voided Game Sessions cannot be changed.';
  end if;


  /*
    Protect void-audit fields from normal
    authenticated direct table updates.
  */
  if
    auth.uid() is not null
    and
    (
      new.voided_at
        is distinct from
        old.voided_at

      or new.void_reason
        is distinct from
        old.void_reason

      or new.voided_original_result_type
        is distinct from
        old.voided_original_result_type

      or new.voided_original_result_amount
        is distinct from
        old.voided_original_result_amount
    )
    and
    v_void_allowed <> '1'
  then
    raise exception
      'Game Session void fields must be changed through the safe void flow.';
  end if;


  /*
    Existing completed-session financial
    protection.
  */
  if old.status = 'completed' then

    if
      (
        new.status
          is distinct from
          old.status

        or new.result_type
          is distinct from
          old.result_type

        or new.result_amount
          is distinct from
          old.result_amount

        or new.playing_amount
          is distinct from
          old.playing_amount

        or new.bankroll_account_id
          is distinct from
          old.bankroll_account_id

        or new.funding_account_id
          is distinct from
          old.funding_account_id

        or new.started_at
          is distinct from
          old.started_at

        or new.ended_at
          is distinct from
          old.ended_at
      )
      and
      v_correction_allowed <> '1'
      and
      v_void_allowed <> '1'
    then
      raise exception
        'Completed Game Session money fields must be changed through the safe correction flow.';
    end if;

  end if;


  return new;
end;
$$;


/* ---------------------------------------------------------
   RECREATE PROTECTION TRIGGER
   --------------------------------------------------------- */

drop trigger if exists
  protect_completed_game_session_changes_trigger
on public.game_sessions;


create trigger
  protect_completed_game_session_changes_trigger
before update or delete
on public.game_sessions
for each row
execute function
  public.protect_completed_game_session_changes();


/* =========================================================
   PROTECT GAME-MANAGED TRANSACTIONS
   ========================================================= */

create or replace function public.protect_game_managed_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    auth.uid() is not null
    and
    old.category in (
      'Game Bankroll Funding',
      'Game Bankroll Settlement',
      'Game Bankroll Correction',
      'Game Bankroll Void Correction'
    )
  then
    raise exception
      'This transaction is managed automatically by its Game Session.';
  end if;


  if TG_OP = 'DELETE' then
    return old;
  end if;


  return new;
end;
$$;


drop trigger if exists
  protect_game_managed_transactions_trigger
on public.transactions;


create trigger
  protect_game_managed_transactions_trigger
before update or delete
on public.transactions
for each row
execute function
  public.protect_game_managed_transactions();


/* =========================================================
   PERMISSIONS
   ========================================================= */

revoke all
on function public.void_game_session(
  uuid,
  text
)
from public;


grant execute
on function public.void_game_session(
  uuid,
  text
)
to authenticated;


revoke all
on function public.correct_game_session(
  uuid,
  text,
  text,
  text,
  numeric
)
from public;


grant execute
on function public.correct_game_session(
  uuid,
  text,
  text,
  text,
  numeric
)
to authenticated;


/* ---------------------------------------------------------
   POSTGREST SCHEMA RELOAD
   --------------------------------------------------------- */

notify pgrst, 'reload schema';