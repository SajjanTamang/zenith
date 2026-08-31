-- =========================================================
-- Zenith Finance
-- Baseline database schema
-- Created: 2026-08-31
--
-- Covers:
--   accounts
--   transactions
--   game_sessions
--   loan_people
--   loans
--   loan_repayments
--   indexes
--   constraints
--   row level security
-- =========================================================


-- =========================================================
-- ACCOUNTS
-- =========================================================

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name)) > 0
    ),

  account_type text not null
    check (
      account_type in (
        'cash',
        'bank',
        'wallet',
        'game_bankroll',
        'other'
      )
    ),

  opening_balance numeric(18,2) not null
    default 0,

  created_at timestamptz not null
    default now()
);


create index if not exists accounts_user_id_idx
  on public.accounts(user_id);


alter table public.accounts
  enable row level security;


drop policy if exists
  "Users can view own accounts"
  on public.accounts;

create policy
  "Users can view own accounts"
on public.accounts
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own accounts"
  on public.accounts;

create policy
  "Users can create own accounts"
on public.accounts
for insert
with check (
  auth.uid() = user_id
);


drop policy if exists
  "Users can update own accounts"
  on public.accounts;

create policy
  "Users can update own accounts"
on public.accounts
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


drop policy if exists
  "Users can delete own accounts"
  on public.accounts;

create policy
  "Users can delete own accounts"
on public.accounts
for delete
using (
  auth.uid() = user_id
);



-- =========================================================
-- TRANSACTIONS
-- =========================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  transaction_type text not null
    check (
      transaction_type in (
        'income',
        'expense',
        'transfer'
      )
    ),

  amount numeric(18,2) not null
    check (
      amount > 0
    ),

  from_account_id uuid
    references public.accounts(id)
    on delete restrict,

  to_account_id uuid
    references public.accounts(id)
    on delete restrict,

  category text,

  note text,

  occurred_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now(),

  constraint transactions_account_direction_check
  check (
    (
      transaction_type = 'income'
      and from_account_id is null
      and to_account_id is not null
    )
    or
    (
      transaction_type = 'expense'
      and from_account_id is not null
      and to_account_id is null
    )
    or
    (
      transaction_type = 'transfer'
      and from_account_id is not null
      and to_account_id is not null
      and from_account_id <> to_account_id
    )
  )
);


create index if not exists transactions_user_id_idx
  on public.transactions(user_id);


create index if not exists transactions_occurred_at_idx
  on public.transactions(user_id, occurred_at desc);


create index if not exists transactions_from_account_id_idx
  on public.transactions(from_account_id);


create index if not exists transactions_to_account_id_idx
  on public.transactions(to_account_id);


alter table public.transactions
  enable row level security;


drop policy if exists
  "Users can view own transactions"
  on public.transactions;

create policy
  "Users can view own transactions"
on public.transactions
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own transactions"
  on public.transactions;

create policy
  "Users can create own transactions"
on public.transactions
for insert
with check (
  auth.uid() = user_id

  and (
    from_account_id is null
    or exists (
      select 1
      from public.accounts
      where accounts.id = from_account_id
        and accounts.user_id = auth.uid()
    )
  )

  and (
    to_account_id is null
    or exists (
      select 1
      from public.accounts
      where accounts.id = to_account_id
        and accounts.user_id = auth.uid()
    )
  )
);


drop policy if exists
  "Users can update own transactions"
  on public.transactions;

create policy
  "Users can update own transactions"
on public.transactions
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id

  and (
    from_account_id is null
    or exists (
      select 1
      from public.accounts
      where accounts.id = from_account_id
        and accounts.user_id = auth.uid()
    )
  )

  and (
    to_account_id is null
    or exists (
      select 1
      from public.accounts
      where accounts.id = to_account_id
        and accounts.user_id = auth.uid()
    )
  )
);


drop policy if exists
  "Users can delete own transactions"
  on public.transactions;

create policy
  "Users can delete own transactions"
on public.transactions
for delete
using (
  auth.uid() = user_id
);



