-- =========================================================
-- Zenith Finance
-- Monthly category budgets
-- =========================================================
--
-- A budget defines one recurring monthly spending limit
-- for one expense category.
--
-- Example:
--
--   Category: Food
--   Monthly limit: NPR 10,000
--
-- "Spent" is NOT stored here.
-- Zenith calculates spending from actual expense
-- transactions for the selected Kathmandu month.
--
-- Income, transfers, lending, repayments and Game P&L
-- never count toward budgets.
-- =========================================================


create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  category text not null
    check (
      char_length(trim(category)) > 0
    ),

  monthly_limit numeric(18,2) not null
    check (
      monthly_limit > 0
    ),

  created_at timestamptz not null
    default now()
);


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists budgets_user_id_idx
  on public.budgets(user_id);


-- One active monthly budget per category per user.
--
-- This treats:
--   Food
--   food
--   " Food "
--
-- as the same category.
create unique index if not exists
  budgets_user_category_unique_idx
on public.budgets(
  user_id,
  lower(trim(category))
);


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.budgets
  enable row level security;


-- READ

drop policy if exists
  "Users can view own budgets"
  on public.budgets;

create policy
  "Users can view own budgets"
on public.budgets
for select
using (
  auth.uid() = user_id
);


-- CREATE

drop policy if exists
  "Users can create own budgets"
  on public.budgets;

create policy
  "Users can create own budgets"
on public.budgets
for insert
with check (
  auth.uid() = user_id
);


-- UPDATE

drop policy if exists
  "Users can update own budgets"
  on public.budgets;

create policy
  "Users can update own budgets"
on public.budgets
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


-- DELETE

drop policy if exists
  "Users can delete own budgets"
  on public.budgets;

create policy
  "Users can delete own budgets"
on public.budgets
for delete
using (
  auth.uid() = user_id
);


-- =========================================================
-- ACCOUNTING RULES
-- =========================================================
--
-- Budget spending is calculated only from:
--
--   transactions.transaction_type = 'expense'
--
-- and matching:
--
--   lower(trim(transactions.category))
--   =
--   lower(trim(budgets.category))
--
-- for the selected Asia/Kathmandu month.
--
-- These NEVER count as budget spending:
--
--   income
--   transfers
--   loans
--   loan repayments
--   Game Bankroll funding
--   Game P&L
--   opening balances
--
-- =========================================================