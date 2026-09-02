import Link from "next/link";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock3,
  HandCoins,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  borrowingOutstandingBalance,
  isBorrowingOverdue,
  isBorrowingPartiallyPaid,
  isLoanFullyPaid,
  isLoanOverdue,
  isLoanPartiallyPaid,
  loanOutstandingBalance,
  totalOutstandingBorrowings,
  totalOutstandingLoans,
  type FinanceBorrowing,
  type FinanceBorrowingRepayment,
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

type Loan =
  FinanceLoan & {
    lent_at: string;
  };

type Borrowing =
  FinanceBorrowing & {
    borrowed_at: string;
  };

export default async function LendingPage() {
  const supabase =
    await createClient();

  const [
    peopleResult,
    loansResult,
    loanRepaymentsResult,
    accountsResult,
    borrowingsResult,
    borrowingRepaymentsResult,
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
        .from(
          "accounts"
        )
        .select(`
          id,
          name
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
        `)
        .order(
          "borrowed_at",
          {
            ascending:
              false,
          }
        ),

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
        `)
        .order(
          "repaid_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  const error =
    peopleResult.error ??
    loansResult.error ??
    loanRepaymentsResult.error ??
    accountsResult.error ??
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
          Money
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
          Could not load money
          data:{" "}
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

  const loanRepayments =
    (loanRepaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const borrowings =
    (borrowingsResult.data ??
      []) as Borrowing[];

  const borrowingRepayments =
    (borrowingRepaymentsResult.data ??
      []) as FinanceBorrowingRepayment[];

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

  /*
    MONEY OWED TO USER
  */
  const outstandingLoans =
    loans.filter(
      (
        loan
      ) =>
        !isLoanFullyPaid(
          loan,
          loanRepayments
        )
    );

  const paidLoans =
    loans.filter(
      (
        loan
      ) =>
        isLoanFullyPaid(
          loan,
          loanRepayments
        )
    );

  /*
    MONEY USER OWES
  */
  const outstandingBorrowings =
    borrowings.filter(
      (
        borrowing
      ) =>
        borrowingOutstandingBalance(
          borrowing,
          borrowingRepayments
        ) >
        BigInt(0)
    );

  const paidBorrowings =
    borrowings.filter(
      (
        borrowing
      ) =>
        borrowingOutstandingBalance(
          borrowing,
          borrowingRepayments
        ) ===
        BigInt(0)
    );

  const totalOwedToYou =
    totalOutstandingLoans(
      loans,
      loanRepayments
    );

  const totalYouOwe =
    totalOutstandingBorrowings(
      borrowings,
      borrowingRepayments
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

  const debtPeople =
    new Set(
      outstandingBorrowings.map(
        (
          borrowing
        ) =>
          borrowing.person_id
      )
    ).size;

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
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
            Money
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/quick-add?type=lend"
            className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",

              color:
                "var(--foreground)",
            }}
          >
            <HandCoins
              size={14}
            />

            Lend
          </Link>

          <Link
            href="/lending/borrow"
            className="flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold"
            style={{
              backgroundColor:
                "var(--primary)",

              color:
                "var(--primary-foreground)",
            }}
          >
            <WalletCards
              size={14}
            />

            Borrow
          </Link>
        </div>
      </div>

      <p
        className="mt-3 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Track money people
        owe you and money you
        need to pay back.
      </p>

      {/* Summary */}
      <section className="mt-8 grid grid-cols-2 gap-3">
        <div
          className="rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
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

          <p
            className="mt-3 text-xl font-semibold tracking-tight tabular-nums"
            style={{
              color:
                totalOwedToYou >
                BigInt(0)
                  ? "var(--primary)"
                  : "var(--foreground)",
            }}
          >
            NPR{" "}
            {formatMoneyFromCents(
              totalOwedToYou
            )}
          </p>

          <p
            className="mt-2 text-[9px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
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
          className="rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
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
            className="mt-3 text-xl font-semibold tracking-tight tabular-nums"
            style={{
              color:
                totalYouOwe >
                BigInt(0)
                  ? "var(--negative)"
                  : "var(--foreground)",
            }}
          >
            NPR{" "}
            {formatMoneyFromCents(
              totalYouOwe
            )}
          </p>

          <p
            className="mt-2 text-[9px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              debtPeople
            }{" "}
            {debtPeople ===
            1
              ? "person"
              : "people"}
          </p>
        </div>
      </section>

      {/* Owed to you */}
      <section className="mt-8">
        <SectionHeader
          title="Owed to you"
          count={`${outstandingLoans.length} open`}
        />

        {outstandingLoans.length ===
        0 ? (
          <EmptyOwedToYou />
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
                    loanRepayments
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

      {/* I owe */}
      <section className="mt-8">
        <SectionHeader
          title="I owe"
          count={`${outstandingBorrowings.length} open`}
        />

        {outstandingBorrowings.length ===
        0 ? (
          <EmptyBorrowing />
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
            {outstandingBorrowings.map(
              (
                borrowing,
                index
              ) => (
                <BorrowingRow
                  key={
                    borrowing.id
                  }
                  borrowing={
                    borrowing
                  }
                  repayments={
                    borrowingRepayments
                  }
                  personName={
                    peopleById.get(
                      borrowing.person_id
                    ) ??
                    "Unknown person"
                  }
                  accountName={
                    accountsById.get(
                      borrowing.to_account_id
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

      {/* Returned to you */}
      <section className="mt-8">
        <SectionHeader
          title="Returned to you"
          count={`${paidLoans.length} completed`}
        />

        {paidLoans.length ===
        0 ? (
          <EmptyHistory
            title="Nothing returned yet"
            description="Fully collected loans and receivables will appear here."
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

      {/* Repaid by you */}
      <section className="mt-8">
        <SectionHeader
          title="Repaid by you"
          count={`${paidBorrowings.length} completed`}
        />

        {paidBorrowings.length ===
        0 ? (
          <EmptyHistory
            title="No repaid debts yet"
            description="Borrowings you fully repay will remain here for history."
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
            {paidBorrowings.map(
              (
                borrowing,
                index
              ) => (
                <PaidBorrowingRow
                  key={
                    borrowing.id
                  }
                  borrowing={
                    borrowing
                  }
                  personName={
                    peopleById.get(
                      borrowing.person_id
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

/* =========================================================
   ACTIVE MONEY OWED TO USER
   ========================================================= */

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

  personName: string;

  accountName: string;

  borderTop: boolean;
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

  const claimLabel =
    loan.claim_type ===
    "game_winnings"
      ? "Game winnings"
      : loan.claim_type ===
          "other"
        ? "Receivable"
        : "Loan";

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
                {claimLabel}
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
                    overdue
                      ? "var(--negative-soft)"
                      : partiallyPaid
                        ? "rgba(0, 102, 255, 0.10)"
                        : "var(--surface-secondary)",

                  color:
                    overdue
                      ? "var(--negative)"
                      : partiallyPaid
                        ? "var(--primary)"
                        : "var(--foreground-muted)",
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
              className="shrink-0"
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

/* =========================================================
   ACTIVE MONEY USER OWES
   ========================================================= */

function BorrowingRow({
  borrowing,
  repayments,
  personName,
  accountName,
  borderTop,
}: {
  borrowing: Borrowing;

  repayments:
    FinanceBorrowingRepayment[];

  personName: string;

  accountName: string;

  borderTop: boolean;
}) {
  const principal =
    moneyToCents(
      borrowing.principal_amount
    );

  const outstanding =
    borrowingOutstandingBalance(
      borrowing,
      repayments
    );

  const repaid =
    principal -
    outstanding;

  const partiallyPaid =
    isBorrowingPartiallyPaid(
      borrowing,
      repayments
    );

  const overdue =
    isBorrowingOverdue(
      borrowing,
      repayments
    );

  const status =
    overdue
      ? "OVERDUE"
      : partiallyPaid
        ? "PARTIAL"
        : "UNPAID";

  return (
    <Link
      href={`/lending/borrowings/${borrowing.id}`}
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
              overdue
                ? "var(--negative-soft)"
                : "var(--surface-secondary)",

            color:
              "var(--negative)",
          }}
        >
          {overdue ? (
            <AlertTriangle
              size={16}
            />
          ) : (
            <WalletCards
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
                Borrowed{" "}
                {formatKathmanduDate(
                  borrowing.borrowed_at
                )}
                {" • "}
                {accountName}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="text-sm font-semibold tabular-nums"
                style={{
                  color:
                    "var(--negative)",
                }}
              >
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
                you owe
              </p>
            </div>
          </div>

          {borrowing.note && (
            <p
              className="mt-3 truncate text-[10px]"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {borrowing.note}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[8px] font-semibold tracking-[0.08em]"
                style={{
                  backgroundColor:
                    overdue
                      ? "var(--negative-soft)"
                      : partiallyPaid
                        ? "rgba(0, 102, 255, 0.10)"
                        : "var(--surface-secondary)",

                  color:
                    overdue
                      ? "var(--negative)"
                      : partiallyPaid
                        ? "var(--primary)"
                        : "var(--foreground-muted)",
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
                  repaid
                </span>
              )}
            </div>

            <ChevronRight
              size={15}
              className="shrink-0"
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

/* =========================================================
   COMPLETED RECEIVABLE
   ========================================================= */

function PaidLoanRow({
  loan,
  personName,
  borderTop,
}: {
  loan: Loan;

  personName: string;

  borderTop: boolean;
}) {
  const principal =
    moneyToCents(
      loan.principal_amount
    );

  const claimLabel =
    loan.claim_type ===
    "game_winnings"
      ? "Game winnings collected"
      : loan.claim_type ===
          "other"
        ? "Receivable collected"
        : "Loan fully returned";

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
          {claimLabel}
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
        className="shrink-0"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      />
    </Link>
  );
}

/* =========================================================
   COMPLETED BORROWING
   ========================================================= */

function PaidBorrowingRow({
  borrowing,
  personName,
  borderTop,
}: {
  borrowing: Borrowing;

  personName: string;

  borderTop: boolean;
}) {
  const principal =
    moneyToCents(
      borrowing.principal_amount
    );

  return (
    <Link
      href={`/lending/borrowings/${borrowing.id}`}
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
          Borrowing fully repaid
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
        className="shrink-0"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      />
    </Link>
  );
}

/* =========================================================
   SHARED UI
   ========================================================= */

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {title}
      </h2>

      <span
        className="text-[10px]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function EmptyOwedToYou() {
  return (
    <div
      className="mt-3 rounded-[var(--radius-lg)] px-5 py-6"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        Nobody owes you money
      </p>

      <p
        className="mt-1 text-[10px] leading-4"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Loans and receivables
        will appear here.
      </p>
    </div>
  );
}

function EmptyBorrowing() {
  return (
    <div
      className="mt-3 rounded-[var(--radius-lg)] px-5 py-6"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        You do not owe anyone
      </p>

      <p
        className="mt-1 text-[10px] leading-4"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Borrowed money will
        appear here until it is
        fully repaid.
      </p>

      <Link
        href="/lending/borrow"
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-xs font-semibold"
        style={{
          backgroundColor:
            "var(--surface-secondary)",

          color:
            "var(--foreground)",
        }}
      >
        <WalletCards
          size={14}
        />

        Record Borrowing
      </Link>
    </div>
  );
}

function EmptyHistory({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
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
            size={15}
          />
        </div>

        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p
            className="mt-1 text-[10px] leading-4"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatKathmanduDate(
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
  value: string
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
        Number(
          year
        ),

        Number(
          month
        ) -
          1,

        Number(
          day
        )
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