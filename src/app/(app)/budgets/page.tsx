import Link from "next/link";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Plus,
  Target,
} from "lucide-react";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type Budget = {
  id: string;
  category: string;
  monthly_limit: string | number;
  created_at: string;
};

type ExpenseTransaction = {
  id: string;
  amount: string | number;
  category: string | null;
  occurred_at: string;
};

export default async function BudgetsPage() {
  const supabase =
    await createClient();

  const [
    budgetsResult,
    expensesResult,
  ] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(`
          id,
          category,
          monthly_limit,
          created_at
        `)
        .order(
          "category",
          {
            ascending: true,
          }
        ),

      supabase
        .from("transactions")
        .select(`
          id,
          amount,
          category,
          occurred_at
        `)
        .eq(
          "transaction_type",
          "expense"
        )
        .order(
          "occurred_at",
          {
            ascending: false,
          }
        ),
    ]);

  const error =
    budgetsResult.error ??
    expensesResult.error;

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
          Planning
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Budgets
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
          budgets:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const budgets =
    (budgetsResult.data ??
      []) as Budget[];

  const expenses =
    (expensesResult.data ??
      []) as ExpenseTransaction[];

  const currentMonthKey =
    kathmanduMonthKey(
      new Date()
    );

  const currentMonthExpenses =
    expenses.filter(
      (
        expense
      ) =>
        kathmanduMonthKey(
          new Date(
            expense.occurred_at
          )
        ) ===
        currentMonthKey
    );

  const spendingByCategory =
    new Map<
      string,
      bigint
    >();

  for (
    const expense of
    currentMonthExpenses
  ) {
    const category =
      normalizeCategory(
        expense.category
      );

    if (!category) {
      continue;
    }

    const current =
      spendingByCategory.get(
        category
      ) ??
      BigInt(0);

    spendingByCategory.set(
      category,
      current +
        moneyToCents(
          expense.amount
        )
    );
  }

  const budgetRows =
    budgets.map(
      (
        budget
      ) => {
        const limit =
          moneyToCents(
            budget.monthly_limit
          );

        const spent =
          spendingByCategory.get(
            normalizeCategory(
              budget.category
            )
          ) ??
          BigInt(0);

        return {
          ...budget,
          limit,
          spent,
          remaining:
            limit -
            spent,
        };
      }
    );

  const totalLimit =
    budgetRows.reduce(
      (
        total,
        budget
      ) =>
        total +
        budget.limit,
      BigInt(0)
    );

  const totalSpent =
    budgetRows.reduce(
      (
        total,
        budget
      ) =>
        total +
        budget.spent,
      BigInt(0)
    );

  const totalRemaining =
    totalLimit -
    totalSpent;

  const totalPercent =
    percentageUsed(
      totalSpent,
      totalLimit
    );

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Kathmandu",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      new Date()
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
            Planning
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Budgets
          </h1>
        </div>

        <Link
          href="/budgets/new"
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

      <div className="mt-3 flex items-center justify-between gap-4">
        <p
          className="max-w-xs text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Set monthly limits
          for your everyday
          spending categories.
        </p>

        <p
          className="shrink-0 text-[10px] font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {monthLabel}
        </p>
      </div>

      {/* Summary */}
      <section
        className="mt-8 rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Monthly spending
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              NPR{" "}
              {formatMoneyFromCents(
                totalSpent
              )}
            </p>

            <p
              className="mt-2 text-[10px] tabular-nums"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              of NPR{" "}
              {formatMoneyFromCents(
                totalLimit
              )}{" "}
              budgeted
            </p>
          </div>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                totalRemaining <
                BigInt(0)
                  ? "var(--negative)"
                  : "var(--primary)",
            }}
          >
            {totalRemaining <
            BigInt(0) ? (
              <AlertTriangle
                size={18}
              />
            ) : (
              <Target
                size={18}
              />
            )}
          </div>
        </div>

        {totalLimit >
          BigInt(0) && (
          <>
            <div
              className="mt-5 h-2 overflow-hidden rounded-full"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(
                    totalPercent,
                    100
                  )}%`,

                  backgroundColor:
                    totalPercent >
                    100
                      ? "var(--negative)"
                      : totalPercent >=
                          80
                        ? "var(--primary)"
                        : "var(--positive)",
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p
                className="text-[10px] tabular-nums"
                style={{
                  color:
                    totalRemaining <
                    BigInt(0)
                      ? "var(--negative)"
                      : "var(--foreground-muted)",
                }}
              >
                {totalRemaining <
                BigInt(0)
                  ? `NPR ${formatMoneyFromCents(
                      -totalRemaining
                    )} over budget`
                  : `NPR ${formatMoneyFromCents(
                      totalRemaining
                    )} remaining`}
              </p>

              <p
                className="text-[10px] font-semibold tabular-nums"
                style={{
                  color:
                    totalPercent >
                    100
                      ? "var(--negative)"
                      : "var(--foreground-muted)",
                }}
              >
                {totalPercent}%
              </p>
            </div>
          </>
        )}
      </section>

      {/* Categories */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Categories
          </h2>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              budgetRows.length
            }{" "}
            {budgetRows.length ===
            1
              ? "budget"
              : "budgets"}
          </span>
        </div>

        {budgetRows.length ===
        0 ? (
          <EmptyBudgets />
        ) : (
          <div
            className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            {budgetRows.map(
              (
                budget,
                index
              ) => (
                <BudgetRow
                  key={
                    budget.id
                  }
                  budget={
                    budget
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

function BudgetRow({
  budget,
  borderTop,
}: {
  budget: Budget & {
    limit: bigint;
    spent: bigint;
    remaining: bigint;
  };

  borderTop: boolean;
}) {
  const percent =
    percentageUsed(
      budget.spent,
      budget.limit
    );

  const overBudget =
    budget.remaining <
    BigInt(0);

  const nearLimit =
    !overBudget &&
    percent >= 80;

  const progressColor =
    overBudget
      ? "var(--negative)"
      : nearLimit
        ? "var(--primary)"
        : "var(--positive)";

  return (
    <Link
      href={`/budgets/${budget.id}`}
      className="block px-4 py-4 transition hover:brightness-[0.98]"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              overBudget
                ? "var(--negative-soft)"
                : "var(--surface-secondary)",

            color:
              progressColor,
          }}
        >
          {overBudget ? (
            <AlertTriangle
              size={16}
            />
          ) : percent ===
            100 ? (
            <Check
              size={16}
            />
          ) : (
            <Target
              size={16}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {
                  budget.category
                }
              </p>

              <p
                className="mt-1 text-[10px] tabular-nums"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                NPR{" "}
                {formatMoneyFromCents(
                  budget.spent
                )}{" "}
                spent
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                NPR{" "}
                {formatMoneyFromCents(
                  budget.limit
                )}
              </p>

              <p
                className="mt-1 text-[9px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                monthly limit
              </p>
            </div>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full"
            style={{
              backgroundColor:
                "var(--surface-secondary)",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(
                  percent,
                  100
                )}%`,

                backgroundColor:
                  progressColor,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              className="text-[9px] tabular-nums"
              style={{
                color:
                  overBudget
                    ? "var(--negative)"
                    : "var(--foreground-muted)",
              }}
            >
              {overBudget
                ? `NPR ${formatMoneyFromCents(
                    -budget.remaining
                  )} over`
                : `NPR ${formatMoneyFromCents(
                    budget.remaining
                  )} remaining`}
            </p>

            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-semibold tabular-nums"
                style={{
                  color:
                    overBudget
                      ? "var(--negative)"
                      : "var(--foreground-muted)",
                }}
              >
                {percent}%
              </span>

              <ChevronRight
                size={14}
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyBudgets() {
  return (
    <div
      className="mt-3 flex flex-col items-center rounded-[var(--radius-lg)] px-6 py-10 text-center"
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
        <Target
          size={19}
        />
      </div>

      <h2 className="mt-4 text-sm font-semibold">
        No budgets yet
      </h2>

      <p
        className="mt-2 max-w-xs text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Add a monthly
        spending limit for
        categories you want
        to keep under
        control.
      </p>

      <Link
        href="/budgets/new"
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

        Add Budget
      </Link>
    </div>
  );
}

function normalizeCategory(
  category:
    string | null
) {
  return (
    category
      ?.trim()
      .toLowerCase() ??
    ""
  );
}

function percentageUsed(
  spent: bigint,
  limit: bigint
) {
  if (
    limit <=
    BigInt(0)
  ) {
    return 0;
  }

  return Number(
    (spent *
      BigInt(100)) /
      limit
  );
}

function kathmanduMonthKey(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year:
          "numeric",

        month:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "month"
    )?.value;

  return `${year}-${month}`;
}