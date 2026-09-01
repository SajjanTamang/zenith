-- =========================================================
-- Zenith Finance
-- Budget history
-- =========================================================
--
-- Goals:
--
-- 1. Keep the current recurring budget system.
-- 2. Remember the monthly limit that applied historically.
-- 3. Allow a budget to be archived without destroying
--    its historical records.
-- 4. Multiple edits during the same Kathmandu month update
--    that month's version instead of creating duplicates.
--
-- Example:
--
--   August    Food = NPR 10,000
--   September Food = NPR 12,000
--   October   no change
--
-- October therefore continues using NPR 12,000.
-- =========================================================


-- ---------------------------------------------------------
-- SOFT ARCHIVE
-- ---------------------------------------------------------

alter table public.budgets
add column if not exists archived_at timestamptz;


-- The original unique index prevented another budget with
-- the same category even after archiving.
--
-- Replace it with a unique rule that only applies to
-- active budgets.

drop index if exists
  public.budgets_user_category_unique_idx;

create unique index if not exists
  budgets_user_category_active_unique_idx
on public.budgets(
  user_id,
  lower(trim(category))
)
where archived_at is null;


-- ---------------------------------------------------------
-- BUDGET LIMIT HISTORY
-- ---------------------------------------------------------

create table if not exists public.budget_limit_history (
  id uuid primary key
    default gen_random_uuid(),

  budget_id uuid not null
    references public.budgets(id)
    on delete restrict,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  -- Always stored as the first day of a month.
  --
  -- Example:
  --   2026-09-01
  effective_month date not null,

  monthly_limit numeric(18,2) not null
    check (
      monthly_limit > 0
    ),

  created_at timestamptz not null
    default now(),

  unique (
    budget_id,
    effective_month
  )
);


create index if not exists
  budget_limit_history_user_month_idx
on public.budget_limit_history(
  user_id,
  effective_month
);


create index if not exists
  budget_limit_history_budget_month_idx
on public.budget_limit_history(
  budget_id,
  effective_month
);


-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

alter table public.budget_limit_history
enable row level security;


drop policy if exists
  "Users can view own budget history"
  on public.budget_limit_history;

create policy
  "Users can view own budget history"
on public.budget_limit_history
for select
using (
  auth.uid() = user_id
);


-- History is written automatically by the trigger below.
-- The app itself does not directly create, update or delete
-- history rows.


-- ---------------------------------------------------------
-- AUTOMATIC HISTORY TRIGGER
-- ---------------------------------------------------------

create or replace function public.record_budget_limit_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_effective_month date;
begin
  v_effective_month :=
    date_trunc(
      'month',
      now() at time zone 'Asia/Kathmandu'
    )::date;

  -- New budget:
  -- save its first monthly limit.
  if tg_op = 'INSERT' then
    insert into public.budget_limit_history (
      budget_id,
      user_id,
      effective_month,
      monthly_limit
    )
    values (
      new.id,
      new.user_id,
      v_effective_month,
      new.monthly_limit
    )
    on conflict (
      budget_id,
      effective_month
    )
    do update
    set
      monthly_limit =
        excluded.monthly_limit;

    return new;
  end if;


  -- Existing budget:
  -- only create/update history when the limit changed.
  if
    tg_op = 'UPDATE'
    and new.monthly_limit
      is distinct from
        old.monthly_limit
  then
    insert into public.budget_limit_history (
      budget_id,
      user_id,
      effective_month,
      monthly_limit
    )
    values (
      new.id,
      new.user_id,
      v_effective_month,
      new.monthly_limit
    )
    on conflict (
      budget_id,
      effective_month
    )
    do update
    set
      monthly_limit =
        excluded.monthly_limit;
  end if;

  return new;
end;
$$;


drop trigger if exists
  budgets_record_limit_history
  on public.budgets;

create trigger
  budgets_record_limit_history
after insert or update of monthly_limit
on public.budgets
for each row
execute function
  public.record_budget_limit_history();


revoke all
on function public.record_budget_limit_history()
from public;


-- ---------------------------------------------------------
-- SEED EXISTING BUDGETS
-- ---------------------------------------------------------
--
-- Budgets that already existed before this migration need
-- their first history row.
--
-- We use the Kathmandu month in which the budget was
-- originally created.
-- ---------------------------------------------------------

insert into public.budget_limit_history (
  budget_id,
  user_id,
  effective_month,
  monthly_limit
)
select
  b.id,
  b.user_id,

  date_trunc(
    'month',
    b.created_at
      at time zone
        'Asia/Kathmandu'
  )::date,

  b.monthly_limit

from public.budgets b

on conflict (
  budget_id,
  effective_month
)
do nothing;


-- ---------------------------------------------------------
-- PREVENT PHYSICAL CLIENT DELETION
-- ---------------------------------------------------------
--
-- From now on Zenith will archive a budget by setting:
--
--   archived_at = now()
--
-- instead of physically deleting it.
--
-- This keeps its historical monthly data intact.
-- ---------------------------------------------------------

drop policy if exists
  "Users can delete own budgets"
  on public.budgets;