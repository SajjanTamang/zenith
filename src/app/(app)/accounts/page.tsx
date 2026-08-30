import Link from "next/link";

import {
  Banknote,
  Gamepad2,
  Landmark,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import {
  calculateAccountBalances,
  totalBalanceFromAccounts,
  type FinanceGameSession,
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
    {
      data: accounts,
      error: accountsError,
    },
    {
      data: transactions,
      error: transactionsError,
    },
    {
      data: gameSessions,
      error: gameSessionsError,
    },
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
      .order("created_at", {
        ascending: true,
      }),

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
  ]);

  if (
    accountsError ||
    transactionsError ||
    gameSessionsError
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
          {accountsError?.message ??
            transactionsError?.message ??
            gameSessionsError?.message}
        </div>
      </div>
    );
  }

  const typedAccounts =
    (accounts ?? []) as Account[];

  const typedTransactions =
    (transactions ??
      []) as FinanceTransaction[];

  const typedGameSessions =
    (gameSessions ??
      []) as FinanceGameSession[];

  /*
    Current balance:

    Opening balance
    + Income
    - Expenses
    + Transfers in
    - Transfers out
    + / - Game P&L for bankroll accounts
  */
  const accountBalances =
    calculateAccountBalances(
      typedAccounts,
      typedTransactions,
      typedGameSessions
    );

  const totalBalance =
    totalBalanceFromAccounts(
      accountBalances
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
          <Plus size={14} />
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
        Cash, bank, wallet, and
        game bankroll balances in
        one place.
      </p>

      {typedAccounts.length ===
      0 ? (
        <EmptyAccounts />
      ) : (
        <>
          {/* Total */}
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
              Total balance
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              {formatBalance(
                totalBalance
              )}
            </p>

            <p
              className="mt-2 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Across{" "}
              {typedAccounts.length}{" "}
              {typedAccounts.length ===
              1
                ? "account"
                : "accounts"}
            </p>
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
                    ) ?? BigInt(0);

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
    currentBalance < BigInt(0)
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
            color: balanceColor,
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
            : "Current balance"}
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
    <WalletCards size={17} />;

  let color =
    "var(--foreground-secondary)";

  if (type === "cash") {
    icon =
      <Banknote size={17} />;
  }

  if (type === "bank") {
    icon =
      <Landmark size={17} />;
  }

  if (type === "wallet") {
    icon =
      <Smartphone size={17} />;
  }

  if (
    type === "game_bankroll"
  ) {
    icon =
      <Gamepad2 size={17} />;

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
        <Plus size={15} />
        Add Account
      </Link>
    </div>
  );
}

function formatBalance(
  value: bigint
) {
  if (
    value < BigInt(0)
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
    type === "game_bankroll"
  ) {
    return "Game Bankroll";
  }

  if (type === "cash") {
    return "Cash";
  }

  if (type === "bank") {
    return "Bank";
  }

  if (type === "wallet") {
    return "Wallet";
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}