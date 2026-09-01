/*
  Zenith Finance
  Safe Lending Editing

  Adds safe RPCs for:
  - editing a loan
  - deleting a loan
  - editing a repayment
  - deleting a repayment

  Rules:
  - user can only manage their own lending data
  - loan principal must stay above total repayments
  - repayments can never exceed principal
  - changing a lending account requires an active account
  - archived historical accounts can remain attached
  - archived-account money movement cannot be changed
  - loan deletion is blocked once repayments exist
*/


/* =========================================================
   REPAYMENT TOTAL PROTECTION

   This protects both:
   - the new UI we are about to build
   - existing direct repayment inserts

   Even if two requests happen close together,
   repayments cannot exceed the loan principal.
   ========================================================= */

create or replace function public.validate_loan_repayment_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal numeric;
  v_other_repayments numeric;
begin
  if new.user_id is null then
    raise exception
      'Repayment user is required.';
  end if;

  if new.amount is null
    or new.amount <= 0
  then
    raise exception
      'Repayment amount must be greater than 0.';
  end if;


  /*
    A repayment must always remain attached
    to the same loan after it has been created.
  */
  if TG_OP = 'UPDATE'
    and new.loan_id is distinct from old.loan_id
  then
    raise exception
      'A repayment cannot be moved to another loan.';
  end if;


  /*
    Lock the loan while validating the total.
    This prevents concurrent repayments from
    both passing the outstanding-balance check.
  */
  select
    principal_amount
  into
    v_principal
  from public.loans
  where
    id = new.loan_id
    and user_id = new.user_id
  for update;

  if not found then
    raise exception
      'Loan not found.';
  end if;


  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_other_repayments
  from public.loan_repayments
  where
    loan_id = new.loan_id
    and user_id = new.user_id
    and (
      TG_OP = 'INSERT'
      or id <> old.id
    );


  if
    v_other_repayments
    + new.amount
    >
    v_principal
  then
    raise exception
      'Total repayments cannot be greater than the loan principal.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  validate_loan_repayment_total_trigger
on public.loan_repayments;


create trigger
  validate_loan_repayment_total_trigger
before insert or update
on public.loan_repayments
for each row
execute function
  public.validate_loan_repayment_total();


/* =========================================================
   SAFE LOAN UPDATE
   ========================================================= */

