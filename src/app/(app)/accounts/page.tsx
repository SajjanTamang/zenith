import Link from "next/link";

import {
  Archive,
  Banknote,
  ChevronRight,
  Gamepad2,
  HandCoins,
  Landmark,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  calculateAccountBalances,
  totalBalanceFromAccounts,
  totalNetWorth,
  totalOutstandingBorrowings,
  totalOutstandingLoans,
  type FinanceBorrowing,
  type FinanceBorrowingRepayment,
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
  archived_at: string | null;
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
          archived_at,
          created_at
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

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const transactions =
    (transactionsResult.data ??
      []) as FinanceTransaction[];

  const gameSessions =
    (gameSessionsResult.data ??
      []) as FinanceGameSession[];

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

  const activeAccounts =
    accounts.filter(
      (
        account
      ) =>
        account.archived_at ===
        null
    );

  const archivedAccounts =
    accounts.filter(
      (
        account
      ) =>
        account.archived_at !==
        null
    );

  const accountBalances =
    calculateAccountBalances(
      accounts,
      transactions,
      gameSessions,
      loans,
      repayments,
      borrowings,
      borrowingRepayments
    );

  const availableBalance =
    totalBalanceFromAccounts(
      accountBalances
    );

  const outstandingLending =
    totalOutstandingLoans(
      loans,
      repayments
    );

  const outstandingBorrowing =
    totalOutstandingBorrowings(
      borrowings,
      borrowingRepayments
    );

  const netWorth =
    totalNetWorth(
      accountBalances,
      loans,
      repayments,
      borrowings,
      borrowingRepayments
    );

  return (
    <div>
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
        Cash, bank, wallets,
        bankroll, receivables,
        and debt in one place.
      </p>

      {accounts.length ===
      0 ? (
        <EmptyAccounts />
      ) : (
        <>
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
                  Owed to you
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

            <Link
              href="/lending"
              className="mt-4 flex items-center justify-between gap-4 border-t pt-4"
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
                  You owe
                </p>

                <p
                  className="mt-1 text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Outstanding
                  borrowings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    color:
                      outstandingBorrowing >
                      BigInt(0)
                        ? "var(--negative)"
                        : "var(--foreground)",
                  }}
                >
                  {formatBalance(
                    outstandingBorrowing
                  )}
                </p>

                <ChevronRight
                  size={14}
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                />
              </div>
            </Link>
          </section>

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
                  activeAccounts.length
                }{" "}
                active
              </span>
            </div>

            {activeAccounts.length ===
            0 ? (
              <div
                className="mt-3 rounded-[var(--radius-lg)] px-5 py-8 text-center"
                style={{
                  backgroundColor:
                    "var(--surface)",

                  border:
                    "1px solid var(--border)",
                }}
              >
                <p className="text-sm font-semibold">
                  No active accounts
                </p>

                <p
                  className="mt-2 text-xs"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Restore an archived
                  account or add a new
                  one.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {activeAccounts.map(
                  (
                    account
                  ) => (
                    <AccountCard
                      key={
                        account.id
                      }
                      account={
                        account
                      }
                      currentBalance={
                        accountBalances.get(
                          account.id
                        ) ??
                        BigInt(0)
                      }
                      archived={
                        false
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          {archivedAccounts.length >
            0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[10px] font-medium uppercase tracking-[0.14em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Archived
                </h2>

                <span
                  className="text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  {
                    archivedAccounts.length
                  }{" "}
                  archived
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {archivedAccounts.map(
                  (
                    account
                  ) => (
                    <AccountCard
                      key={
                        account.id
                      }
                      account={
                        account
                      }
                      currentBalance={
                        accountBalances.get(
                          account.id
                        ) ??
                        BigInt(0)
                      }
                      archived
                    />
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AccountCard({
  account,
  currentBalance,
  archived,
}: {
  account: Account;
  currentBalance: bigint;
  archived: boolean;
}) {
  const isBankroll =
    account.account_type ===
    "game_bankroll";

  const balanceColor =
    currentBalance <
    BigInt(0)
      ? "var(--negative)"
      : archived
        ? "var(--foreground-muted)"
        : "var(--foreground)";

  return (
    <Link
      href={
        `/accounts/${account.id}`
      }
      className="flex items-center gap-4 rounded-[var(--radius-lg)] p-4 transition hover:brightness-[0.98]"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",

        opacity:
          archived
            ? 0.7
            : 1,
      }}
    >
      {archived ? (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              "var(--surface-secondary)",

            color:
              "var(--foreground-muted)",
          }}
        >
          <Archive
            size={17}
          />
        </div>
      ) : (
        <AccountIcon
          type={
            account.account_type
          }
        />
      )}

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
          {archived
            ? `${formatAccountType(
                account.account_type
              )} • Archived`
            : formatAccountType(
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
              archived
                ? "var(--foreground-muted)"
                : isBankroll
                  ? "var(--primary)"
                  : "var(--foreground-muted)",
          }}
        >
          {archived
            ? "Archived"
            : isBankroll
              ? "Current bankroll"
              : "Available balance"}
        </p>
      </div>

      <ChevronRight
        size={15}
        className="shrink-0"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      />
    </Link>
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
    type ===
    "cash"
  ) {
    icon =
      <Banknote
        size={17}
      />;
  }

  if (
    type ===
    "bank"
  ) {
    icon =
      <Landmark
        size={17}
      />;
  }

  if (
    type ===
    "wallet"
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
    type ===
    "cash"
  ) {
    return "Cash";
  }

  if (
    type ===
    "bank"
  ) {
    return "Bank";
  }

  if (
    type ===
    "wallet"
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