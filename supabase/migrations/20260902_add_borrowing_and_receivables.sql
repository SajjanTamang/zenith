/*
  Zenith Finance
  Borrowing + Receivables foundation

  Adds:

  1. Receivable types using the existing loans system

     loan
     game_winnings
     other

  2. Money I Owe / Borrowing

     borrowings
     borrowing_repayments

  Accounting rules:

  ----------------------------------------------------------

  BORROW MONEY

    Account             +700
    Liability           +700
    Net worth change       0

  REPAY BORROWING

    Account             -700
    Liability           -700
    Expense change         0
    Net worth change       0

  ----------------------------------------------------------

  GAME WINNINGS RECEIVABLE

    Example:

    Game P&L           +1600

    Person still owes:
                         500

    Owned account       -500
    Receivable          +500

    Net worth change       0

  Later collection:

    Receivable          -500
    Cash/eSewa          +500

    Income change          0
    Game P&L change        0
    Net worth change       0
*/


/* =========================================================
   RECEIVABLE TYPES
   ========================================================= */

alter table public.loans
add column if not exists
  claim_type text;


update public.loans
set
  claim_type = 'loan'
where
  claim_type is null;


alter table public.loans
alter column claim_type
set default 'loan';


alter table public.loans
alter column claim_type
set not null;


/*
  Allowed asset/receivable types.
*/
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'loans_claim_type_check'
      and
      conrelid =
        'public.loans'::regclass
  ) then

    alter table public.loans
    add constraint
      loans_claim_type_check
    check (
      claim_type in (
        'loan',
        'game_winnings',
        'other'
      )
    );

  end if;
end;
$$;


/*
  Game winnings should always point back
  to the Game Session where they were earned.
*/
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'loans_game_winnings_session_check'
      and
      conrelid =
        'public.loans'::regclass
  ) then

    alter table public.loans
    add constraint
      loans_game_winnings_session_check
    check (
      claim_type <> 'game_winnings'
      or
      game_session_id is not null
    );

  end if;
end;
$$;


create index if not exists
  loans_user_claim_type_idx
on public.loans (
  user_id,
  claim_type
);


/* =========================================================
   BORROWINGS

   Money the user owes someone else.
   ========================================================= */

create table if not exists
  public.borrowings (
    id uuid
      primary key
      default gen_random_uuid(),

    user_id uuid
      not null
      references auth.users(id)
      on delete cascade,

    /*
      Reuse loan_people internally.

      Although the database table is named
      loan_people, Zenith will treat these as
      general money counterparties in the UI.

      This prevents creating duplicate person
      records for someone who both lends to
      and borrows from the user.
    */
    person_id uuid
      not null
      references public.loan_people(id)
      on delete restrict,

    /*
      Account receiving the borrowed money.
    */
    to_account_id uuid
      not null
      references public.accounts(id)
      on delete restrict,

    principal_amount numeric(18,2)
      not null,

    /*
      Optional related Game Session.

      Example:
      borrowed money was used during a
      particular card session.
    */
    game_session_id uuid
      null
      references public.game_sessions(id)
      on delete set null,

    due_date date
      null,

    note text
      null,

    borrowed_at timestamptz
      not null
      default now(),

    created_at timestamptz
      not null
      default now(),

    constraint
      borrowings_principal_positive_check
    check (
      principal_amount > 0
    )
  );


/* =========================================================
   BORROWING REPAYMENTS
   ========================================================= */

create table if not exists
  public.borrowing_repayments (
    id uuid
      primary key
      default gen_random_uuid(),

    user_id uuid
      not null
      references auth.users(id)
      on delete cascade,

    borrowing_id uuid
      not null
      references public.borrowings(id)
      on delete restrict,

    /*
      Account used to repay the debt.
    */
    from_account_id uuid
      not null
      references public.accounts(id)
      on delete restrict,

    amount numeric(18,2)
      not null,

    note text
      null,

    repaid_at timestamptz
      not null
      default now(),

    created_at timestamptz
      not null
      default now(),

    constraint
      borrowing_repayments_amount_positive_check
    check (
      amount > 0
    )
  );


/* =========================================================
   INDEXES
   ========================================================= */

create index if not exists
  borrowings_user_person_idx
on public.borrowings (
  user_id,
  person_id
);


create index if not exists
  borrowings_user_account_idx
on public.borrowings (
  user_id,
  to_account_id
);


create index if not exists
  borrowings_user_borrowed_at_idx
on public.borrowings (
  user_id,
  borrowed_at desc
);


