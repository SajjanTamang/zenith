/*
  Zenith automatic Game Bankroll flow

  Start:
    funding account -> bankroll

  Finish:
    apply Game P&L
    remaining bankroll -> original funding account

  Result:
    bankroll normally returns to 0 after every session.
*/


/* ---------------------------------------------------------
   CURRENT ACCOUNT BALANCE
   --------------------------------------------------------- */

create or replace function public.zenith_account_balance(
  p_account_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select
    a.opening_balance

    +

    coalesce(
      (
        select sum(
          case
            when t.transaction_type = 'income'
              and t.to_account_id = a.id
              then t.amount

            when t.transaction_type = 'expense'
              and t.from_account_id = a.id
              then -t.amount

            when t.transaction_type = 'transfer'
              then
                (
                  case
                    when t.to_account_id = a.id
                      then t.amount
                    else 0
                  end
                )
                +
                (
                  case
                    when t.from_account_id = a.id
                      then -t.amount
                    else 0
                  end
                )

            else 0
          end
        )
        from public.transactions t
        where t.user_id = v_user_id
      ),
      0
    )

    +

    coalesce(
      (
        select sum(
          case
            when gs.result_type = 'win'
              then coalesce(gs.result_amount, 0)

            when gs.result_type = 'loss'
              then -coalesce(gs.result_amount, 0)

            else 0
          end
        )
        from public.game_sessions gs
        where
          gs.user_id = v_user_id
          and gs.bankroll_account_id = a.id
          and gs.status = 'completed'
      ),
      0
    )

    -

    coalesce(
      (
        select sum(l.principal_amount)
        from public.loans l
        where
          l.user_id = v_user_id
          and l.source_account_id = a.id
      ),
      0
    )

    +

    coalesce(
      (
        select sum(lr.amount)
        from public.loan_repayments lr
        where
          lr.user_id = v_user_id
          and lr.to_account_id = a.id
      ),
      0
    )

  into v_balance

  from public.accounts a

  where
    a.id = p_account_id
    and a.user_id = v_user_id;

  if v_balance is null then
    raise exception 'Account not found.';
  end if;

  return v_balance;
end;
$$;


/* ---------------------------------------------------------
   START GAME SESSION
   --------------------------------------------------------- */

create or replace function public.start_game_session(
  p_funding_account_id uuid,
  p_bankroll_account_id uuid,
  p_playing_amount numeric,
  p_game_type text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_funding_type text;
  v_bankroll_type text;

  v_funding_balance numeric;
  v_bankroll_balance numeric;

  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_playing_amount is null
    or p_playing_amount <= 0
  then
    raise exception 'Playing amount must be greater than 0.';
  end if;

  if trim(coalesce(p_game_type, '')) = '' then
    raise exception 'Game type is required.';
  end if;

  if p_funding_account_id = p_bankroll_account_id then
    raise exception 'Funding account and bankroll must be different.';
  end if;


  /*
    Funding account must belong to this user.
  */
  select account_type
  into v_funding_type
  from public.accounts
  where
    id = p_funding_account_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Funding account not found.';
  end if;


  /*
    Selected bankroll must belong to this user
    and must actually be a Game Bankroll.
  */
  select account_type
  into v_bankroll_type
  from public.accounts
  where
    id = p_bankroll_account_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Game bankroll not found.';
  end if;

  if v_bankroll_type <> 'game_bankroll' then
    raise exception 'Selected account is not a Game Bankroll.';
  end if;


  /*
    Don't fund one Game Bankroll from another.
  */
  if v_funding_type = 'game_bankroll' then
    raise exception 'Choose a Bank, Cash, Wallet, or Other account to fund the session.';
  end if;


  /*
    One active session per user.
  */
  if exists (
    select 1
    from public.game_sessions
    where
      user_id = v_user_id
      and status = 'active'
  ) then
    raise exception 'You already have an active session.';
  end if;


  /*
    New automatic-settlement sessions start
    from a zero bankroll.

    This gives every playing day a clean pot.
  */
  v_bankroll_balance :=
    public.zenith_account_balance(
      p_bankroll_account_id
    );

  if v_bankroll_balance <> 0 then
    raise exception
      'Game Bankroll must be NPR 0.00 before starting a new session.';
  end if;


  /*
    Do not let the source account go negative.
  */
  v_funding_balance :=
    public.zenith_account_balance(
      p_funding_account_id
    );

  if v_funding_balance < p_playing_amount then
    raise exception
      'Funding account does not have enough available money.';
  end if;


  /*
    Create the active session.

    funding_account_id remembers where the
    remaining bankroll must return when finished.
  */
  insert into public.game_sessions (
    user_id,
    bankroll_account_id,
    funding_account_id,
    playing_amount,
    game_type,
    note,
    status,
    started_at
  )
  values (
    v_user_id,
    p_bankroll_account_id,
    p_funding_account_id,
    p_playing_amount,
    trim(p_game_type),
    nullif(trim(coalesce(p_note, '')), ''),
    'active',
    now()
  )
  returning id
  into v_session_id;


  /*
    Fund the bankroll.

    This is a TRANSFER:
    not Income
    not Expense
    not Game P&L
  */
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
    p_playing_amount,
    p_funding_account_id,
    p_bankroll_account_id,
    'Game Bankroll Funding',
    'Session funding: ' || trim(p_game_type),
    now()
  );


  return v_session_id;
end;
$$;


/* ---------------------------------------------------------
   FINISH GAME SESSION
   --------------------------------------------------------- */

create or replace function public.finish_game_session(
  p_session_id uuid,
  p_result_type text,
  p_result_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_session public.game_sessions%rowtype;

  v_result_amount numeric;
  v_result_pnl numeric;

  v_bankroll_before_result numeric;
  v_remaining_bankroll numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;


  /*
    Lock the active session while finishing it.
  */
  select *
  into v_session
  from public.game_sessions
  where
    id = p_session_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Session not found.';
  end if;

  if v_session.status <> 'active' then
    raise exception 'Session has already been completed.';
  end if;


  /*
    Sessions created before the new workflow
    may not have a funding account.
  */
  if v_session.funding_account_id is null then
    raise exception
      'This session does not have an automatic settlement account.';
  end if;


  if p_result_type not in (
    'win',
    'loss',
    'even'
  ) then
    raise exception 'Invalid result type.';
  end if;


  if p_result_type = 'even' then
    v_result_amount := 0;
  else
    if p_result_amount is null
      or p_result_amount <= 0
    then
      raise exception 'Result amount must be greater than 0.';
    end if;

    v_result_amount :=
      p_result_amount;
  end if;


  /*
    Existing Zenith rule:
    loss cannot exceed playing amount.
  */
  if
    p_result_type = 'loss'
    and v_result_amount > v_session.playing_amount
  then
    raise exception
      'Loss cannot be greater than the playing amount.';
  end if;


  /*
    Make sure both accounts still belong
    to the signed-in user.
  */
  perform 1
  from public.accounts
  where
    id = v_session.bankroll_account_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Game Bankroll not found.';
  end if;

  perform 1
  from public.accounts
  where
    id = v_session.funding_account_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Funding account not found.';
  end if;


  /*
    Current bankroll BEFORE this game's
    final result is applied.

    Normally this equals playing_amount,
    but this also respects legitimate
    bankroll movements such as lending.
  */
  v_bankroll_before_result :=
    public.zenith_account_balance(
      v_session.bankroll_account_id
    );


  v_result_pnl :=
    case
      when p_result_type = 'win'
        then v_result_amount

      when p_result_type = 'loss'
        then -v_result_amount

      else 0
    end;


  v_remaining_bankroll :=
    v_bankroll_before_result
    +
    v_result_pnl;


  /*
    Prevent automatic settlement from
    creating a negative bankroll.
  */
  if v_remaining_bankroll < 0 then
    raise exception
      'This result would make the Game Bankroll negative. Resolve its other activity before finishing.';
  end if;


  /*
    Record the final Game P&L.
  */
  update public.game_sessions
  set
    status = 'completed',
    result_type = p_result_type,
    result_amount = v_result_amount,
    ended_at = now()
  where
    id = v_session.id;


  /*
    Return everything remaining in the
    bankroll to the ORIGINAL funding account.

    After this transfer the Game Bankroll
    should calculate to NPR 0.00.
  */
  if v_remaining_bankroll > 0 then
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
      v_remaining_bankroll,
      v_session.bankroll_account_id,
      v_session.funding_account_id,
      'Game Bankroll Settlement',
      'Session settlement: ' || v_session.game_type,
      now()
    );
  end if;


  return v_remaining_bankroll;
end;
$$;


/* ---------------------------------------------------------
   FUNCTION PERMISSIONS
   --------------------------------------------------------- */

revoke all
on function public.zenith_account_balance(uuid)
from public;

revoke all
on function public.start_game_session(
  uuid,
  uuid,
  numeric,
  text,
  text
)
from public;

revoke all
on function public.finish_game_session(
  uuid,
  text,
  numeric
)
from public;


grant execute
on function public.start_game_session(
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;

grant execute
on function public.finish_game_session(
  uuid,
  text,
  numeric
)
to authenticated;