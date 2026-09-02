import {
  TransactionForm,
} from "@/components/transactions/transaction-form";

import {
  calculateAccountBalances,
  type FinanceBorrowing,
  type FinanceBorrowingRepayment,
  type FinanceGameSession,
  type FinanceLoan,
  type FinanceLoanRepayment,
  type FinanceTransaction,
} from "@/lib/finance";

import {
  createClient,
} from "@/lib/supabase/server";

type QuickAddPageProps = {
  searchParams: Promise<{
    type?:
      | string
      | string[];

    session?:
      | string
      | string[];
  }>;
};

type QuickAddAccount = {
  id: string;
  name: string;
  account_type: string;

  opening_balance:
    | string
    | number;

  created_at: string;

  archived_at:
    | string
    | null;
};

type QuickAddSession =
  FinanceGameSession & {
    id: string;

    playing_amount:
      | string
      | number;

    game_type:
      string;

    note:
      | string
      | null;

    started_at:
      string;

    ended_at:
      | string
      | null;
  };

export default async function QuickAddPage({
  searchParams,
}: QuickAddPageProps) {
  const supabase =
    await createClient();

  const params =
    await searchParams;

  const requestedType =
    firstSearchParam(
      params.type
    );

  const requestedSessionId =
    firstSearchParam(
      params.session
    );

  const [
    accountsResult,
    transactionsResult,
    sessionsResult,
    loansResult,
    repaymentsResult,
    borrowingsResult,
    borrowingRepaymentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name,
          account_type,
          opening_balance,
          created_at,
          archived_at
        `)
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "transactions"
        )
        .select(`
          transaction_type,
          amount,
          from_account_id,
          to_account_id,
          occurred_at
        `),

      supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          bankroll_account_id,
          playing_amount,
          game_type,
          note,
          status,
          result_type,
          result_amount,
          started_at,
          ended_at
        `)
        .order(
          "started_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "loans"
        )
        .select(`
          id,
          person_id,
          source_account_id,
          principal_amount,
          game_session_id,
          claim_type,
          note,
          lent_at,
          due_date
        `),

      supabase
        .from(
          "loan_repayments"
        )
        .select(`
          id,
          loan_id,
          to_account_id,
          amount,
          note,
          repaid_at
        `),

      supabase
        .from(
          "borrowings"
        )
        .select(`
          id,
          person_id,
          to_account_id,
          principal_amount,
          game_session_id,
          note,
          borrowed_at,
          due_date
        `),

      supabase
        .from(
          "borrowing_repayments"
        )
        .select(`
          id,
          borrowing_id,
          from_account_id,
          amount,
          note,
          repaid_at
        `),
    ]);

  const error =
    accountsResult.error ??
    transactionsResult.error ??
    sessionsResult.error ??
    loansResult.error ??
    repaymentsResult.error ??
    borrowingsResult.error ??
    borrowingRepaymentsResult.error;

  if (
    error
  ) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Quick Add
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor:
              "var(--negative-soft)",

            color:
              "var(--negative)",
          }}
        >
          Could not load Quick Add:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const accounts =
    (accountsResult.data ??
      []) as QuickAddAccount[];

  const transactions =
    (transactionsResult.data ??
      []) as FinanceTransaction[];

  const sessions =
    (sessionsResult.data ??
      []) as QuickAddSession[];

  const loans =
    (loansResult.data ??
      []) as FinanceLoan[];

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  const borrowings =
    (borrowingsResult.data ??
      []) as FinanceBorrowing[];

  const borrowingRepayments =
    (borrowingRepaymentsResult.data ??
      []) as FinanceBorrowingRepayment[];

  /*
    Balances used inside Quick Add must match
    Dashboard, Accounts and Game Sessions.

    Borrowed money received into an account
    is available money.

    Borrowing repayments reduce it.
  */
  const balances =
    calculateAccountBalances(
      accounts,
      transactions,
      sessions,
      loans,
      repayments,
      borrowings,
      borrowingRepayments
    );

  /*
    Archived accounts remain part of historical
    calculations but cannot be selected for new
    money movement.
  */
  const activeAccounts =
    accounts.filter(
      (
        account
      ) =>
        account.archived_at ===
        null
    );

  const formAccounts =
    activeAccounts.map(
      (
        account
      ) => ({
        id:
          account.id,

        name:
          account.name,

        account_type:
          account.account_type,

        balanceCents:
          (
            balances.get(
              account.id
            ) ??
            BigInt(0)
          ).toString(),
      })
    );

  const activeSessions =
    sessions
      .filter(
        (
          session
        ) =>
          session.status ===
          "active"
      )
      .map(
        (
          session
        ) => ({
          id:
            session.id,

          gameType:
            session.game_type,

          startedAt:
            session.started_at,
        })
      );

  const initialEntryType =
    requestedType ===
    "lend"
      ? "lend"
      : undefined;

  const validRequestedSession =
    requestedSessionId &&
    activeSessions.some(
      (
        session
      ) =>
        session.id ===
        requestedSessionId
    )
      ? requestedSessionId
      : "";

  const initialRelatedSessionId =
    initialEntryType ===
    "lend"
      ? validRequestedSession
      : "";

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        New entry
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Quick Add
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        Record income,
        expenses, transfers,
        and money lent.
      </p>

      <TransactionForm
        accounts={
          formAccounts
        }
        activeSessions={
          activeSessions
        }
        initialEntryType={
          initialEntryType
        }
        initialRelatedSessionId={
          initialRelatedSessionId
        }
      />
    </div>
  );
}

function firstSearchParam(
  value:
    | string
    | string[]
    | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}