create index if not exists
  borrowing_repayments_user_borrowing_idx
on public.borrowing_repayments (
  user_id,
  borrowing_id
);


create index if not exists
  borrowing_repayments_user_account_idx
on public.borrowing_repayments (
  user_id,
  from_account_id
);


create index if not exists
  borrowing_repayments_user_repaid_at_idx
on public.borrowing_repayments (
  user_id,
  repaid_at desc
);


/* =========================================================
   RLS
   ========================================================= */

alter table public.borrowings
enable row level security;


alter table public.borrowing_repayments
enable row level security;


/*
  Reads are allowed only for the signed-in user.

  Writes intentionally go through safe RPCs below.
*/

drop policy if exists
  borrowings_select_own
on public.borrowings;


create policy
  borrowings_select_own
on public.borrowings
for select
to authenticated
using (
  user_id = auth.uid()
);


drop policy if exists
  borrowing_repayments_select_own
on public.borrowing_repayments;


create policy
  borrowing_repayments_select_own
on public.borrowing_repayments
for select
to authenticated
using (
  user_id = auth.uid()
);


/*
  New borrowing tables use RPC-only writes.
*/

revoke insert, update, delete
on public.borrowings
from authenticated;


revoke insert, update, delete
on public.borrowing_repayments
from authenticated;


revoke all
on public.borrowings
from anon;


revoke all
on public.borrowing_repayments
from anon;


grant select
on public.borrowings
to authenticated;


grant select
on public.borrowing_repayments
to authenticated;


/* =========================================================
   SHARED PERSON HELPER

   Reuse/create a person by name.
   ========================================================= */

