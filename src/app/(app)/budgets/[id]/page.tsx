import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  History,
  Target,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  BudgetActions,
} from "@/components/budgets/budget-actions";

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

export default async function BudgetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    budgetMonth?: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const [
    budgetResult,
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
        .eq(
          "id",
          id
        )
        .maybeSingle(),

      supabase
        .from(
          "budget_limit_history"
        )
        .select(`
          budget_id,
          effective_month,
          monthly_limit
        `)
        .eq(
          "budget_id",
          id
        )
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

  if (
    budgetResult.error ||
    historyResult.error ||
    expensesResult.error
  ) {
    return (
      <div>
        <Link
          href="/budgets"
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          <ArrowLeft
            size={14}
          />

          Budgets
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Budget
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
          budget:{" "}
          {budgetResult.error
            ?.message ??
            historyResult.error
              ?.message ??
            expensesResult.error
              ?.message}
        </div>
      </div>
    );
  }

  if (
    !budgetResult.data
  ) {
    notFound();
  }

  const budget =
    budgetResult.data as Budget;

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
    query.budgetMonth;

  const selectedMonthKey =
    isValidMonthKey(
      requestedMonth
    ) &&
    requestedMonth <=
      currentMonthKey
      ? requestedMonth
      : currentMonthKey;

  const isCurrentMonth =
    selectedMonthKey ===
    currentMonthKey;

  const createdMonth =
    kathmanduMonthKey(
      new Date(
        budget.created_at
      )
    );

  if (
    selectedMonthKey <
    createdMonth
  ) {
    notFound();
  }

  if (
    budget.archived_at
  ) {
    const archivedMonth =
      kathmanduMonthKey(
        new Date(
          budget.archived_at
        )
      );

    if (
      isCurrentMonth ||
      selectedMonthKey >
        archivedMonth
    ) {
      notFound();
    }
  }

  const applicableHistory =
    history
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

  if (
    !applicableHistory
  ) {
    notFound();
  }

  const limit =
    moneyToCents(
      applicableHistory.monthly_limit
    );

  const matchingExpenses =
    expenses.filter(
      (
        expense
      ) =>
        kathmanduMonthKey(
          new Date(
            expense.occurred_at
          )
        ) ===
          selectedMonthKey &&
        normalizeCategory(
          expense.category
        ) ===
          normalizeCategory(
            budget.category
          )
    );

  const spent =
    matchingExpenses.reduce(
      (
        total,
        expense
      ) =>
        total +
        moneyToCents(
          expense.amount
        ),
      BigInt(0)
    );

  const remaining =
    limit -
    spent;

  const percent =
    percentageUsed(
      spent,
      limit
    );

  const overBudget =
    remaining <
    BigInt(0);

  const complete =
    !overBudget &&
    percent === 100;

  const monthLabel =
    formatMonthLabel(
      selectedMonthKey
    );

  const backHref =
    isCurrentMonth
      ? "/budgets"
      : `/budgets?budgetMonth=${selectedMonthKey}`;

  return (
    <div>
      <Link
        href={
          backHref
        }
        className="inline-flex items-center gap-2 text-xs font-medium"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        <ArrowLeft
          size={14}
        />

        Budgets
      </Link>

      {/* Header */}
      <div className="mt-5">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {isCurrentMonth
            ? "Monthly budget"
            : "Budget history"}
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {budget.category}
        </h1>

        <p
          className="mt-2 text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {monthLabel}
        </p>
      </div>

      {/* Hero */}
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
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Spent this month
            </p>

            <p
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{
                color:
                  overBudget
                    ? "var(--negative)"
                    : "var(--foreground)",
              }}
            >
              NPR{" "}
              {formatMoneyFromCents(
                spent
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
                limit
              )}
            </p>
          </div>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                overBudget
                  ? "var(--negative-soft)"
                  : complete
                    ? "var(--positive-soft)"
                    : "var(--surface-secondary)",

              color:
                overBudget
                  ? "var(--negative)"
                  : complete
                    ? "var(--positive)"
                    : "var(--primary)",
            }}
          >
            {overBudget ? (
              <AlertTriangle
                size={18}
              />
            ) : complete ? (
              <Check
                size={18}
              />
            ) : (
              <Target
                size={18}
              />
            )}
          </div>
        </div>

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
                percent,
                100
              )}%`,

              backgroundColor:
                overBudget
                  ? "var(--negative)"
                  : percent >=
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
                overBudget
                  ? "var(--negative)"
                  : "var(--foreground-muted)",
            }}
          >
            {overBudget
              ? `NPR ${formatMoneyFromCents(
                  -remaining
                )} over budget`
              : `NPR ${formatMoneyFromCents(
                  remaining
                )} remaining`}
          </p>

          <p
            className="text-[10px] font-semibold tabular-nums"
            style={{
              color:
                overBudget
                  ? "var(--negative)"
                  : "var(--foreground-muted)",
            }}
          >
            {percent}%
          </p>
        </div>
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
          Budget details
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
          <SummaryRow
            label="Monthly limit"
            value={`NPR ${formatMoneyFromCents(
              limit
            )}`}
          />

          <SummaryRow
            label="Spent"
            value={`NPR ${formatMoneyFromCents(
              spent
            )}`}
            borderTop
          />

          <SummaryRow
            label={
              overBudget
                ? "Over budget"
                : "Remaining"
            }
            value={`NPR ${formatMoneyFromCents(
              overBudget
                ? -remaining
                : remaining
            )}`}
            borderTop
            valueColor={
              overBudget
                ? "var(--negative)"
                : remaining >
                    BigInt(0)
                  ? "var(--positive)"
                  : undefined
            }
          />

          <SummaryRow
            label="Expense entries"
            value={
              matchingExpenses.length.toString()
            }
            borderTop
          />
        </div>
      </section>

      {/* Historical notice */}
      {!isCurrentMonth && (
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
                  "var(--foreground-muted)",
              }}
            >
              <History
                size={16}
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Historical snapshot
              </p>

              <p
                className="mt-1 text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                This shows the
                spending and
                budget limit that
                applied during{" "}
                {monthLabel}.
                Historical
                budgets cannot
                be edited.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Current month management only */}
      {isCurrentMonth &&
        !budget.archived_at && (
          <BudgetActions
            budgetId={
              budget.id
            }
            category={
              budget.category
            }
            monthlyLimit={
              String(
                budget.monthly_limit
              )
            }
          />
        )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  borderTop = false,
  valueColor,
}: {
  label: string;
  value: string;
  borderTop?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <p
        className="text-xs"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="text-right text-xs font-semibold tabular-nums"
        style={{
          color:
            valueColor ??
            "var(--foreground)",
        }}
      >
        {value}
      </p>
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