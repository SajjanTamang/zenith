import Link from "next/link";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  HandCoins,
  UserRound,
} from "lucide-react";

import {
  isLoanFullyPaid,
  isLoanOverdue,
  isLoanPartiallyPaid,
  loanOutstandingBalance,
  totalOutstandingLoans,
  type FinanceLoan,
  type FinanceLoanRepayment,
} from "@/lib/finance";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type LoanPerson = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
};

type Loan = FinanceLoan & {
  lent_at: string;
};

export default async function LendingPage() {
  const supabase =
    await createClient();

  const [
    peopleResult,
    loansResult,
    repaymentsResult,
    accountsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "loan_people"
        )
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
        `)
        .order(
          "lent_at",
          {
            ascending:
              false,
          }
        ),

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
        `)
        .order(
          "repaid_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from("accounts")
        .select(`
          id,
          name
        `),
    ]);

  const error =
    peopleResult.error ??
    loansResult.error ??
    repaymentsResult.error ??
    accountsResult.error;

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
          Lending
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
          lending data:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const people =
    (peopleResult.data ??
      []) as LoanPerson[];

  const loans =
    (loansResult.data ??
      []) as Loan[];

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const peopleById =
    new Map(
      people.map(
        (
          person
        ) => [
          person.id,
          person.name,
        ]
      )
    );

  const accountsById =
    new Map(
      accounts.map(
        (
          account
        ) => [
          account.id,
          account.name,
        ]
      )
    );

  const outstandingLoans =
    loans.filter(
      (
        loan
      ) =>
        !isLoanFullyPaid(
          loan,
          repayments
        )
    );

  const paidLoans =
    loans.filter(
      (
        loan
      ) =>
        isLoanFullyPaid(
          loan,
          repayments
        )
    );

  const totalOutstanding =
    totalOutstandingLoans(
      loans,
      repayments
    );

  const outstandingPeople =
    new Set(
      outstandingLoans.map(
        (
          loan
        ) =>
          loan.person_id
      )
    ).size;

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
            Lending
          </h1>
        </div>

        <Link
          href="/quick-add?type=lend"
          className="flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",

            color:
              "var(--primary-foreground)",
          }}
        >
          <HandCoins
            size={14}
          />

          Lend
        </Link>
      </div>

      <p
        className="mt-3 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Keep track of money
        you have lent and what
        still needs to come
        back.
      </p>

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
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Money owed to you
            </p>

            <p
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{
                color:
                  totalOutstanding >
                  BigInt(0)
                    ? "var(--primary)"
                    : "var(--foreground)",
              }}
            >
              NPR{" "}
              {formatMoneyFromCents(
                totalOutstanding
              )}
            </p>

            <p
              className="mt-2 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {
                outstandingLoans.length
              }{" "}
              {outstandingLoans.length ===
              1
                ? "outstanding loan"
                : "outstanding loans"}
              {" • "}
              {
                outstandingPeople
              }{" "}
              {outstandingPeople ===
              1
                ? "person"
                : "people"}
            </p>
          </div>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--primary)",
            }}
          >
            <HandCoins
              size={18}
            />
          </div>
        </div>
      </section>

      {/* Outstanding */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Outstanding
          </h2>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              outstandingLoans.length
            }{" "}
            open
          </span>
        </div>

        {outstandingLoans.length ===
        0 ? (
          <EmptyOutstanding />
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
            {outstandingLoans.map(
              (
                loan,
                index
              ) => (
                <LoanRow
                  key={
                    loan.id
                  }
                  loan={
                    loan
                  }
                  repayments={
                    repayments
                  }
                  personName={
                    peopleById.get(
                      loan.person_id
                    ) ??
                    "Unknown person"
                  }
                  accountName={
                    accountsById.get(
                      loan.source_account_id
                    ) ??
                    "Unknown account"
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

      {/* Paid */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Paid
          </h2>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              paidLoans.length
            }{" "}
            completed
          </span>
        </div>

        {paidLoans.length ===
        0 ? (
          <div
            className="mt-3 rounded-[var(--radius-lg)] px-5 py-6"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--foreground-muted)",
                }}
              >
                <Check
                  size={16}
                />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  No completed
                  loans yet
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Fully repaid
                  lending will
                  appear here.
                </p>
              </div>
            </div>
          </div>
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
            {paidLoans.map(
              (
                loan,
                index
              ) => (
                <PaidLoanRow
                  key={
                    loan.id
                  }
                  loan={
                    loan
                  }
                  personName={
                    peopleById.get(
                      loan.person_id
                    ) ??
                    "Unknown person"
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

function LoanRow({
  loan,
  repayments,
  personName,
  accountName,
  borderTop,
}: {
  loan: Loan;

  repayments:
    FinanceLoanRepayment[];

  personName:
    string;

  accountName:
    string;

  borderTop:
    boolean;
}) {
  const principal =
    moneyToCents(
      loan.principal_amount
    );

  const outstanding =
    loanOutstandingBalance(
      loan,
      repayments
    );

  const repaid =
    principal -
    outstanding;

  const partiallyPaid =
    isLoanPartiallyPaid(
      loan,
      repayments
    );

  const overdue =
    isLoanOverdue(
      loan,
      repayments
    );

  const status =
    overdue
      ? "OVERDUE"
      : partiallyPaid
        ? "PARTIAL"
        : "UNPAID";

  const statusColor =
    overdue
      ? "var(--negative)"
      : partiallyPaid
        ? "var(--primary)"
        : "var(--foreground-muted)";

  const statusBackground =
    overdue
      ? "var(--negative-soft)"
      : partiallyPaid
        ? "rgba(0, 102, 255, 0.10)"
        : "var(--surface-secondary)";

  return (
    <Link
      href={`/lending/${loan.id}`}
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
              "var(--surface-secondary)",

            color:
              overdue
                ? "var(--negative)"
                : "var(--primary)",
          }}
        >
          {overdue ? (
            <AlertTriangle
              size={16}
            />
          ) : (
            <UserRound
              size={16}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {personName}
              </p>

              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Lent{" "}
                {formatKathmanduDate(
                  loan.lent_at
                )}
                {" • "}
                {accountName}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                NPR{" "}
                {formatMoneyFromCents(
                  outstanding
                )}
              </p>

              <p
                className="mt-1 text-[9px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                outstanding
              </p>
            </div>
          </div>

          {loan.note && (
            <p
              className="mt-3 truncate text-[10px]"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {loan.note}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[8px] font-semibold tracking-[0.08em]"
                style={{
                  backgroundColor:
                    statusBackground,

                  color:
                    statusColor,
                }}
              >
                {status}
              </span>

              {repaid >
                BigInt(0) && (
                <span
                  className="text-[9px] tabular-nums"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  NPR{" "}
                  {formatMoneyFromCents(
                    repaid
                  )}{" "}
                  returned
                </span>
              )}

              {loan.due_date && (
                <span
                  className="flex items-center gap-1 text-[9px]"
                  style={{
                    color:
                      overdue
                        ? "var(--negative)"
                        : "var(--foreground-muted)",
                  }}
                >
                  <Clock3
                    size={10}
                  />

                  Due{" "}
                  {formatDateOnly(
                    loan.due_date
                  )}
                </span>
              )}
            </div>

            <ChevronRight
              size={15}
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PaidLoanRow({
  loan,
  personName,
  borderTop,
}: {
  loan: Loan;

  personName:
    string;

  borderTop:
    boolean;
}) {
  const principal =
    moneyToCents(
      loan.principal_amount
    );

  return (
    <Link
      href={`/lending/${loan.id}`}
      className="flex items-center gap-3 px-4 py-4 transition hover:brightness-[0.98]"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            "var(--positive-soft)",

          color:
            "var(--positive)",
        }}
      >
        <Check
          size={15}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {personName}
        </p>

        <p
          className="mt-1 text-[10px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Fully repaid
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold tabular-nums">
          NPR{" "}
          {formatMoneyFromCents(
            principal
          )}
        </p>

        <p
          className="mt-1 text-[9px]"
          style={{
            color:
              "var(--positive)",
          }}
        >
          PAID
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
  );
}

function EmptyOutstanding() {
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
        <HandCoins
          size={19}
        />
      </div>

      <h2 className="mt-4 text-sm font-semibold">
        Nobody owes you
        money
      </h2>

      <p
        className="mt-2 max-w-xs text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Outstanding loans
        will appear here
        whenever you lend
        money.
      </p>

      <Link
        href="/quick-add?type=lend"
        className="mt-5 flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold"
        style={{
          backgroundColor:
            "var(--primary)",

          color:
            "var(--primary-foreground)",
        }}
      >
        <HandCoins
          size={15}
        />

        Lend Money
      </Link>
    </div>
  );
}

function formatKathmanduDate(
  value:
    string
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

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatDateOnly(
  value:
    string
) {
  const [
    year,
    month,
    day,
  ] =
    value.split(
      "-"
    );

  const date =
    new Date(
      Date.UTC(
        Number(year),
        Number(month) -
          1,
        Number(day)
      )
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    date
  );
}