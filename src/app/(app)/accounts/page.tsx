import Link from "next/link";

import {
  Banknote,
  Gamepad2,
  HandCoins,
  Landmark,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import {
  calculateAccountBalances,
  totalBalanceFromAccounts,
  totalNetWorth,
  totalOutstandingLoans,
  type FinanceGameSession,
  type FinanceLoan,
  type FinanceLoanRepayment,
  type FinanceTransaction,
} from "@/lib/finance";

import {
  formatMoneyFromCents,
} from "@/lib/money";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: string | number;
  created_at: string;
};

export default async function AccountsPage() {
  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
    gameSessionsResult,
    loansResult,
    repaymentsResult,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select(`
        id,
        name,
        account_type,
        opening_balance,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: true,
        }
      ),

    supabase
      .from("transactions")
      .select(`
        transaction_type,
        amount,
        from_account_id,
        to_account_id,
        occurred_at
      `),

    supabase
      .from("game_sessions")
      .select(`
        bankroll_account_id,
        status,
        result_type,
        result_amount,
        started_at,
        ended_at
      `),

    supabase
      .from("loans")
      .select(`
        id,
        person_id,
        source_account_id,
        principal_amount,
        game_session_id,
        note,
        lent_at,
        due_date
      `),

    supabase
      .from("loan_repayments")
      .select(`
        id,
        loan_id,
        to_account_id,
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
    repaymentsResult.error;

  if (error) {
    return (
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Money
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Accounts
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
          Could not load account
          balances:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const typedAccounts =
    (accountsResult.data ??
      []) as Account[];

  const typedTransactions =
    (transactionsResult.data ??
      []) as FinanceTransaction[];

  const typedGameSessions =
    (gameSessionsResult.data ??
      []) as FinanceGameSession[];

  const typedLoans =
    (loansResult.data ??
      []) as FinanceLoan[];

  const typedRepayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  /*
    Available account balances:

    Opening balance
    + Income
    - Expenses
    +/- Transfers
    +/- Game P&L
    - Money lent
    + Loan repayments
  */
  const accountBalances =
    calculateAccountBalances(
      typedAccounts,
      typedTransactions,
      typedGameSessions,
      typedLoans,
      typedRepayments
    );

  /*
    Available balance is money physically
    available inside the user's accounts.
  */
  const availableBalance =
    totalBalanceFromAccounts(
      accountBalances
    );

  /*
    Money currently outside the user's
    accounts but still owed back to them.
  */
  const outstandingLending =
    totalOutstandingLoans(
      typedLoans,
      typedRepayments
    );

  /*
    Net worth includes both available money
    and money that is currently lent out.
  */
  const netWorth =
    totalNetWorth(
      accountBalances,
      typedLoans,
      typedRepayments
    );

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Money
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Accounts
          </h1>
        </div>

        <Link
          href="/accounts/new"
          className="flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          <Plus
            size={14}
          />

          Add
        </Link>
      </div>

      <p
        className="mt-3 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Cash, bank, wallet,
        game bankroll, and
        lending in one place.
      </p>

      {typedAccounts.length ===
      0 ? (
        <EmptyAccounts />
      ) : (
        <>
          {/* Net worth */}
          <section
            className="mt-8 rounded-[var(--radius-lg)] p-5"
            style={{
              backgroundColor:
                "var(--surface)",
              border:
                "1px solid var(--border)",
            }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Net worth
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              {formatBalance(
                netWorth
              )}
            </p>

            <div
              className="mt-5 grid grid-cols-2 gap-4 border-t pt-4"
              style={{
                borderColor:
                  "var(--border)",
              }}
            >
              <div>
                <p
                  className="text-[9px] font-medium uppercase tracking-[0.12em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Available
                </p>

                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatBalance(
                    availableBalance
                  )}
                </p>
              </div>

              <Link
                href="/lending"
                className="block"
              >
                <p
                  className="text-[9px] font-medium uppercase tracking-[0.12em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Lent out
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <HandCoins
                    size={13}
                    style={{
                      color:
                        outstandingLending >
                        BigInt(0)
                          ? "var(--primary)"
                          : "var(--foreground-muted)",
                    }}
                  />

                  <p
                    className="text-sm font-semibold tabular-nums"
                    style={{
                      color:
                        outstandingLending >
                        BigInt(0)
                          ? "var(--primary)"
                          : "var(--foreground)",
                    }}
                  >
                    {formatBalance(
                      outstandingLending
                    )}
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* Account list */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2
                className="text-[10px] font-medium uppercase tracking-[0.14em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Your accounts
              </h2>

              <span
                className="text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {
                  typedAccounts.length
                }{" "}
                total
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {typedAccounts.map(
                (account) => {
                  const currentBalance =
                    accountBalances.get(
                      account.id
                    ) ??
                    BigInt(0);

                  return (
                    <AccountCard
                      key={
                        account.id
                      }
                      account={
                        account
                      }
                      currentBalance={
                        currentBalance
                      }
                    />
                  );
                }
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AccountCard({
  account,
  currentBalance,
}: {
  account: Account;
  currentBalance: bigint;
}) {
  const isBankroll =
    account.account_type ===
    "game_bankroll";

  const balanceColor =
    currentBalance <
    BigInt(0)
      ? "var(--negative)"
      : "var(--foreground)";

  return (
    <div
      className="flex items-center gap-4 rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor:
          "var(--surface)",
        border:
          "1px solid var(--border)",
      }}
    >
      <AccountIcon
        type={
          account.account_type
        }
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {account.name}
        </p>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {formatAccountType(
            account.account_type
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className="text-sm font-semibold tabular-nums"
          style={{
            color:
              balanceColor,
          }}
        >
          {formatBalance(
            currentBalance
          )}
        </p>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              isBankroll
                ? "var(--primary)"
                : "var(--foreground-muted)",
          }}
        >
          {isBankroll
            ? "Current bankroll"
            : "Available balance"}
        </p>
      </div>
    </div>
  );
}

function AccountIcon({
  type,
}: {
  type: string;
}) {
  let icon =
    <WalletCards
      size={17}
    />;

  let color =
    "var(--foreground-secondary)";

  if (
    type === "cash"
  ) {
    icon =
      <Banknote
        size={17}
      />;
  }

  if (
    type === "bank"
  ) {
    icon =
      <Landmark
        size={17}
      />;
  }

  if (
    type === "wallet"
  ) {
    icon =
      <Smartphone
        size={17}
      />;
  }

  if (
    type ===
    "game_bankroll"
  ) {
    icon =
      <Gamepad2
        size={17}
      />;

    color =
      "var(--primary)";
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        color,
      }}
    >
      {icon}
    </div>
  );
}

function EmptyAccounts() {
  return (
    <div
      className="mt-8 flex flex-col items-center rounded-[var(--radius-lg)] px-6 py-12 text-center"
      style={{
        backgroundColor:
          "var(--surface)",
        border:
          "1px solid var(--border)",
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          color:
            "var(--foreground-secondary)",
        }}
      >
        <WalletCards
          size={20}
        />
      </div>

      <h2 className="mt-4 text-sm font-semibold">
        No accounts yet
      </h2>

      <p
        className="mt-2 max-w-xs text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Add your first account
        to start tracking your
        money in Zenith.
      </p>

      <Link
        href="/accounts/new"
        className="mt-5 flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold"
        style={{
          backgroundColor:
            "var(--primary)",
          color:
            "var(--primary-foreground)",
        }}
      >
        <Plus
          size={15}
        />

        Add Account
      </Link>
    </div>
  );
}

function formatBalance(
  value: bigint
) {
  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      -value
    )}`;
  }

  return `NPR ${formatMoneyFromCents(
    value
  )}`;
}

function formatAccountType(
  type: string
) {
  if (
    type ===
    "game_bankroll"
  ) {
    return "Game Bankroll";
  }

  if (
    type === "cash"
  ) {
    return "Cash";
  }

  if (
    type === "bank"
  ) {
    return "Bank";
  }

  if (
    type === "wallet"
  ) {
    return "Wallet";
  }

  return type
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}