create or replace function
public.zenith_get_or_create_money_person(
  p_user_id uuid,
  p_person_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_name text;

  v_person_id uuid;
begin
  v_clean_name :=
    trim(
      coalesce(
        p_person_name,
        ''
      )
    );


  if v_clean_name = '' then
    raise exception
      'Person name is required.';
  end if;


  select
    id
  into
    v_person_id
  from public.loan_people
  where
    user_id =
      p_user_id
    and lower(
      trim(name)
    ) =
    lower(
      v_clean_name
    )
  limit 1;


  if v_person_id is null then
    begin

      insert into public.loan_people (
        user_id,
        name
      )
      values (
        p_user_id,
        v_clean_name
      )
      returning id
      into v_person_id;

    exception
      when unique_violation then

        select
          id
        into
          v_person_id
        from public.loan_people
        where
          user_id =
            p_user_id
          and lower(
            trim(name)
          ) =
          lower(
            v_clean_name
          )
        limit 1;

    end;
  end if;


  if v_person_id is null then
    raise exception
      'Could not save the person.';
  end if;


  return v_person_id;
end;
$$;


/*
  Internal helper only.
*/
revoke all
on function
  public.zenith_get_or_create_money_person(
    uuid,
    text
  )
from public;


/* =========================================================
   BORROWING ROW VALIDATION
   ========================================================= */

create or replace function
public.validate_borrowing_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if new.user_id is null then
    raise exception
      'Borrowing user is required.';
  end if;


  if
    TG_OP = 'UPDATE'
    and
    new.user_id
      is distinct from
      old.user_id
  then
    raise exception
      'Borrowing owner cannot be changed.';
  end if;


  if
    new.principal_amount is null
    or
    new.principal_amount <= 0
  then
    raise exception
      'Borrowed amount must be greater than 0.';
  end if;


  if
    round(
      new.principal_amount,
      2
    ) <>
    new.principal_amount
  then
    raise exception
      'Borrowed amount cannot have more than 2 decimal places.';
  end if;


  /*
    Person must belong to this same user.
  */
  if not exists (
    select 1
    from public.loan_people
    where
      id =
        new.person_id
      and user_id =
        new.user_id
  ) then
    raise exception
      'Person not found.';
  end if;


  /*
    New money can only enter an active account.
  */
  if TG_OP = 'INSERT' then

    perform
      public.zenith_require_active_account(
        new.user_id,
        new.to_account_id
      );

  elsif
    new.to_account_id
      is distinct from
      old.to_account_id
  then

    perform
      public.zenith_require_active_account(
        new.user_id,
        new.to_account_id
      );

  end if;


  return new;
end;
$$;


drop trigger if exists
  validate_borrowing_row_trigger
on public.borrowings;


create trigger
  validate_borrowing_row_trigger
before insert or update
on public.borrowings
for each row
execute function
  public.validate_borrowing_row();


/* =========================================================
   BORROWING REPAYMENT VALIDATION
   ========================================================= */

create or replace function
public.validate_borrowing_repayment_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal numeric;

  v_other_repayments numeric :=
    0;
begin

  if new.user_id is null then
    raise exception
      'Repayment user is required.';
  end if;


  if
    TG_OP = 'UPDATE'
    and
    new.user_id
      is distinct from
      old.user_id
  then
    raise exception
      'Repayment owner cannot be changed.';
  end if;


  if
    new.amount is null
    or
    new.amount <= 0
  then
    raise exception
      'Repayment amount must be greater than 0.';
  end if;


  if
    round(
      new.amount,
      2
    ) <>
    new.amount
  then
    raise exception
      'Repayment amount cannot have more than 2 decimal places.';
  end if;


  if
    TG_OP = 'UPDATE'
    and
    new.borrowing_id
      is distinct from
      old.borrowing_id
  then
    raise exception
      'A repayment cannot be moved to another borrowing.';
  end if;


  /*
    Receiving account for the repayment
    movement must be an active account.

    In this case money LEAVES the account.
  */
  if TG_OP = 'INSERT' then

    perform
      public.zenith_require_active_account(
        new.user_id,
        new.from_account_id
      );

  elsif
    new.from_account_id
      is distinct from
      old.from_account_id
  then

    perform
      public.zenith_require_active_account(
        new.user_id,
        new.from_account_id
      );

  end if;


  /*
    Lock borrowing while validating total.
  */
  select
    principal_amount
  into
    v_principal
  from public.borrowings
  where
    id =
      new.borrowing_id
    and user_id =
      new.user_id
  for update;


  if not found then
    raise exception
      'Borrowing not found.';
  end if;


  /*
    Avoid referencing OLD during INSERT.

    This is intentionally split into
    two branches.
  */
  if TG_OP = 'UPDATE' then

    select
      coalesce(
        sum(amount),
        0
      )
    into
      v_other_repayments
    from public.borrowing_repayments
    where
      borrowing_id =
        new.borrowing_id
      and user_id =
        new.user_id
      and id <>
        old.id;

  else

    select
      coalesce(
        sum(amount),
        0
      )
    into
      v_other_repayments
    from public.borrowing_repayments
    where
      borrowing_id =
        new.borrowing_id
      and user_id =
        new.user_id;

  end if;


  if
    v_other_repayments
    +
    new.amount
    >
    v_principal
  then
    raise exception
      'Total repayments cannot be greater than the borrowed amount.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  validate_borrowing_repayment_total_trigger
on public.borrowing_repayments;


create trigger
  validate_borrowing_repayment_total_trigger
before insert or update
on public.borrowing_repayments
for each row
execute function
  public.validate_borrowing_repayment_total();


/* =========================================================
   ACCOUNT BALANCE ENGINE

   This replaces the existing database helper
   so borrowed money is immediately recognized
   by existing Game Session and lending RPCs.

   Account balance:

   opening balance
   + income
   - expenses
   +/- transfers
   +/- completed game P&L
   - lending/receivables
   + loan/receivable repayments
   + borrowed money
   - borrowing repayments
   ========================================================= */

create or replace function
public.zenith_account_balance(
  p_account_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_opening numeric :=
    0;

  v_transaction_balance numeric :=
    0;

  v_game_balance numeric :=
    0;

  v_lending_balance numeric :=
    0;

  v_lending_repayments numeric :=
    0;

  v_borrowing_balance numeric :=
    0;

  v_borrowing_repayments numeric :=
    0;
begin

  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  select
    opening_balance
  into
    v_opening
  from public.accounts
  where
    id =
      p_account_id
    and user_id =
      v_user_id;


  if not found then
    raise exception
      'Account not found.';
  end if;


  /* -------------------------------------------------------
     NORMAL TRANSACTIONS
     ------------------------------------------------------- */

  select
    coalesce(
      sum(
        case

          when
            transaction_type = 'income'
            and
            to_account_id =
              p_account_id
          then
            amount

          when
            transaction_type = 'expense'
            and
            from_account_id =
              p_account_id
          then
            -amount

          when
            transaction_type = 'transfer'
            and
            from_account_id =
              p_account_id
          then
            -amount

          when
            transaction_type = 'transfer'
            and
            to_account_id =
              p_account_id
          then
            amount

          else
            0

        end
      ),
      0
    )
  into
    v_transaction_balance
  from public.transactions
  where
    user_id =
      v_user_id
    and (
      from_account_id =
        p_account_id
      or
      to_account_id =
        p_account_id
    );


  /* -------------------------------------------------------
     COMPLETED GAME P&L
     ------------------------------------------------------- */

  select
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
  into
    v_game_balance
  from public.game_sessions
  where
    user_id =
      v_user_id
    and bankroll_account_id =
      p_account_id
    and status =
      'completed';


  /* -------------------------------------------------------
     MONEY OWED TO USER
     ------------------------------------------------------- */

  select
    coalesce(
      sum(
        -principal_amount
      ),
      0
    )
  into
    v_lending_balance
  from public.loans
  where
    user_id =
      v_user_id
    and source_account_id =
      p_account_id;


  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_lending_repayments
  from public.loan_repayments
  where
    user_id =
      v_user_id
    and to_account_id =
      p_account_id;


  /* -------------------------------------------------------
     MONEY USER BORROWED
     ------------------------------------------------------- */

  select
    coalesce(
      sum(
        principal_amount
      ),
      0
    )
  into
    v_borrowing_balance
  from public.borrowings
  where
    user_id =
      v_user_id
    and to_account_id =
      p_account_id;


  select
    coalesce(
      sum(
        -amount
      ),
      0
    )
  into
    v_borrowing_repayments
  from public.borrowing_repayments
  where
    user_id =
      v_user_id
    and from_account_id =
      p_account_id;


  return
    v_opening
    +
    v_transaction_balance
    +
    v_game_balance
    +
    v_lending_balance
    +
    v_lending_repayments
    +
    v_borrowing_balance
    +
    v_borrowing_repayments;
end;
$$;


/* =========================================================
   CREATE BORROWING

   Example:

   Borrow NPR 700 from Ram
   Receive into Cash

   Cash:
     +700

   Liability:
     +700

   Net worth:
     unchanged
   ========================================================= */

create or replace function
public.create_borrowing(
  p_person_name text,
  p_to_account_id uuid,
  p_principal_amount numeric,
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

  v_borrowing_id uuid;
begin

  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  if p_to_account_id is null then
    raise exception
      'Receiving account is required.';
  end if;


  if
    p_principal_amount is null
    or
    p_principal_amount <= 0
  then
    raise exception
      'Borrowed amount must be greater than 0.';
  end if;


  if
    round(
      p_principal_amount,
      2
    ) <>
    p_principal_amount
  then
    raise exception
      'Borrowed amount cannot have more than 2 decimal places.';
  end if;


  perform
    public.zenith_require_active_account(
      v_user_id,
      p_to_account_id
    );


  v_person_id :=
    public.zenith_get_or_create_money_person(
      v_user_id,
      p_person_name
    );


  insert into public.borrowings (
    user_id,
    person_id,
    to_account_id,
    principal_amount,
    due_date,
    note
  )
  values (
    v_user_id,
    v_person_id,
    p_to_account_id,
    p_principal_amount,
    p_due_date,

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    )
  )
  returning id
  into v_borrowing_id;


  return v_borrowing_id;
end;
$$;


/* =========================================================
   RECORD BORROWING REPAYMENT

   Example:

   Debt:
     700

   Repay:
     700 from Cash

   Cash:
     -700

   Debt:
     0

   Expense:
     0
   ========================================================= */

create or replace function
public.record_borrowing_repayment(
  p_borrowing_id uuid,
  p_from_account_id uuid,
  p_amount numeric,
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

  v_principal numeric;

  v_already_repaid numeric :=
    0;

  v_outstanding numeric :=
    0;

  v_account_balance numeric :=
    0;

  v_repayment_id uuid;
begin

  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  if p_from_account_id is null then
    raise exception
      'Repayment account is required.';
  end if;


  if
    p_amount is null
    or
    p_amount <= 0
  then
    raise exception
      'Repayment amount must be greater than 0.';
  end if;


  if
    round(
      p_amount,
      2
    ) <>
    p_amount
  then
    raise exception
      'Repayment amount cannot have more than 2 decimal places.';
  end if;


  perform
    public.zenith_require_active_account(
      v_user_id,
      p_from_account_id
    );


  /*
    Lock borrowing.
  */
  select
    principal_amount
  into
    v_principal
  from public.borrowings
  where
    id =
      p_borrowing_id
    and user_id =
      v_user_id
  for update;


  if not found then
    raise exception
      'Borrowing not found.';
  end if;


  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_already_repaid
  from public.borrowing_repayments
  where
    borrowing_id =
      p_borrowing_id
    and user_id =
      v_user_id;


  v_outstanding :=
    v_principal
    -
    v_already_repaid;


  if
    p_amount >
    v_outstanding
  then
    raise exception
      'Repayment cannot be greater than the amount still owed.';
  end if;


  /*
    The account must actually contain
    enough money to repay the debt.
  */
  v_account_balance :=
    public.zenith_account_balance(
      p_from_account_id
    );


  if
    v_account_balance <
    p_amount
  then
    raise exception
      'The selected account does not have enough available money for this repayment.';
  end if;


  insert into public.borrowing_repayments (
    user_id,
    borrowing_id,
    from_account_id,
    amount,
    note
  )
  values (
    v_user_id,
    p_borrowing_id,
    p_from_account_id,
    p_amount,

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    )
  )
  returning id
  into v_repayment_id;


  return v_repayment_id;
end;
$$;


/* =========================================================
   CREATE RECEIVABLE

   Uses the existing loans + loan_repayments system.

   claim_type:

     game_winnings
     other

   Example:

   Cash currently contains the full
   Game Session settlement.

   Friend still owes NPR 500 winnings.

   Create game_winnings receivable:

     Cash             -500
     Receivable       +500

     Net worth           0 change
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
begin

  if v_user_id is null then
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


  if p_source_account_id is null then
    raise exception
      'Source account is required.';
  end if;


  if
    p_principal_amount is null
    or
    p_principal_amount <= 0
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


  /*
    Game winnings must point to a real,
    completed, non-voided Game Session
    belonging to this user.
  */
  if
    p_claim_type =
      'game_winnings'
  then

    if p_game_session_id is null then
      raise exception
        'Select the Game Session for these unpaid winnings.';
    end if;


    if not exists (
      select 1
      from public.game_sessions
      where
        id =
          p_game_session_id
        and user_id =
          v_user_id
        and status =
          'completed'
        and voided_at is null
    ) then
      raise exception
        'Completed Game Session not found.';
    end if;

  end if;


  /*
    Creating the receivable removes money
    from an owned account, exactly like a loan.

    The account must contain that money first.
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
  into v_receivable_id;


  return v_receivable_id;
end;
$$;


/* =========================================================
   ARCHIVE ACCOUNT

   Replace the previous archive calculation with
   the central balance helper.

   This automatically includes:

     normal transactions
     game P&L
     lending
     receivables
     borrowing
     borrowing repayments
   ========================================================= */

create or replace function
public.archive_account(
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

  v_account public.accounts%rowtype;

  v_current_balance numeric :=
    0;

  v_has_active_session boolean :=
    false;
begin

  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  select *
  into
    v_account
  from public.accounts
  where
    id =
      p_account_id
    and user_id =
      v_user_id
  for update;


  if not found then
    raise exception
      'Account not found.';
  end if;


  if
    v_account.archived_at
    is not null
  then
    return;
  end if;


  /*
    Use the same balance engine used by
    Game Session and lending safety checks.
  */
  v_current_balance :=
    public.zenith_account_balance(
      p_account_id
    );


  if
    v_current_balance <>
    0
  then
    raise exception
      'Account balance must be NPR 0.00 before archiving. Current balance: NPR %.',
      v_current_balance;
  end if;


  /*
    Existing Game Session protection.
  */
  select exists (
    select 1
    from public.game_sessions
    where
      user_id =
        v_user_id
      and status =
        'active'
      and (
        bankroll_account_id =
          p_account_id
        or
        funding_account_id =
          p_account_id
      )
  )
  into
    v_has_active_session;


  if
    v_has_active_session
  then
    raise exception
      'Finish the active Game Session before archiving this account.';
  end if;


  update public.accounts
  set
    archived_at =
      now()
  where
    id =
      p_account_id
    and user_id =
      v_user_id;
end;
$$;


/* =========================================================
   PERMISSIONS
   ========================================================= */

revoke all
on function
  public.create_borrowing(
    text,
    uuid,
    numeric,
    date,
    text
  )
from public;


revoke all
on function
  public.record_borrowing_repayment(
    uuid,
    uuid,
    numeric,
    text
  )
from public;


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
  public.create_borrowing(
    text,
    uuid,
    numeric,
    date,
    text
  )
to authenticated;


grant execute
on function
  public.record_borrowing_repayment(
    uuid,
    uuid,
    numeric,
    text
  )
to authenticated;


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
   POSTGREST RELOAD
   ========================================================= */

notify pgrst, 'reload schema';