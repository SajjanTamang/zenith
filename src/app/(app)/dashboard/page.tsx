import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Gamepad2,
  HandCoins,
} from "lucide-react";

import {
  PnLCalendar,
} from "@/components/insights/pnl-calendar";

import {
  buildActivityItems,
  type ActivityItem,
  type ActivityKind,
} from "@/lib/activity";

import {
  calculateAccountBalances,
  isInCurrentKathmanduMonth,
  loanOutstandingBalance,
  totalAccountTypeBalance,
  totalBalanceFromAccounts,
  totalNetWorth,
  totalOutstandingLoans,
  totalTransactionsByType,
  type FinanceAccount,
  type FinanceGameSession,
  type FinanceLoan,
  type FinanceLoanRepayment,
  type FinanceTransaction,
} from "@/lib/finance";

import {
  getCurrentMonthGameAnalytics,
  type AnalyticsGameSession,
} from "@/lib/game-analytics";

import {
  formatMoneyFromCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type DashboardAccount =
  FinanceAccount & {
    name: string;
  };

type DashboardTransaction =
  FinanceTransaction & {
    id: string;
    category: string | null;
    note: string | null;
    occurred_at: string;
  };

type DashboardGameSession =
  FinanceGameSession &
    AnalyticsGameSession & {
      id: string;

      playing_amount:
        | string
        | number;

      game_type: string;

      note:
        | string
        | null;

      started_at: string;

      ended_at:
        | string
        | null;
    };

type DashboardLoanPerson = {
  id: string;
  name: string;
};

/*
  FinanceLoan keeps lent_at optional
  because it is a reusable finance type.

  This Dashboard query explicitly selects
  lent_at, and the database column is NOT NULL,
  so we make it required here.
*/
type DashboardLoan =
  FinanceLoan & {
    lent_at: string;
  };

/*
  Same idea for repayments.

  The Dashboard query explicitly selects
  id and repaid_at, and both exist for
  every stored repayment.
*/
type DashboardLoanRepayment =
  FinanceLoanRepayment & {
    id: string;
    repaid_at: string;
  };

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
    gameSessionsResult,
    loanPeopleResult,
    loansResult,
    repaymentsResult,
  ] =
    await Promise.all([
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
          playing_amount,
          game_type,
          note,
          status,
          result_type,
          result_amount,
          started_at,
          ended_at
        `),

      supabase
        .from("loan_people")
        .select(`
          id,
          name
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
    loanPeopleResult.error ??
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
          Overview
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Dashboard
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
          dashboard:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const typedAccounts =
    (accountsResult.data ??
      []) as DashboardAccount[];

  const typedTransactions =
    (transactionsResult.data ??
      []) as DashboardTransaction[];

  const typedGameSessions =
    (gameSessionsResult.data ??
      []) as DashboardGameSession[];

  const typedLoanPeople =
    (loanPeopleResult.data ??
      []) as DashboardLoanPerson[];

  const typedLoans =
    (loansResult.data ??
      []) as DashboardLoan[];

  const typedRepayments =
    (repaymentsResult.data ??
      []) as DashboardLoanRepayment[];

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
    Money currently available
    inside owned accounts.
  */
  const availableBalance =
    totalBalanceFromAccounts(
      accountBalances
    );

  /*
    Money currently owed back.
  */
  const outstandingLending =
    totalOutstandingLoans(
      typedLoans,
      typedRepayments
    );

  /*
    Available money
    + outstanding lending.
  */
  const netWorth =
    totalNetWorth(
      accountBalances,
      typedLoans,
      typedRepayments
    );

  /*
    Lending summary used only when
    there is currently money owed.
  */
  const outstandingLoans =
    typedLoans.filter(
      (loan) =>
        loanOutstandingBalance(
          loan,
          typedRepayments
        ) >
        BigInt(0)
    );

  const outstandingLoanCount =
    outstandingLoans.length;

  const outstandingPeopleCount =
    new Set(
      outstandingLoans.map(
        (loan) =>
          loan.person_id
      )
    ).size;

  /*
    Current Kathmandu-month income.
  */
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

  /*
    Current Kathmandu-month expenses.
  */
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

  /*
    Current available Game Bankroll.
  */
  const bankroll =
    totalAccountTypeBalance(
      typedAccounts,
      accountBalances,
      "game_bankroll"
    );

  /*
    Current Kathmandu-month
    game analytics.
  */
  const thisMonthGame =
    getCurrentMonthGameAnalytics(
      typedGameSessions
    );

  /*
    Monthly financial movement:

    Income
    - Expenses
    + Game P&L

    Loans, repayments and transfers
    are intentionally excluded.
  */
  const monthlyNetMovement =
    monthlyIncome -
    monthlyExpenses +
    thisMonthGame.totalPnL;

  /*
    Unified newest-first timeline:

    Income
    Expenses
    Transfers
    Games
    Loans
    Repayments
  */
  const recentActivity =
    buildActivityItems(
      typedAccounts,
      typedTransactions,
      typedGameSessions,
      typedLoanPeople,
      typedLoans,
      typedRepayments
    ).slice(
      0,
      5
    );

  return (
    <div>
      {/* Available balance */}
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Available balance
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-sm font-medium"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            NPR
          </span>

          <p className="text-[36px] font-semibold leading-none tracking-[-0.045em] tabular-nums">
            {formatMoneyFromCents(
              availableBalance
            )}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <SignedMoney
            value={
              monthlyNetMovement
            }
            small
          />

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            this month
          </span>
        </div>
      </section>

      {/* This month */}
      <section
        className="mt-8 border-t pt-6"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          This month
        </p>

        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-7">
          <DashboardMetric
            label="Income"
            value={
              monthlyIncome
            }
            tone="positive"
          />

          <DashboardMetric
            label="Expenses"
            value={
              monthlyExpenses
            }
            tone="negative"
          />

          <DashboardMetric
            label="Game P&L"
            value={
              thisMonthGame.totalPnL
            }
            signed
          />

          <DashboardMetric
            label="Bankroll"
            value={
              bankroll
            }
          />
        </div>
      </section>

      {/*
        Only show Lending + Net Worth
        when money is currently owed.

        When outstanding lending is zero:

        Available Balance = Net Worth

        so there is no need to display
        the same number twice.
      */}
      {outstandingLending >
        BigInt(0) && (
        <section className="mt-8">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Money
          </p>

          <div
            className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            {/* Money lent */}
            <Link
              href="/lending"
              className="flex items-center gap-3 px-4 py-4 transition"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor:
                    "rgba(0, 102, 255, 0.10)",

                  color:
                    "var(--primary)",
                }}
              >
                <HandCoins
                  size={17}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] font-medium uppercase tracking-[0.14em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Money lent out
                </p>

                <p
                  className="mt-1 text-base font-semibold tabular-nums"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  {formatBalance(
                    outstandingLending
                  )}
                </p>

                <p
                  className="mt-1 text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  {getLendingSummary(
                    outstandingLoanCount,
                    outstandingPeopleCount
                  )}
                </p>
              </div>

              <ChevronRight
                size={15}
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              />
            </Link>

            {/* Net worth */}
            <div
              className="flex items-center justify-between gap-5 px-4 py-4"
              style={{
                borderTop:
                  "1px solid var(--border)",
              }}
            >
              <div className="min-w-0">
                <p
                  className="text-[9px] font-medium uppercase tracking-[0.14em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Net worth
                </p>

                <p
                  className="mt-1 text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Available + money
                  lent out
                </p>
              </div>

              <p className="shrink-0 text-base font-semibold tabular-nums">
                {formatBalance(
                  netWorth
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Calendar */}
      <section
        className="mt-8 border-t pt-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <PnLCalendar
          dailyResults={
            thisMonthGame.dailyResults
          }
        />
      </section>

      {/* Recent activity */}
      <section
        className="mt-8 border-t pt-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              History
            </p>

            <h2 className="mt-1 text-sm font-semibold">
              Recent Activity
            </h2>
          </div>

          <Link
            href="/activity"
            className="text-[11px] font-medium"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            View all
          </Link>
        </div>

        {recentActivity.length ===
        0 ? (
          <div
            className="mt-4 rounded-[var(--radius-lg)] px-5 py-10 text-center"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <p
              className="text-sm"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              No activity yet.
            </p>
          </div>
        ) : (
          <div
            className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            {recentActivity.map(
              (
                item,
                index
              ) => (
                <RecentActivityRow
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                  borderTop={
                    index >
                    0
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  tone,
  signed = false,
}: {
  label: string;
  value: bigint;

  tone?:
    | "positive"
    | "negative";

  signed?: boolean;
}) {
  let color =
    "var(--foreground)";

  if (
    tone ===
    "positive"
  ) {
    color =
      "var(--positive)";
  }

  if (
    tone ===
    "negative"
  ) {
    color =
      "var(--negative)";
  }

  if (signed) {
    if (
      value >
      BigInt(0)
    ) {
      color =
        "var(--positive)";
    }

    if (
      value <
      BigInt(0)
    ) {
      color =
        "var(--negative)";
    }
  }

  const absolute =
    value <
    BigInt(0)
      ? -value
      : value;

  const prefix =
    signed &&
    value >
      BigInt(0)
      ? "+"
      : signed &&
          value <
            BigInt(0)
        ? "-"
        : "";

  return (
    <div>
      <p
        className="text-[9px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-2 text-sm font-semibold tabular-nums"
        style={{
          color,
        }}
      >
        {prefix}NPR{" "}
        {formatMoneyFromCents(
          absolute
        )}
      </p>
    </div>
  );
}

function SignedMoney({
  value,
  small = false,
}: {
  value: bigint;
  small?: boolean;
}) {
  const positive =
    value >
    BigInt(0);

  const negative =
    value <
    BigInt(0);

  const absolute =
    negative
      ? -value
      : value;

  const prefix =
    positive
      ? "+"
      : negative
        ? "-"
        : "";

  const color =
    positive
      ? "var(--positive)"
      : negative
        ? "var(--negative)"
        : "var(--foreground-muted)";

  return (
    <span
      className={
        small
          ? "text-[11px] font-semibold tabular-nums"
          : "font-semibold tabular-nums"
      }
      style={{
        color,
      }}
    >
      {prefix}NPR{" "}
      {formatMoneyFromCents(
        absolute
      )}
    </span>
  );
}

function RecentActivityRow({
  item,
  borderTop = false,
}: {
  item: ActivityItem;
  borderTop?: boolean;
}) {
  const amount =
    BigInt(
      item.amountCents
    );

  /*
    Lending remains blue.

    Loan/repayment direction is
    communicated using +/- and arrows,
    not expense/income colors.
  */
  const amountColor =
    item.kind ===
      "loan" ||
    item.kind ===
      "repayment"
      ? "var(--primary)"
      : item.kind ===
          "transfer"
        ? "var(--foreground)"
        : amount >
            BigInt(0)
          ? "var(--positive)"
          : amount <
              BigInt(0)
            ? "var(--negative)"
            : "var(--foreground)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <RecentActivityIcon
        kind={
          item.kind
        }
        amount={
          amount
        }
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {item.title}
        </p>

        <p
          className="mt-1 truncate text-[9px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {item.description}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className="text-[11px] font-semibold tabular-nums"
          style={{
            color:
              amountColor,
          }}
        >
          {formatActivityAmount(
            item.kind,
            amount
          )}
        </p>

        <p
          className="mt-1 text-[9px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {formatKathmanduShortDate(
            item.occurredAt
          )}
        </p>
      </div>
    </div>
  );
}

function RecentActivityIcon({
  kind,
  amount,
}: {
  kind: ActivityKind;
  amount: bigint;
}) {
  let icon =
    <ArrowLeftRight
      size={14}
    />;

  let color =
    "var(--foreground-secondary)";

  /*
    Income
  */
  if (
    kind ===
    "income"
  ) {
    icon =
      <ArrowDownLeft
        size={14}
      />;

    color =
      "var(--positive)";
  }

  /*
    Expense
  */
  if (
    kind ===
    "expense"
  ) {
    icon =
      <ArrowUpRight
        size={14}
      />;

    color =
      "var(--negative)";
  }

  /*
    Game result
  */
  if (
    kind ===
    "game"
  ) {
    icon =
      <Gamepad2
        size={14}
      />;

    color =
      amount >
      BigInt(0)
        ? "var(--positive)"
        : amount <
            BigInt(0)
          ? "var(--negative)"
          : "var(--foreground-secondary)";
  }

  /*
    Money lent:
    Hand + outward arrow
  */
  if (
    kind ===
    "loan"
  ) {
    icon = (
      <div className="relative">
        <HandCoins
          size={14}
        />

        <ArrowUpRight
          size={8}
          strokeWidth={2.5}
          className="absolute -right-2 -top-1"
        />
      </div>
    );

    color =
      "var(--primary)";
  }

  /*
    Repayment:
    Hand + inward arrow
  */
  if (
    kind ===
    "repayment"
  ) {
    icon = (
      <div className="relative">
        <HandCoins
          size={14}
        />

        <ArrowDownLeft
          size={8}
          strokeWidth={2.5}
          className="absolute -right-2 -top-1"
        />
      </div>
    );

    color =
      "var(--primary)";
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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

function formatActivityAmount(
  kind: ActivityKind,
  value: bigint
) {
  const absolute =
    value <
    BigInt(0)
      ? -value
      : value;

  /*
    Transfer is neutral.
  */
  if (
    kind ===
    "transfer"
  ) {
    return `NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  /*
    Loan:
    cash left the account.
  */
  if (
    kind ===
    "loan"
  ) {
    return `-NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  /*
    Repayment:
    cash returned.
  */
  if (
    kind ===
    "repayment"
  ) {
    return `+NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  if (
    value >
    BigInt(0)
  ) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  return "NPR 0.00";
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

function getLendingSummary(
  loanCount: number,
  peopleCount: number
) {
  if (
    loanCount === 0
  ) {
    return "Nobody owes you money";
  }

  const loanLabel =
    loanCount === 1
      ? "loan"
      : "loans";

  const peopleLabel =
    peopleCount === 1
      ? "person"
      : "people";

  return `${loanCount} ${loanLabel} • ${peopleCount} ${peopleLabel}`;
}

function formatKathmanduShortDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "short",

      day:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}