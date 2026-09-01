/*
  Zenith Finance
  Safe completed Game Session correction

  A completed session may safely correct:
  - game type
  - note
  - result type
  - result amount

  Locked:
  - playing amount
  - funding account
  - bankroll account
  - start/end timestamps

  Money correction rule:

  We DO NOT rewrite the original automatic
  funding or settlement transfers.

  Instead we calculate:

      new P&L - old P&L

  and create a protected transfer that keeps
  the Game Bankroll at NPR 0.00.

  Example:

      old win = +500
      new win = +300
      delta   = -200

  The corrected P&L reduces the bankroll by 200,
  so Zenith transfers NPR 200:

      funding account -> Game Bankroll

  Result:
      Game Bankroll returns to NPR 0.00
      funding account reflects the corrected P&L
      historical settlement remains untouched
*/


/* =========================================================
   SAFE COMPLETED SESSION CORRECTION
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
     LOCK + LOAD SESSION
     ------------------------------------------------------- */

  select *
  into v_session
  from public.game_sessions
  where
    id = p_session_id
    and user_id = v_user_id
  for update;


  if not found then
    raise exception
      'Session not found.';
  end if;


  if v_session.status <> 'completed' then
    raise exception
      'Only completed Game Sessions can be corrected here.';
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
      or p_result_amount <= 0
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


  /*
    Existing Zenith rule:
    a loss cannot exceed the amount
    originally being played.
  */
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


  /*
    This is the only money difference
    that has to be corrected.

    Positive:
      corrected result is better.

    Negative:
      corrected result is worse.
  */
  v_delta :=
    v_new_pnl -
    v_old_pnl;


  /* =======================================================
     MONEY CORRECTION SAFETY
     ======================================================= */

  if v_delta <> 0 then

    /*
      Sessions created before automatic settlement
      may not have funding_account_id.

      We cannot safely change their P&L using this
      correction system.
    */
    if
      v_session.funding_account_id
      is null
    then
      raise exception
        'This older session does not have an automatic settlement account. Its P&L cannot be corrected automatically.';
    end if;


    /*
      Don't change historical Game money while
      another Game Session is actively moving
      bankroll money.
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


    /*
      Both accounts must currently be active.

      If either was archived, restore it first.
    */
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


    /*
      A completed automatic-settlement session
      should leave its Game Bankroll at zero.

      If it isn't zero, something else has moved
      money through that bankroll and we should
      not guess how to correct it.
    */
    v_bankroll_before :=
      public.zenith_account_balance(
        v_session.bankroll_account_id
      );


    if v_bankroll_before <> 0 then
      raise exception
        'Game Bankroll must be NPR 0.00 before correcting this session. Resolve the bankroll balance first.';
    end if;

  end if;


  /* =======================================================
     ALLOW THIS CONTROLLED UPDATE

     A trigger below blocks direct client changes
     to completed session money fields.

     This local transaction flag tells that trigger
     that this specific update came through the
     safe correction RPC.
     ======================================================= */

  perform set_config(
    'zenith.allow_game_session_correction',
    '1',
    true
  );


  /* -------------------------------------------------------
     UPDATE SESSION
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
    and user_id =
      v_user_id;


  /* =======================================================
     BALANCE CORRECTION
     ======================================================= */

  /*
    New P&L is HIGHER than old P&L.

    Example:
      +300 -> +500

    Updating the Game Session adds NPR 200
    to the Game Bankroll.

    Move that NPR 200 back to the original
    funding account.
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
      'Game Bankroll Correction',
      'Session correction: ' ||
        v_clean_game_type,
      now()
    );

  end if;


  /*
    New P&L is LOWER than old P&L.

    Example:
      +500 -> +300

    Updating the result removes NPR 200
    from the Game Bankroll calculation.

    Move NPR 200 from the original funding
    account back into the bankroll so its
    final balance remains zero.
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
      'Game Bankroll Correction',
      'Session correction: ' ||
        v_clean_game_type,
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
        'Game correction could not return the Game Bankroll to NPR 0.00. No changes were saved.';
    end if;

  end if;


  return v_delta;
end;
$$;


/* =========================================================
   PROTECT COMPLETED GAME SESSION MONEY FIELDS

   Completed session P&L should not be changed
   by a normal direct table update.

   It must go through correct_game_session().
   ========================================================= */

create or replace function public.protect_completed_game_session_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correction_allowed text;
begin
  /*
    Game Sessions should never be deleted
    directly because automatic funding,
    settlement and lending may depend on them.

    We will later add a separate safe
    void-session workflow.
  */
  if TG_OP = 'DELETE' then

    if auth.uid() is not null then
      raise exception
        'Game Sessions cannot be deleted directly.';
    end if;

    return old;

  end if;


  /*
    Only protect sessions that were already
    completed before this UPDATE began.

    finish_game_session() still needs to perform
    active -> completed normally.
  */
  if old.status = 'completed' then

    v_correction_allowed :=
      coalesce(
        current_setting(
          'zenith.allow_game_session_correction',
          true
        ),
        ''
      );


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
    then
      raise exception
        'Completed Game Session money fields must be changed through the safe correction flow.';
    end if;

  end if;


  return new;
end;
$$;


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
   PROTECT AUTOMATIC GAME TRANSACTIONS

   Funding, Settlement and Correction transfers
   belong to the Game Session workflow and must
   not be manually edited/deleted as normal
   transactions.
   ========================================================= */

create or replace function public.protect_game_managed_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
    Only block normal authenticated-user changes.

    This avoids interfering with administrative
    maintenance performed outside the app.
  */
  if
    auth.uid() is not null
    and old.category in (
      'Game Bankroll Funding',
      'Game Bankroll Settlement',
      'Game Bankroll Correction'
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


/*
  Reload PostgREST so the new RPC appears
  immediately.
*/
notify pgrst, 'reload schema';