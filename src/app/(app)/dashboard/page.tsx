import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";
import {
  calculateAccountBalances,
  isInCurrentKathmanduMonth,
  totalAccountTypeBalance,
  totalBalanceFromAccounts,
  totalGamePnL,
  totalTransactionsByType,
  type FinanceAccount,
  type FinanceGameSession,
  type FinanceTransaction,
} from "@/lib/finance";

type DashboardAccount = FinanceAccount & {
  name: string;
};

type DashboardTransaction = FinanceTransaction & {
  id: string;
  category: string | null;
  note: string | null;
  occurred_at: string;
};

type DashboardGameSession = FinanceGameSession & {
  id: string;
  game_type: string;
  ended_at: string | null;
};

type RecentActivityItem = {
  id: string;
  title: string;
  description: string;
  amount: bigint;
  kind:
    | "income"
    | "expense"
    | "transfer"
    | "game";
  occurredAt: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
    { data: gameSessions, error: gameSessionsError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select(`
        id,
        name,
        account_type,
        opening_balance
      `),

    supabase
      .from("transactions")
      .select(`
        id,
        transaction_type,
        amount,
        from_account_id,
        to_account_id,
        category,
        note,
        occurred_at
      `),

    supabase
      .from("game_sessions")
      .select(`
        id,
        bankroll_account_id,
        game_type,
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
        <h1 className="text-2xl font-semibold">
          Dashboard
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor: "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load dashboard:{" "}
          {accountsError?.message ??
            transactionsError?.message ??
            gameSessionsError?.message}
        </div>
      </div>
    );
  }

  const typedAccounts =
    (accounts ?? []) as DashboardAccount[];

  const typedTransactions =
    (transactions ?? []) as DashboardTransaction[];

  const typedGameSessions =
    (gameSessions ?? []) as DashboardGameSession[];

  const accountBalances =
    calculateAccountBalances(
      typedAccounts,
      typedTransactions,
      typedGameSessions
    );

  const totalBalance =
    totalBalanceFromAccounts(accountBalances);

  const monthlyIncome =
    totalTransactionsByType(
      typedTransactions,
      "income",
      (transaction) =>
        Boolean(
          transaction.occurred_at &&
            isInCurrentKathmanduMonth(
              transaction.occurred_at
            )
        )
    );

  const monthlyExpenses =
    totalTransactionsByType(
      typedTransactions,
      "expense",
      (transaction) =>
        Boolean(
          transaction.occurred_at &&
            isInCurrentKathmanduMonth(
              transaction.occurred_at
            )
        )
    );

  const gamePnL =
    totalGamePnL(typedGameSessions);

  const bankroll =
    totalAccountTypeBalance(
      typedAccounts,
      accountBalances,
      "game_bankroll"
    );

  const recentActivity = buildRecentActivity(
    typedAccounts,
    typedTransactions,
    typedGameSessions
  ).slice(0, 5);

  return (
    <div>
      <div>
        <p
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Overview
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
      </div>

      <section
        className="mt-8 rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-[0.12em]"
              style={{
                color: "var(--foreground-muted)",
              }}
            >
              Total balance
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              <span
                className="mr-2 text-base font-medium"
                style={{
                  color: "var(--foreground-muted)",
                }}
              >
                NPR
              </span>

              {formatMoneyFromCents(totalBalance)}
            </p>
          </div>

          <Link
            href="/accounts"
            className="text-xs font-medium"
            style={{
              color: "var(--foreground-secondary)",
            }}
          >
            Accounts
          </Link>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCard
          label="Income"
          value={monthlyIncome}
          tone="positive"
          subtitle="This month"
        />

        <SummaryCard
          label="Expenses"
          value={monthlyExpenses}
          tone="negative"
          subtitle="This month"
        />

        <SummaryCard
          label="Game P&L"
          value={gamePnL}
          tone={
            gamePnL > BigInt(0)
              ? "positive"
              : gamePnL < BigInt(0)
                ? "negative"
                : undefined
          }
          showSign
          subtitle="Sessions"
        />

        <SummaryCard
          label="Bankroll"
          value={bankroll}
          subtitle="Current balance"
        />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Recent activity
          </h2>

          <Link
            href="/activity"
            className="text-xs font-medium"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            View all
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div
            className="mt-3 rounded-[var(--radius-lg)] px-5 py-10 text-center"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-sm"
              style={{
                color: "var(--foreground-muted)",
              }}
            >
              No activity yet.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {recentActivity.map((item) => (
              <RecentActivityRow
                key={item.id}
                item={item}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  tone,
  showSign = false,
}: {
  label: string;
  value: bigint;
  subtitle: string;
  tone?: "positive" | "negative";
  showSign?: boolean;
}) {
  const valueColor =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
        ? "var(--negative)"
        : "var(--foreground)";

  const prefix =
    showSign && value > BigInt(0)
      ? "+"
      : "";

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs font-medium"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-3 text-lg font-semibold tabular-nums"
        style={{
          color: valueColor,
        }}
      >
        {prefix}NPR {formatMoneyFromCents(value)}
      </p>

      <p
        className="mt-1 text-xs"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function RecentActivityRow({
  item,
}: {
  item: RecentActivityItem;
}) {
  const amountColor =
    item.amount > BigInt(0)
      ? "var(--positive)"
      : item.amount < BigInt(0)
        ? "var(--negative)"
        : "var(--foreground)";

  const prefix =
    item.amount > BigInt(0)
      ? "+"
      : "";

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {item.title}
        </p>

        <p
          className="mt-1 truncate text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          {item.description}
        </p>

        <p
          className="mt-1 text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          {formatKathmanduDate(item.occurredAt)}
        </p>
      </div>

      <p
        className="shrink-0 text-sm font-semibold tabular-nums"
        style={{
          color: amountColor,
        }}
      >
        {item.kind === "transfer"
          ? `NPR ${formatMoneyFromCents(
              absoluteMoney(item.amount)
            )}`
          : `${prefix}NPR ${formatMoneyFromCents(
              item.amount
            )}`}
      </p>
    </div>
  );
}

function buildRecentActivity(
  accounts: DashboardAccount[],
  transactions: DashboardTransaction[],
  gameSessions: DashboardGameSession[]
) {
  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      account.name,
    ])
  );

  const items: RecentActivityItem[] = [];

  for (const transaction of transactions) {
    const amount =
      moneyToCents(transaction.amount);

    if (transaction.transaction_type === "income") {
      const accountName =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ?? "Unknown account"
          : "Unknown account";

      items.push({
        id: `transaction-${transaction.id}`,
        title:
          transaction.category || "Income",
        description:
          transaction.note ||
          `To ${accountName}`,
        amount,
        kind: "income",
        occurredAt: transaction.occurred_at,
      });
    }

    if (transaction.transaction_type === "expense") {
      const accountName =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ?? "Unknown account"
          : "Unknown account";

      items.push({
        id: `transaction-${transaction.id}`,
        title:
          transaction.category || "Expense",
        description:
          transaction.note ||
          `From ${accountName}`,
        amount: -amount,
        kind: "expense",
        occurredAt: transaction.occurred_at,
      });
    }

    if (transaction.transaction_type === "transfer") {
      const fromAccount =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ?? "Unknown"
          : "Unknown";

      const toAccount =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ?? "Unknown"
          : "Unknown";

      items.push({
        id: `transaction-${transaction.id}`,
        title: "Transfer",
        description:
          transaction.note ||
          `${fromAccount} → ${toAccount}`,
        amount,
        kind: "transfer",
        occurredAt: transaction.occurred_at,
      });
    }
  }

  for (const session of gameSessions) {
    if (
      session.status !== "completed" ||
      session.result_type === null ||
      session.result_amount === null
    ) {
      continue;
    }

    const amount =
      moneyToCents(session.result_amount);

    const pnl =
      session.result_type === "win"
        ? amount
        : session.result_type === "loss"
          ? -amount
          : BigInt(0);

    const resultLabel =
      session.result_type === "win"
        ? "Game win"
        : session.result_type === "loss"
          ? "Game loss"
          : "Game even";

    items.push({
      id: `session-${session.id}`,
      title: session.game_type,
      description: resultLabel,
      amount: pnl,
      kind: "game",
      occurredAt:
        session.ended_at ??
        session.started_at ??
        new Date(0).toISOString(),
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() -
      new Date(a.occurredAt).getTime()
  );
}

function absoluteMoney(value: bigint) {
  return value < BigInt(0)
    ? -value
    : value;
}

function formatKathmanduDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}