import Link from "next/link";

import {
  Archive,
  ArrowLeft,
  Banknote,
  Gamepad2,
  Landmark,
  LockKeyhole,
  Smartphone,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  AccountArchiveActions,
} from "@/components/accounts/account-archive-actions";

import {
  AccountEditForm,
} from "@/components/accounts/account-edit-form";

import {
  calculateAccountBalances,
  type FinanceGameSession,
  type FinanceLoan,
  type FinanceLoanRepayment,
  type FinanceTransaction,
} from "@/lib/finance";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: string | number;
  created_at: string;

  archived_at:
    | string
    | null;
};

type GameSessionWithId =
  FinanceGameSession & {
    id: string;
  };

export default async function AccountDetailPage({
  params,
}: {
  params:
    Promise<{
      id: string;
    }>;
}) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
    gameSessionsResult,
    loansResult,
    repaymentsResult,
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
    ]);

  const error =
    accountsResult.error ??
    transactionsResult.error ??
    gameSessionsResult.error ??
    loansResult.error ??
    repaymentsResult.error;

  if (
    error
  ) {
    return (
      <div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          <ArrowLeft
            size={14}
          />

          Accounts
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Account
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
          Could not load
          account:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const account =
    accounts.find(
      (
        item
      ) =>
        item.id ===
        id
    );

  if (
    !account
  ) {
    notFound();
  }

  const transactions =
    (transactionsResult.data ??
      []) as FinanceTransaction[];

  const gameSessions =
    (gameSessionsResult.data ??
      []) as GameSessionWithId[];

  const loans =
    (loansResult.data ??
      []) as FinanceLoan[];

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  /*
    IMPORTANT:

    We calculate with ALL accounts,
    including archived accounts.

    Archive only removes an account
    from future account selectors.
    It does not erase history.
  */
  const balances =
    calculateAccountBalances(
      accounts,
      transactions,
      gameSessions,
      loans,
      repayments
    );

  const currentBalance =
    balances.get(
      account.id
    ) ??
    BigInt(0);

  const openingBalance =
    moneyToCents(
      account.opening_balance
    );

  const isGameBankroll =
    account.account_type ===
    "game_bankroll";

  const isArchived =
    account.archived_at !==
    null;

  /*
    An active session using this
    Game Bankroll blocks archiving.
  */
  const hasActiveGameSession =
    isGameBankroll &&
    gameSessions.some(
      (
        session
      ) =>
        session.bankroll_account_id ===
          account.id &&
        session.status ===
          "active"
    );

  return (
    <div>
      <Link
        href="/accounts"
        className="inline-flex items-center gap-2 text-xs font-medium"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        <ArrowLeft
          size={14}
        />

        Accounts
      </Link>

      {/* Header */}
      <div className="mt-5 flex items-start gap-4">
        <AccountIcon
          type={
            account.account_type
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Account
            </p>

            {isArchived && (
              <span
                className="rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--foreground-muted)",
                }}
              >
                Archived
              </span>
            )}
          </div>

          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {account.name}
          </h1>

          <p
            className="mt-1 text-xs"
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
      </div>

      {/* Archived notice */}
      {isArchived && (
        <section
          className="mt-7 flex gap-3 rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-muted)",
            }}
          >
            <Archive
              size={16}
            />
          </div>

          <div>
            <p className="text-sm font-semibold">
              Account archived
            </p>

            <p
              className="mt-1 text-[10px] leading-5"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              This account stays
              in your historical
              records but cannot
              be used for new
              transactions until
              it is restored.
            </p>
          </div>
        </section>
      )}

      {/* Current balance */}
      <section
        className="mt-7 rounded-[var(--radius-lg)] p-5"
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
          {isGameBankroll
            ? "Current bankroll"
            : "Available balance"}
        </p>

        <p
          className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
          style={{
            color:
              currentBalance <
              BigInt(0)
                ? "var(--negative)"
                : "var(--foreground)",
          }}
        >
          {formatBalance(
            currentBalance
          )}
        </p>

        <p
          className="mt-2 text-[10px] leading-4"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Calculated from the
          opening balance and all
          money movement connected
          to this account.
        </p>
      </section>

      {/* Details */}
      <section className="mt-7">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Details
        </p>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <DetailRow
            icon={
              <WalletCards
                size={15}
              />
            }
            label="Account name"
            value={
              account.name
            }
          />

          <DetailRow
            icon={
              <LockKeyhole
                size={15}
              />
            }
            label="Account type"
            value={
              formatAccountType(
                account.account_type
              )
            }
            borderTop
          />

          <DetailRow
            icon={
              <Banknote
                size={15}
              />
            }
            label="Opening balance"
            value={
              formatBalance(
                openingBalance
              )
            }
            borderTop
          />

          <DetailRow
            icon={
              <Archive
                size={15}
              />
            }
            label="Status"
            value={
              isArchived
                ? "Archived"
                : "Active"
            }
            borderTop
          />
        </div>
      </section>

      {/* Game Bankroll notice */}
      {isGameBankroll && (
        <section className="mt-7">
          <div
            className="flex gap-3 rounded-[var(--radius-lg)] p-4"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                color:
                  "var(--primary)",
              }}
            >
              <LockKeyhole
                size={16}
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Session managed
              </p>

              <p
                className="mt-1 text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Game Bankroll
                funding and
                settlement are
                managed automatically
                by Game Sessions.
                Its opening balance
                cannot be edited.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Edit only while active */}
      {!isArchived && (
        <AccountEditForm
          accountId={
            account.id
          }
          accountType={
            account.account_type
          }
          initialName={
            account.name
          }
          initialOpeningBalance={
            account.opening_balance
          }
        />
      )}

      {/* Archive / Restore */}
      <AccountArchiveActions
        accountId={
          account.id
        }
        accountName={
          account.name
        }
        isArchived={
          isArchived
        }
        currentBalanceCents={
          currentBalance.toString()
        }
        hasActiveGameSession={
          hasActiveGameSession
        }
      />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  borderTop = false,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  value:
    string;

  borderTop?:
    boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
        style={{
          backgroundColor:
            "var(--surface-secondary)",

          color:
            "var(--foreground-muted)",
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[9px] font-medium uppercase tracking-[0.11em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold">
          {value}
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
      size={18}
    />;

  let color =
    "var(--foreground-secondary)";

  if (
    type ===
    "cash"
  ) {
    icon =
      <Banknote
        size={18}
      />;
  }

  if (
    type ===
    "bank"
  ) {
    icon =
      <Landmark
        size={18}
      />;
  }

  if (
    type ===
    "wallet"
  ) {
    icon =
      <Smartphone
        size={18}
      />;
  }

  if (
    type ===
    "game_bankroll"
  ) {
    icon =
      <Gamepad2
        size={18}
      />;

    color =
      "var(--primary)";
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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