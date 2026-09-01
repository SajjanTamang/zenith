import Link from "next/link";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
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
  archived_at: string | null;
};

type BudgetHistory = {
  budget_id: string;
  effective_month: string;
  monthly_limit: string | number;
};

type ExpenseTransaction = {
  id: string;
  amount: string | number;
  category: string | null;
  occurred_at: string;
};

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    budgetMonth?: string;
  }>;
}) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  const [
    budgetsResult,
    historyResult,
    expensesResult,
  ] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(`
          id,
          category,
          monthly_limit,
          created_at,
          archived_at
        `)
        .order(
          "category",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "budget_limit_history"
        )
        .select(`
          budget_id,
          effective_month,
          monthly_limit
        `)
        .order(
          "effective_month",
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
    historyResult.error ??
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

  const history =
    (historyResult.data ??
      []) as BudgetHistory[];

  const expenses =
    (expensesResult.data ??
      []) as ExpenseTransaction[];

  const currentMonthKey =
    kathmanduMonthKey(
      new Date()
    );

  const requestedMonth =
    params.budgetMonth;

  const selectedMonthKey =
    isValidMonthKey(
      requestedMonth
    ) &&
    requestedMonth <=
      currentMonthKey
      ? requestedMonth
      : currentMonthKey;

  const previousMonthKey =
    shiftMonth(
      selectedMonthKey,
      -1
    );

  const nextMonthKey =
    shiftMonth(
      selectedMonthKey,
      1
    );

  const canGoNext =
    nextMonthKey <=
    currentMonthKey;

  const isCurrentMonth =
    selectedMonthKey ===
    currentMonthKey;

  const selectedMonthExpenses =
    expenses.filter(
      (
        expense
      ) =>
        kathmanduMonthKey(
          new Date(
            expense.occurred_at
          )
        ) ===
        selectedMonthKey
    );

  const spendingByCategory =
    new Map<
      string,
      bigint
    >();

  for (
    const expense of
    selectedMonthExpenses
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

  const historyByBudget =
    new Map<
      string,
      BudgetHistory[]
    >();

  for (
    const entry of
    history
  ) {
    const entries =
      historyByBudget.get(
        entry.budget_id
      ) ??
      [];

    entries.push(
      entry
    );

    historyByBudget.set(
      entry.budget_id,
      entries
    );
  }

  const budgetRows =
    budgets
      .map(
        (
          budget
        ) => {
          const createdMonth =
            kathmanduMonthKey(
              new Date(
                budget.created_at
              )
            );

          if (
            createdMonth >
            selectedMonthKey
          ) {
            return null;
          }

          /*
            Current month:
            only show budgets
            that are still active.

            Historical months:
            an archived budget
            remains visible in
            months where it
            previously existed.
          */
          if (
            isCurrentMonth &&
            budget.archived_at
          ) {
            return null;
          }

          if (
            !isCurrentMonth &&
            budget.archived_at
          ) {
            const archivedMonth =
              kathmanduMonthKey(
                new Date(
                  budget.archived_at
                )
              );

            if (
              selectedMonthKey >
              archivedMonth
            ) {
              return null;
            }
          }

          const entries =
            historyByBudget.get(
              budget.id
            ) ??
            [];

          const applicableHistory =
            entries
              .filter(
                (
                  entry
                ) =>
                  normalizeHistoryMonth(
                    entry.effective_month
                  ) <=
                  selectedMonthKey
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  normalizeHistoryMonth(
                    b.effective_month
                  ).localeCompare(
                    normalizeHistoryMonth(
                      a.effective_month
                    )
                  )
              )[0];

          /*
            No history means
            this budget did not
            exist yet for the
            selected month.
          */
          if (
            !applicableHistory
          ) {
            return null;
          }

          const limit =
            moneyToCents(
              applicableHistory.monthly_limit
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
      )
      .filter(
        (
          budget
        ): budget is
          Budget & {
            limit: bigint;
            spent: bigint;
            remaining: bigint;
          } =>
          budget !==
          null
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
    formatMonthLabel(
      selectedMonthKey
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

        {isCurrentMonth && (
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
)}
      </div>

      <p
        className="mt-3 max-w-xs text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Set monthly limits
        for your everyday
        spending categories.
      </p>

      {/* Month navigation */}
      <div
        className="mt-5 flex items-center justify-between rounded-[var(--radius-md)] px-2 py-2"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <Link
          href={`/budgets?budgetMonth=${previousMonthKey}`}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] transition hover:brightness-[0.98]"
          style={{
            color:
              "var(--foreground-secondary)",
          }}
        >
          <ChevronLeft
            size={17}
          />
        </Link>

        <div className="text-center">
          <p className="text-xs font-semibold">
            {monthLabel}
          </p>

          <p
            className="mt-0.5 text-[9px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {isCurrentMonth
              ? "Current month"
              : "Budget history"}
          </p>
        </div>

        {canGoNext ? (
          <Link
            href={`/budgets?budgetMonth=${nextMonthKey}`}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] transition hover:brightness-[0.98]"
            style={{
              color:
                "var(--foreground-secondary)",
            }}
          >
            <ChevronRight
              size={17}
            />
          </Link>
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              color:
                "var(--foreground-muted)",

              opacity: 0.35,
            }}
          >
            <ChevronRight
              size={17}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <section
        className="mt-7 rounded-[var(--radius-lg)] p-5"
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
          <EmptyBudgets
            historical={
              !isCurrentMonth
            }
          />
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
                  selectedMonthKey={
                    selectedMonthKey
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
  selectedMonthKey,
  borderTop,
}: {
  budget: Budget & {
    limit: bigint;
    spent: bigint;
    remaining: bigint;
  };

  selectedMonthKey:
    string;

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
      href={`/budgets/${budget.id}?budgetMonth=${selectedMonthKey}`}
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

function EmptyBudgets({
  historical,
}: {
  historical:
    boolean;
}) {
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
        {historical
          ? "No budgets for this month"
          : "No budgets yet"}
      </h2>

      <p
        className="mt-2 max-w-xs text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {historical
          ? "There were no budget limits recorded for this month."
          : "Add a monthly spending limit for categories you want to keep under control."}
      </p>

      {!historical && (
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
      )}
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

function isValidMonthKey(
  value:
    string | undefined
): value is string {
  if (!value) {
    return false;
  }

  if (
    !/^\d{4}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const month =
    Number(
      value.slice(
        5,
        7
      )
    );

  return (
    month >= 1 &&
    month <= 12
  );
}

function shiftMonth(
  monthKey: string,
  amount: number
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(
        Number
      );

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1 +
          amount,
        1
      )
    );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() +
      1
  ).padStart(
    2,
    "0"
  )}`;
}

function formatMonthLabel(
  monthKey:
    string
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(
        Number
      );

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    date
  );
}

function normalizeHistoryMonth(
  value:
    string
) {
  return value.slice(
    0,
    7
  );
}