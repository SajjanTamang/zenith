import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Dice5,
  FileDown,
  HandCoins,
  RotateCcw,
} from "lucide-react";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type ReportsPageProps = {
  searchParams: Promise<{
    month?:
      | string
      | string[];
  }>;
};

type ReportTransaction = {
  id: string;

  transaction_type:
    | "income"
    | "expense"
    | "transfer";

  amount:
    | string
    | number;

  occurred_at:
    string;
};

type ReportGameSession = {
  id: string;

  status:
    | "active"
    | "completed";

  result_type:
    | "win"
    | "loss"
    | "even"
    | null;

  result_amount:
    | string
    | number
    | null;

  started_at:
    string;

  voided_at:
    | string
    | null;
};

type ReportLoan = {
  id: string;
  lent_at: string;
};

type ReportRepayment = {
  id: string;
  repaid_at: string;
};

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const supabase =
    await createClient();

  const params =
    await searchParams;

  const requestedMonth =
    firstSearchParam(
      params.month
    );

  const currentMonthKey =
    getKathmanduMonthKey(
      new Date()
    );

  const selectedMonthKey =
    getSafeMonthKey(
      requestedMonth,
      currentMonthKey
    );

  const previousMonthKey =
    shiftMonthKey(
      selectedMonthKey,
      -1
    );

  const nextMonthKey =
    shiftMonthKey(
      selectedMonthKey,
      1
    );

  const canGoNext =
    nextMonthKey <=
    currentMonthKey;

  const [
    transactionsResult,
    sessionsResult,
    loansResult,
    repaymentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "transactions"
        )
        .select(`
          id,
          transaction_type,
          amount,
          occurred_at
        `),

      supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          status,
          result_type,
          result_amount,
          started_at,
          voided_at
        `),

      supabase
        .from(
          "loans"
        )
        .select(`
          id,
          lent_at
        `),

      supabase
        .from(
          "loan_repayments"
        )
        .select(`
          id,
          repaid_at
        `),
    ]);

  const error =
    transactionsResult.error ??
    sessionsResult.error ??
    loansResult.error ??
    repaymentsResult.error;

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
          Finance
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reports & Export
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
          reports:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const transactions =
    (transactionsResult.data ??
      []) as ReportTransaction[];

  const sessions =
    (sessionsResult.data ??
      []) as ReportGameSession[];

  const loans =
    (loansResult.data ??
      []) as ReportLoan[];

  const repayments =
    (repaymentsResult.data ??
      []) as ReportRepayment[];

  const monthlyTransactions =
    transactions.filter(
      (
        transaction
      ) =>
        getKathmanduMonthKey(
          transaction.occurred_at
        ) ===
        selectedMonthKey
    );

  /*
    Keep all monthly sessions here so
    the report can still understand which
    records belong to the month.

    countedMonthlySessions excludes voided
    sessions from report statistics.
  */
  const monthlySessions =
    sessions.filter(
      (
        session
      ) =>
        getKathmanduMonthKey(
          session.started_at
        ) ===
        selectedMonthKey
    );

  const countedMonthlySessions =
    monthlySessions.filter(
      (
        session
      ) =>
        !session.voided_at
    );

  const monthlyLoans =
    loans.filter(
      (
        loan
      ) =>
        getKathmanduMonthKey(
          loan.lent_at
        ) ===
        selectedMonthKey
    );

  const monthlyRepayments =
    repayments.filter(
      (
        repayment
      ) =>
        getKathmanduMonthKey(
          repayment.repaid_at
        ) ===
        selectedMonthKey
    );

  const income =
    sumTransactions(
      monthlyTransactions,
      "income"
    );

  const expenses =
    sumTransactions(
      monthlyTransactions,
      "expense"
    );

  /*
    Voided sessions contribute NPR 0
    to report Game P&L.
  */
  const gamePnL =
    countedMonthlySessions.reduce(
      (
        total,
        session
      ) =>
        total +
        getGameSessionPnL(
          session
        ),
      BigInt(0)
    );

  const netMovement =
    income -
    expenses +
    gamePnL;

  const incomeCount =
    countTransactions(
      monthlyTransactions,
      "income"
    );

  const expenseCount =
    countTransactions(
      monthlyTransactions,
      "expense"
    );

  const transferCount =
    countTransactions(
      monthlyTransactions,
      "transfer"
    );

  return (
    <div>
      {/* Header */}
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Finance
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Reports & Export
        </h1>

        <p
          className="mt-3 text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Review your finances
          month by month and
          export your records.
        </p>
      </section>

      {/* Month navigator */}
      <section
        className="mt-7 flex items-center justify-between rounded-[var(--radius-lg)] px-3 py-3"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <Link
          href={`/reports?month=${previousMonthKey}`}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "var(--surface-secondary)",

            color:
              "var(--foreground-secondary)",
          }}
        >
          <ChevronLeft
            size={16}
          />
        </Link>

        <div className="text-center">
          <p
            className="text-[9px] font-medium uppercase tracking-[0.13em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Report month
          </p>

          <p className="mt-1 text-sm font-semibold">
            {formatMonthLabel(
              selectedMonthKey
            )}
          </p>
        </div>

        {canGoNext ? (
          <Link
            href={`/reports?month=${nextMonthKey}`}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-secondary)",
            }}
          >
            <ChevronRight
              size={16}
            />
          </Link>
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full opacity-30"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-muted)",
            }}
          >
            <ChevronRight
              size={16}
            />
          </div>
        )}
      </section>

      {/* Summary */}
      <section className="mt-8">
        <SectionLabel>
          Summary
        </SectionLabel>

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
            label="Income"
            value={
              income
            }
            tone="positive"
          />

          <SummaryRow
            label="Expenses"
            value={
              expenses
            }
            tone="negative"
            borderTop
          />

          <SummaryRow
            label="Game P&L"
            value={
              gamePnL
            }
            signed
            borderTop
          />

          <SummaryRow
            label="Net Movement"
            value={
              netMovement
            }
            signed
            borderTop
            strong
          />
        </div>
      </section>

      {/* Activity */}
      <section className="mt-8">
        <SectionLabel>
          Activity
        </SectionLabel>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <ActivityCountRow
            icon={
              <ArrowDownLeft
                size={15}
              />
            }
            label="Income"
            count={
              incomeCount
            }
            color="var(--positive)"
          />

          <ActivityCountRow
            borderTop
            icon={
              <ArrowUpRight
                size={15}
              />
            }
            label="Expenses"
            count={
              expenseCount
            }
            color="var(--negative)"
          />

          <ActivityCountRow
            borderTop
            icon={
              <ArrowLeftRight
                size={15}
              />
            }
            label="Transfers"
            count={
              transferCount
            }
          />

          <ActivityCountRow
            borderTop
            icon={
              <Dice5
                size={15}
              />
            }
            label="Game Sessions"
            count={
              countedMonthlySessions.length
            }
          />

          <ActivityCountRow
            borderTop
            icon={
              <HandCoins
                size={15}
              />
            }
            label="Loans"
            count={
              monthlyLoans.length
            }
            color="var(--primary)"
          />

          <ActivityCountRow
            borderTop
            icon={
              <RotateCcw
                size={15}
              />
            }
            label="Repayments"
            count={
              monthlyRepayments.length
            }
            color="var(--primary)"
          />
        </div>
      </section>

      {/* Export */}
      <section className="mt-8">
        <SectionLabel>
          Export
        </SectionLabel>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <ExportRow
            href={`/reports/export/transactions?month=${selectedMonthKey}`}
            label="Transactions CSV"
            description="Income, expenses and transfers."
          />

          <ExportRow
            href={`/reports/export/games?month=${selectedMonthKey}`}
            label="Game Sessions CSV"
            description="Sessions, results and void audit history."
            borderTop
          />

          <ExportRow
            href={`/reports/export/lending?month=${selectedMonthKey}`}
            label="Lending CSV"
            description="Loans and repayments."
            borderTop
          />
        </div>

        <p
          className="mt-3 text-[9px] leading-4"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Exports use the
          selected report month
          and Kathmandu timezone.
          Voided Game Sessions
          remain in the Games CSV
          for audit history.
        </p>
      </section>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <h2
      className="text-[10px] font-medium uppercase tracking-[0.14em]"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </h2>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  signed = false,
  borderTop = false,
  strong = false,
}: {
  label:
    string;

  value:
    bigint;

  tone?:
    | "positive"
    | "negative";

  signed?:
    boolean;

  borderTop?:
    boolean;

  strong?:
    boolean;
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

  if (
    signed
  ) {
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
        className={
          strong
            ? "text-sm font-semibold"
            : "text-sm"
        }
      >
        {label}
      </p>

      <p
        className={
          strong
            ? "text-sm font-semibold tabular-nums"
            : "text-xs font-semibold tabular-nums"
        }
        style={{
          color,
        }}
      >
        {formatSignedMoney(
          value,
          signed
        )}
      </p>
    </div>
  );
}

function ActivityCountRow({
  icon,
  label,
  count,
  color =
    "var(--foreground-secondary)",
  borderTop = false,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  count:
    number;

  color?:
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

          color,
        }}
      >
        {icon}
      </div>

      <p className="min-w-0 flex-1 text-sm font-medium">
        {label}
      </p>

      <p
        className="text-xs font-semibold tabular-nums"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        {count}
      </p>
    </div>
  );
}

function ExportRow({
  href,
  label,
  description,
  borderTop = false,
}: {
  href:
    string;

  label:
    string;

  description:
    string;

  borderTop?:
    boolean;
}) {
  return (
    <a
      href={
        href
      }
      className="flex items-center gap-3 px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
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
        <FileDown
          size={16}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {description}
        </p>
      </div>

      <span
        className="text-[10px] font-semibold"
        style={{
          color:
            "var(--primary)",
        }}
      >
        Export
      </span>
    </a>
  );
}

function sumTransactions(
  transactions:
    ReportTransaction[],

  type:
    ReportTransaction["transaction_type"]
) {
  return transactions.reduce(
    (
      total,
      transaction
    ) => {
      if (
        transaction.transaction_type !==
        type
      ) {
        return total;
      }

      return (
        total +
        moneyToCents(
          transaction.amount
        )
      );
    },
    BigInt(0)
  );
}

function countTransactions(
  transactions:
    ReportTransaction[],

  type:
    ReportTransaction["transaction_type"]
) {
  return transactions.filter(
    (
      transaction
    ) =>
      transaction.transaction_type ===
      type
  ).length;
}

function getGameSessionPnL(
  session:
    ReportGameSession
) {
  if (
    session.voided_at ||
    session.status !==
      "completed" ||
    session.result_type ===
      null ||
    session.result_amount ===
      null
  ) {
    return BigInt(0);
  }

  const amount =
    moneyToCents(
      session.result_amount
    );

  if (
    session.result_type ===
    "win"
  ) {
    return amount;
  }

  if (
    session.result_type ===
    "loss"
  ) {
    return -amount;
  }

  return BigInt(0);
}

function formatSignedMoney(
  value:
    bigint,

  signed:
    boolean
) {
  const negative =
    value <
    BigInt(0);

  const positive =
    value >
    BigInt(0);

  const absolute =
    negative
      ? -value
      : value;

  const prefix =
    signed &&
    positive
      ? "+"
      : signed &&
          negative
        ? "-"
        : "";

  return `${prefix}NPR ${formatMoneyFromCents(
    absolute
  )}`;
}

function getKathmanduMonthKey(
  value:
    string
    | Date
) {
  const date =
    typeof value ===
    "string"
      ? new Date(
          value
        )
      : value;

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
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

function getSafeMonthKey(
  requested:
    string,

  currentMonthKey:
    string
) {
  if (
    !/^\d{4}-\d{2}$/.test(
      requested
    )
  ) {
    return currentMonthKey;
  }

  const [
    year,
    month,
  ] =
    requested.split(
      "-"
    );

  const yearNumber =
    Number(
      year
    );

  const monthNumber =
    Number(
      month
    );

  if (
    !Number.isInteger(
      yearNumber
    ) ||
    !Number.isInteger(
      monthNumber
    ) ||
    monthNumber <
      1 ||
    monthNumber >
      12
  ) {
    return currentMonthKey;
  }

  if (
    requested >
    currentMonthKey
  ) {
    return currentMonthKey;
  }

  return requested;
}

function shiftMonthKey(
  monthKey:
    string,

  difference:
    number
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
          difference,
        1
      )
    );

  const shiftedYear =
    date
      .getUTCFullYear()
      .toString();

  const shiftedMonth =
    (
      date.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0"
      );

  return `${shiftedYear}-${shiftedMonth}`;
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
        month -
          1,
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

function firstSearchParam(
  value:
    | string
    | string[]
    | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}