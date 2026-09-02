import {
  SessionForm,
} from "@/components/sessions/session-form";

import {
  calculateAccountBalances,
  type FinanceAccount,
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

type SessionAccount =
  FinanceAccount & {
    name:
      string;

    archived_at:
      | string
      | null;
  };

export default async function NewSessionPage() {
  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
    gameSessionsResult,
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
          bankroll_account_id,
          status,
          result_type,
          result_amount,
          started_at,
          ended_at
        `),

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
    gameSessionsResult.error ??
    loansResult.error ??
    repaymentsResult.error ??
    borrowingsResult.error ??
    borrowingRepaymentsResult.error;

  if (
    error
  ) {
    return (
      <div>
        <p
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Game
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Start Session
        </h1>

        <p
          className="mt-4 text-sm"
          style={{
            color:
              "var(--negative)",
          }}
        >
          Could not load
          accounts:{" "}
          {error.message}
        </p>
      </div>
    );
  }

  /*
    Every account remains part of historical
    balance calculation, including archived
    accounts.
  */
  const accounts =
    (accountsResult.data ??
      []) as SessionAccount[];

  const accountBalances =
    calculateAccountBalances(
      accounts,

      (transactionsResult.data ??
        []) as FinanceTransaction[],

      (gameSessionsResult.data ??
        []) as FinanceGameSession[],

      (loansResult.data ??
        []) as FinanceLoan[],

      (repaymentsResult.data ??
        []) as FinanceLoanRepayment[],

      (borrowingsResult.data ??
        []) as FinanceBorrowing[],

      (borrowingRepaymentsResult.data ??
        []) as FinanceBorrowingRepayment[]
    );

  /*
    Archived accounts remain in calculations
    but cannot be selected for new movement.
  */
  const activeAccounts =
    accounts.filter(
      (
        account
      ) =>
        account.archived_at ===
        null
    );

  const bankrollAccounts =
    activeAccounts
      .filter(
        (
          account
        ) =>
          account.account_type ===
          "game_bankroll"
      )
      .map(
        (
          account
        ) => ({
          id:
            account.id,

          name:
            account.name,

          balanceCents:
            (
              accountBalances.get(
                account.id
              ) ??
              BigInt(0)
            ).toString(),
        })
      );

  /*
    Cash, Bank, Wallet and Other accounts
    may fund the Game Bankroll.

    Their displayed balance now includes:

      owned money
      + borrowed money received
      - borrowing repayments

    This is correct because the money is
    genuinely available to play with.

    Net worth will separately subtract the
    outstanding debt.
  */
  const fundingAccounts =
    activeAccounts
      .filter(
        (
          account
        ) =>
          account.account_type !==
          "game_bankroll"
      )
      .map(
        (
          account
        ) => ({
          id:
            account.id,

          name:
            account.name,

          balanceCents:
            (
              accountBalances.get(
                account.id
              ) ??
              BigInt(0)
            ).toString(),
        })
      );

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Game
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Start Session
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        Fund today&apos;s
        bankroll and start
        playing.
      </p>

      <SessionForm
        fundingAccounts={
          fundingAccounts
        }
        bankrollAccounts={
          bankrollAccounts
        }
      />
    </div>
  );
}