-- =========================================================
-- GAME SESSIONS
-- =========================================================

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  bankroll_account_id uuid not null
    references public.accounts(id)
    on delete restrict,

  playing_amount numeric(18,2) not null
    check (
      playing_amount > 0
    ),

  game_type text not null
    check (
      char_length(trim(game_type)) > 0
    ),

  note text,

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'completed'
      )
    ),

  result_type text
    check (
      result_type is null
      or result_type in (
        'win',
        'loss',
        'even'
      )
    ),

  result_amount numeric(18,2)
    check (
      result_amount is null
      or result_amount >= 0
    ),

  started_at timestamptz not null
    default now(),

  ended_at timestamptz,

  created_at timestamptz not null
    default now(),

  constraint game_sessions_result_state_check
  check (
    (
      status = 'active'
      and result_type is null
      and result_amount is null
      and ended_at is null
    )
    or
    (
      status = 'completed'
      and result_type is not null
      and result_amount is not null
      and ended_at is not null
    )
  ),

  constraint game_sessions_even_result_check
  check (
    result_type <> 'even'
    or result_amount = 0
  ),

  constraint game_sessions_loss_limit_check
  check (
    result_type <> 'loss'
    or result_amount <= playing_amount
  )
);


create index if not exists game_sessions_user_id_idx
  on public.game_sessions(user_id);


create index if not exists game_sessions_started_at_idx
  on public.game_sessions(user_id, started_at desc);


create index if not exists game_sessions_bankroll_account_id_idx
  on public.game_sessions(bankroll_account_id);


create unique index if not exists
  game_sessions_one_active_per_user_idx
on public.game_sessions(user_id)
where status = 'active';


alter table public.game_sessions
  enable row level security;


drop policy if exists
  "Users can view own game sessions"
  on public.game_sessions;

create policy
  "Users can view own game sessions"
on public.game_sessions
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own game sessions"
  on public.game_sessions;

create policy
  "Users can create own game sessions"
on public.game_sessions
for insert
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.accounts
    where accounts.id = bankroll_account_id
      and accounts.user_id = auth.uid()
  )
);


drop policy if exists
  "Users can update own game sessions"
  on public.game_sessions;

create policy
  "Users can update own game sessions"
on public.game_sessions
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.accounts
    where accounts.id = bankroll_account_id
      and accounts.user_id = auth.uid()
  )
);


drop policy if exists
  "Users can delete own game sessions"
  on public.game_sessions;

create policy
  "Users can delete own game sessions"
on public.game_sessions
for delete
using (
  auth.uid() = user_id
);



-- =========================================================
-- LOAN PEOPLE
-- =========================================================

create table if not exists public.loan_people (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  name text not null
    check (
      char_length(trim(name)) > 0
    ),

  created_at timestamptz not null
    default now()
);


create index if not exists loan_people_user_id_idx
  on public.loan_people(user_id);


create unique index if not exists
  loan_people_user_name_unique_idx
on public.loan_people(
  user_id,
  lower(trim(name))
);


alter table public.loan_people
  enable row level security;


drop policy if exists
  "Users can view own loan people"
  on public.loan_people;

create policy
  "Users can view own loan people"
on public.loan_people
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own loan people"
  on public.loan_people;

create policy
  "Users can create own loan people"
on public.loan_people
for insert
with check (
  auth.uid() = user_id
);


drop policy if exists
  "Users can update own loan people"
  on public.loan_people;

create policy
  "Users can update own loan people"
on public.loan_people
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


drop policy if exists
  "Users can delete own loan people"
  on public.loan_people;

create policy
  "Users can delete own loan people"
on public.loan_people
for delete
using (
  auth.uid() = user_id
);



-- =========================================================
-- LOANS
-- =========================================================

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  person_id uuid not null
    references public.loan_people(id)
    on delete restrict,

  source_account_id uuid not null
    references public.accounts(id)
    on delete restrict,

  game_session_id uuid
    references public.game_sessions(id)
    on delete set null,

  principal_amount numeric(18,2) not null
    check (
      principal_amount > 0
    ),

  note text,

  lent_at timestamptz not null
    default now(),

  due_date date,

  created_at timestamptz not null
    default now()
);


create index if not exists loans_user_id_idx
  on public.loans(user_id);


create index if not exists loans_person_id_idx
  on public.loans(person_id);


create index if not exists loans_source_account_id_idx
  on public.loans(source_account_id);