create or replace function public.update_manual_loan(
  p_loan_id uuid,
  p_person_name text,
  p_source_account_id uuid,
  p_principal_amount numeric,
  p_due_date date,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_loan public.loans%rowtype;

  v_clean_person_name text;

  v_person_id uuid;

  v_total_repaid numeric :=
    0;

  v_new_source_balance numeric :=
    0;

  v_extra_needed numeric :=
    0;

  v_old_source_archived boolean :=
    false;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  /*
    Validate basic values.
  */
  v_clean_person_name :=
    trim(
      coalesce(
        p_person_name,
        ''
      )
    );

  if v_clean_person_name = '' then
    raise exception
      'Person name is required.';
  end if;


  if p_source_account_id is null then
    raise exception
      'Source account is required.';
  end if;


  if p_principal_amount is null
    or p_principal_amount <= 0
  then
    raise exception
      'Loan amount must be greater than 0.';
  end if;


  if
    round(
      p_principal_amount,
      2
    ) <>
    p_principal_amount
  then
    raise exception
      'Loan amount cannot have more than 2 decimal places.';
  end if;


  /*
    Lock the loan while editing it.
  */
  select *
  into v_loan
  from public.loans
  where
    id = p_loan_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception
      'Loan not found.';
  end if;


  /*
    Total already repaid.

    New principal can never be lower
    than money that has already returned.
  */
  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_total_repaid
  from public.loan_repayments
  where
    loan_id = v_loan.id
    and user_id = v_user_id;


  if
    p_principal_amount <
    v_total_repaid
  then
    raise exception
      'Loan amount cannot be less than the amount already repaid.';
  end if;


  /*
    If money-related fields are changing,
    archived accounts need special protection.

    Metadata such as:
    - person
    - note
    - due date

    may still be corrected on historical loans.
  */
  if
    p_source_account_id
      is distinct from
      v_loan.source_account_id
    or
    p_principal_amount
      is distinct from
      v_loan.principal_amount
  then

    select
      archived_at is not null
    into
      v_old_source_archived
    from public.accounts
    where
      id =
        v_loan.source_account_id
      and user_id =
        v_user_id;


    if
      coalesce(
        v_old_source_archived,
        false
      )
    then
      raise exception
        'Restore the historical source account before changing this loan''s money movement.';
    end if;


    /*
      The new/current source must be active
      whenever its money movement changes.
    */
    perform
      public.zenith_require_active_account(
        v_user_id,
        p_source_account_id
      );


    /*
      Same source account:
      only the increase in principal requires
      additional available money.

      Current account balance already includes
      the existing loan deduction.
    */
    if
      p_source_account_id =
      v_loan.source_account_id
    then

      v_extra_needed :=
        p_principal_amount
        -
        v_loan.principal_amount;


      if v_extra_needed > 0 then

        v_new_source_balance :=
          public.zenith_account_balance(
            p_source_account_id
          );


        if
          v_new_source_balance <
          v_extra_needed
        then
          raise exception
            'Source account does not have enough available money for this larger loan.';
        end if;

      end if;


    /*
      Different source account:
      the new source must be able to fund
      the entire loan principal.
    */
    else

      v_new_source_balance :=
        public.zenith_account_balance(
          p_source_account_id
        );


      if
        v_new_source_balance <
        p_principal_amount
      then
        raise exception
          'New source account does not have enough available money for this loan.';
      end if;

    end if;
  end if;


  /*
    Reuse an existing borrower with the same
    name for this user when possible.
  */
  select
    id
  into
    v_person_id
  from public.loan_people
  where
    user_id =
      v_user_id
    and lower(
      trim(name)
    ) =
    lower(
      v_clean_person_name
    )
  limit 1;


  /*
    Otherwise create the borrower.
  */
  if v_person_id is null then
    begin
      insert into public.loan_people (
        user_id,
        name
      )
      values (
        v_user_id,
        v_clean_person_name
      )
      returning id
      into v_person_id;

    exception
      when unique_violation then

        /*
          If another request created the same
          person at almost the same time,
          simply reuse that row.
        */
        select
          id
        into
          v_person_id
        from public.loan_people
        where
          user_id =
            v_user_id
          and lower(
            trim(name)
          ) =
          lower(
            v_clean_person_name
          )
        limit 1;

    end;
  end if;


  if v_person_id is null then
    raise exception
      'Could not save the borrower.';
  end if;


  update public.loans
  set
    person_id =
      v_person_id,

    source_account_id =
      p_source_account_id,

    principal_amount =
      p_principal_amount,

    due_date =
      p_due_date,

    note =
      nullif(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      )

  where
    id = v_loan.id
    and user_id =
      v_user_id;
end;
$$;


/* =========================================================
   SAFE LOAN DELETE
   ========================================================= */

create or replace function public.delete_manual_loan(
  p_loan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_loan public.loans%rowtype;

  v_source_archived boolean :=
    false;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  select *
  into v_loan
  from public.loans
  where
    id = p_loan_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception
      'Loan not found.';
  end if;


  /*
    Once repayments exist, deleting the whole
    loan would also destroy the meaning of those
    repayment records.

    Correct/delete repayments first.
  */
  if exists (
    select 1
    from public.loan_repayments
    where
      loan_id = v_loan.id
      and user_id = v_user_id
  ) then
    raise exception
      'Delete the loan repayments first before deleting this loan.';
  end if;


  /*
    Removing a loan restores its principal
    to the historical source account.

    An archived account must remain at zero,
    so restore it first.
  */
  select
    archived_at is not null
  into
    v_source_archived
  from public.accounts
  where
    id =
      v_loan.source_account_id
    and user_id =
      v_user_id;


  if
    coalesce(
      v_source_archived,
      false
    )
  then
    raise exception
      'Restore the source account before deleting this loan.';
  end if;


  delete from public.loans
  where
    id = v_loan.id
    and user_id =
      v_user_id;
end;
$$;


/* =========================================================
   SAFE REPAYMENT UPDATE
   ========================================================= */

create or replace function public.update_manual_repayment(
  p_repayment_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_repayment public.loan_repayments%rowtype;

  v_principal numeric;

  v_other_repayments numeric :=
    0;

  v_old_account_archived boolean :=
    false;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  if p_to_account_id is null then
    raise exception
      'Receiving account is required.';
  end if;


  if p_amount is null
    or p_amount <= 0
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


  /*
    Lock the repayment.
  */
  select *
  into v_repayment
  from public.loan_repayments
  where
    id =
      p_repayment_id
    and user_id =
      v_user_id
  for update;

  if not found then
    raise exception
      'Repayment not found.';
  end if;


  /*
    Lock its parent loan too.
  */
  select
    principal_amount
  into
    v_principal
  from public.loans
  where
    id =
      v_repayment.loan_id
    and user_id =
      v_user_id
  for update;

  if not found then
    raise exception
      'Loan not found.';
  end if;


  /*
    If amount/account changes, money movement
    changes.

    An archived historical receiving account
    must first be restored.
  */
  if
    p_to_account_id
      is distinct from
      v_repayment.to_account_id
    or
    p_amount
      is distinct from
      v_repayment.amount
  then

    select
      archived_at is not null
    into
      v_old_account_archived
    from public.accounts
    where
      id =
        v_repayment.to_account_id
      and user_id =
        v_user_id;


    if
      coalesce(
        v_old_account_archived,
        false
      )
    then
      raise exception
        'Restore the historical receiving account before changing this repayment''s money movement.';
    end if;


    perform
      public.zenith_require_active_account(
        v_user_id,
        p_to_account_id
      );

  end if;


  /*
    Exclude this repayment and calculate
    everything else already returned.
  */
  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_other_repayments
  from public.loan_repayments
  where
    loan_id =
      v_repayment.loan_id
    and user_id =
      v_user_id
    and id <>
      v_repayment.id;


  if
    v_other_repayments
    + p_amount
    >
    v_principal
  then
    raise exception
      'Total repayments cannot be greater than the loan principal.';
  end if;


  update public.loan_repayments
  set
    to_account_id =
      p_to_account_id,

    amount =
      p_amount,

    note =
      nullif(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      )

  where
    id =
      v_repayment.id
    and user_id =
      v_user_id;
end;
$$;


/* =========================================================
   SAFE REPAYMENT DELETE
   ========================================================= */

create or replace function public.delete_manual_repayment(
  p_repayment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid :=
    auth.uid();

  v_repayment public.loan_repayments%rowtype;

  v_account_archived boolean :=
    false;
begin
  if v_user_id is null then
    raise exception
      'Not authenticated.';
  end if;


  select *
  into v_repayment
  from public.loan_repayments
  where
    id =
      p_repayment_id
    and user_id =
      v_user_id
  for update;

  if not found then
    raise exception
      'Repayment not found.';
  end if;


  /*
    Deleting a repayment removes money from
    its destination account.

    Do not alter an archived zero-balance
    account without restoring it first.
  */
  select
    archived_at is not null
  into
    v_account_archived
  from public.accounts
  where
    id =
      v_repayment.to_account_id
    and user_id =
      v_user_id;


  if
    coalesce(
      v_account_archived,
      false
    )
  then
    raise exception
      'Restore the receiving account before deleting this repayment.';
  end if;


  delete from public.loan_repayments
  where
    id =
      v_repayment.id
    and user_id =
      v_user_id;
end;
$$;


/* =========================================================
   DELETE SAFEGUARDS

   These protect direct database deletes too,
   not only the RPCs above.
   ========================================================= */

create or replace function public.protect_loan_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.loan_repayments
    where
      loan_id = old.id
      and user_id = old.user_id
  ) then
    raise exception
      'Delete the loan repayments first before deleting this loan.';
  end if;


  if
    public.zenith_account_is_archived(
      old.user_id,
      old.source_account_id
    )
  then
    raise exception
      'Restore the source account before deleting this loan.';
  end if;


  return old;
end;
$$;


drop trigger if exists
  protect_loan_delete_trigger
on public.loans;


create trigger
  protect_loan_delete_trigger
before delete
on public.loans
for each row
execute function
  public.protect_loan_delete();


create or replace function public.protect_repayment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    public.zenith_account_is_archived(
      old.user_id,
      old.to_account_id
    )
  then
    raise exception
      'Restore the receiving account before deleting this repayment.';
  end if;


  return old;
end;
$$;


drop trigger if exists
  protect_repayment_delete_trigger
on public.loan_repayments;


create trigger
  protect_repayment_delete_trigger
before delete
on public.loan_repayments
for each row
execute function
  public.protect_repayment_delete();


/* =========================================================
   PERMISSIONS
   ========================================================= */

revoke all
on function public.update_manual_loan(
  uuid,
  text,
  uuid,
  numeric,
  date,
  text
)
from public;


revoke all
on function public.delete_manual_loan(
  uuid
)
from public;


revoke all
on function public.update_manual_repayment(
  uuid,
  uuid,
  numeric,
  text
)
from public;


revoke all
on function public.delete_manual_repayment(
  uuid
)
from public;


grant execute
on function public.update_manual_loan(
  uuid,
  text,
  uuid,
  numeric,
  date,
  text
)
to authenticated;


grant execute
on function public.delete_manual_loan(
  uuid
)
to authenticated;


grant execute
on function public.update_manual_repayment(
  uuid,
  uuid,
  numeric,
  text
)
to authenticated;


grant execute
on function public.delete_manual_repayment(
  uuid
)
to authenticated;


/*
  Make the new RPCs visible immediately
  through Supabase/PostgREST.
*/
notify pgrst, 'reload schema';