create index if not exists loans_game_session_id_idx
  on public.loans(game_session_id);


create index if not exists loans_lent_at_idx
  on public.loans(user_id, lent_at desc);


alter table public.loans
  enable row level security;


drop policy if exists
  "Users can view own loans"
  on public.loans;

create policy
  "Users can view own loans"
on public.loans
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own loans"
  on public.loans;

create policy
  "Users can create own loans"
on public.loans
for insert
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.loan_people
    where loan_people.id = person_id
      and loan_people.user_id = auth.uid()
  )

  and exists (
    select 1
    from public.accounts
    where accounts.id = source_account_id
      and accounts.user_id = auth.uid()
  )

  and (
    game_session_id is null
    or exists (
      select 1
      from public.game_sessions
      where game_sessions.id = game_session_id
        and game_sessions.user_id = auth.uid()
    )
  )
);


drop policy if exists
  "Users can update own loans"
  on public.loans;

create policy
  "Users can update own loans"
on public.loans
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.loan_people
    where loan_people.id = person_id
      and loan_people.user_id = auth.uid()
  )

  and exists (
    select 1
    from public.accounts
    where accounts.id = source_account_id
      and accounts.user_id = auth.uid()
  )

  and (
    game_session_id is null
    or exists (
      select 1
      from public.game_sessions
      where game_sessions.id = game_session_id
        and game_sessions.user_id = auth.uid()
    )
  )
);


drop policy if exists
  "Users can delete own loans"
  on public.loans;

create policy
  "Users can delete own loans"
on public.loans
for delete
using (
  auth.uid() = user_id
);



-- =========================================================
-- LOAN REPAYMENTS
-- =========================================================

create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  loan_id uuid not null
    references public.loans(id)
    on delete cascade,

  to_account_id uuid not null
    references public.accounts(id)
    on delete restrict,

  amount numeric(18,2) not null
    check (
      amount > 0
    ),

  note text,

  repaid_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now()
);


create index if not exists loan_repayments_user_id_idx
  on public.loan_repayments(user_id);


create index if not exists loan_repayments_loan_id_idx
  on public.loan_repayments(loan_id);


create index if not exists loan_repayments_to_account_id_idx
  on public.loan_repayments(to_account_id);


create index if not exists loan_repayments_repaid_at_idx
  on public.loan_repayments(user_id, repaid_at desc);


alter table public.loan_repayments
  enable row level security;


drop policy if exists
  "Users can view own loan repayments"
  on public.loan_repayments;

create policy
  "Users can view own loan repayments"
on public.loan_repayments
for select
using (
  auth.uid() = user_id
);


drop policy if exists
  "Users can create own loan repayments"
  on public.loan_repayments;

create policy
  "Users can create own loan repayments"
on public.loan_repayments
for insert
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.loans
    where loans.id = loan_id
      and loans.user_id = auth.uid()
  )

  and exists (
    select 1
    from public.accounts
    where accounts.id = to_account_id
      and accounts.user_id = auth.uid()
  )
);


drop policy if exists
  "Users can update own loan repayments"
  on public.loan_repayments;

create policy
  "Users can update own loan repayments"
on public.loan_repayments
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id

  and exists (
    select 1
    from public.loans
    where loans.id = loan_id
      and loans.user_id = auth.uid()
  )

  and exists (
    select 1
    from public.accounts
    where accounts.id = to_account_id
      and accounts.user_id = auth.uid()
  )
);


drop policy if exists
  "Users can delete own loan repayments"
  on public.loan_repayments;

create policy
  "Users can delete own loan repayments"
on public.loan_repayments
for delete
using (
  auth.uid() = user_id
);


-- =========================================================
-- NOTES
-- =========================================================
--
-- Lending is intentionally NOT represented as an expense.
--
-- Loan:
--   source account decreases
--   outstanding lending asset increases
--   net worth stays unchanged
--
-- Repayment:
--   destination account increases
--   outstanding lending asset decreases
--   net worth stays unchanged
--
-- Game P&L is also separate from normal income/expense.
--
-- IMPORTANT:
-- Cumulative loan repayments are currently validated by the
-- Zenith application layer. A future database RPC/transaction
-- should enforce:
--
--   total repayments <= principal amount
--
-- atomically at database level.
--
-- =========================================================