import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  HandCoins,
  RotateCcw,
  StickyNote,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  RepaymentForm,
} from "@/components/lending/repayment-form";

import {
  isLoanFullyPaid,
  isLoanOverdue,
  isLoanPartiallyPaid,
  loanOutstandingBalance,
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

type Loan =
  FinanceLoan & {
    lent_at: string;
  };

type Person = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;

  archived_at:
    | string
    | null;
};

type GameSession = {
  id: string;
  game_type: string;
  started_at: string;
};

export default async function LoanDetailPage({
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
    loanResult,
    repaymentsResult,
    peopleResult,
    accountsResult,
  ] =
    await Promise.all([
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
        `)
        .eq(
          "id",
          id
        )
        .maybeSingle(),

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
        .eq(
          "loan_id",
          id
        )
        .order(
          "repaid_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "loan_people"
        )
        .select(`
          id,
          name
        `),

      /*
        Keep ALL accounts here.

        Historical loans and repayments
        may reference an archived account,
        so we still need its name.
      */
      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name,
          archived_at
        `)
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        ),
    ]);

  if (
    loanResult.error ||
    repaymentsResult.error ||
    peopleResult.error ||
    accountsResult.error
  ) {
    return (
      <div>
        <Link
          href="/lending"
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          <ArrowLeft
            size={14}
          />

          Lending
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Loan
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
          Could not load loan:{" "}
          {loanResult.error
            ?.message ??
            repaymentsResult.error
              ?.message ??
            peopleResult.error
              ?.message ??
            accountsResult.error
              ?.message}
        </div>
      </div>
    );
  }

  if (
    !loanResult.data
  ) {
    notFound();
  }

  const loan =
    loanResult.data as Loan;

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  const people =
    (peopleResult.data ??
      []) as Person[];

  /*
    ALL accounts remain available
    for historical display.
  */
  const accounts =
    (accountsResult.data ??
      []) as Account[];

  /*
    Only ACTIVE accounts may receive
    a NEW repayment.
  */
  const repaymentAccounts =
    accounts
      .filter(
        (
          account
        ) =>
          account.archived_at ===
          null
      )
      .map(
        (
          account
        ) => ({
          id:
            account.id,

          name:
            account.name,
        })
      );

  const person =
    people.find(
      (
        item
      ) =>
        item.id ===
        loan.person_id
    );

  const sourceAccount =
    accounts.find(
      (
        account
      ) =>
        account.id ===
        loan.source_account_id
    );

  let gameSession:
    GameSession |
    null =
      null;

  if (
    loan.game_session_id
  ) {
    const {
      data,
    } =
      await supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          game_type,
          started_at
        `)
        .eq(
          "id",
          loan.game_session_id
        )
        .maybeSingle();

    gameSession =
      data as
        | GameSession
        | null;
  }

  const principal =
    moneyToCents(
      loan.principal_amount
    );

  const outstanding =
    loanOutstandingBalance(
      loan,
      repayments
    );

  const returned =
    principal -
    outstanding;

  const paid =
    isLoanFullyPaid(
      loan,
      repayments
    );

  const partial =
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
    paid
      ? "PAID"
      : overdue
        ? "OVERDUE"
        : partial
          ? "PARTIAL"
          : "UNPAID";

  const statusColor =
    paid
      ? "var(--positive)"
      : overdue
        ? "var(--negative)"
        : partial
          ? "var(--primary)"
          : "var(--foreground-muted)";

  const statusBackground =
    paid
      ? "var(--positive-soft)"
      : overdue
        ? "var(--negative-soft)"
        : partial
          ? "rgba(0, 102, 255, 0.10)"
          : "var(--surface-secondary)";

  /*
    Uses ALL accounts so older repayment
    history still shows the correct name.
  */
  const accountNames =
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

  return (
    <div>
      <Link
        href="/lending"
        className="inline-flex items-center gap-2 text-xs font-medium"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        <ArrowLeft
          size={14}
        />

        Lending
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
          Money owed
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {person?.name ??
            "Loan"}
        </h1>

        <p
          className="mt-2 text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Lent{" "}
          {formatKathmanduDate(
            loan.lent_at
          )}
        </p>
      </div>

      {/* Outstanding hero */}
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
              {paid
                ? "Loan repaid"
                : "Outstanding"}
            </p>

            <p
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{
                color:
                  paid
                    ? "var(--positive)"
                    : overdue
                      ? "var(--negative)"
                      : "var(--foreground)",
              }}
            >
              NPR{" "}
              {formatMoneyFromCents(
                outstanding
              )}
            </p>

            <span
              className="mt-3 inline-flex rounded-full px-2 py-1 text-[8px] font-semibold tracking-[0.08em]"
              style={{
                backgroundColor:
                  statusBackground,

                color:
                  statusColor,
              }}
            >
              {status}
            </span>
          </div>

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                paid
                  ? "var(--positive-soft)"
                  : overdue
                    ? "var(--negative-soft)"
                    : "var(--surface-secondary)",

              color:
                paid
                  ? "var(--positive)"
                  : overdue
                    ? "var(--negative)"
                    : "var(--primary)",
            }}
          >
            {paid ? (
              <Check
                size={18}
              />
            ) : overdue ? (
              <AlertTriangle
                size={18}
              />
            ) : (
              <HandCoins
                size={18}
              />
            )}
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-7">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Loan details
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
            label="Originally lent"
            value={`NPR ${formatMoneyFromCents(
              principal
            )}`}
          />

          <SummaryRow
            label="Returned"
            value={`NPR ${formatMoneyFromCents(
              returned
            )}`}
            borderTop
            valueColor={
              returned >
              BigInt(0)
                ? "var(--positive)"
                : undefined
            }
          />

          <SummaryRow
            label="Lent from"
            value={
              sourceAccount
                ?.name ??
              "Unknown account"
            }
            borderTop
          />

          <SummaryRow
            label="Lent on"
            value={
              formatKathmanduDate(
                loan.lent_at
              )
            }
            borderTop
          />

          <SummaryRow
            label="Due date"
            value={
              loan.due_date
                ? formatDateOnly(
                    loan.due_date
                  )
                : "No due date"
            }
            borderTop
            valueColor={
              overdue
                ? "var(--negative)"
                : undefined
            }
          />

          {gameSession && (
            <SummaryRow
              label="Game session"
              value={
                gameSession.game_type
              }
              borderTop
            />
          )}
        </div>
      </section>

      {/* Note */}
      {loan.note && (
        <section className="mt-7">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Note
          </p>

          <div
            className="mt-3 flex gap-3 rounded-[var(--radius-lg)] p-4"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
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
              <StickyNote
                size={15}
              />
            </div>

            <p
              className="pt-1 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {loan.note}
            </p>
          </div>
        </section>
      )}

      {/* Repayment */}
      {!paid &&
        repaymentAccounts.length >
          0 && (
          <RepaymentForm
            loanId={
              loan.id
            }
            outstandingCents={
              outstanding.toString()
            }
            accounts={
              repaymentAccounts
            }
          />
        )}

      {!paid &&
        repaymentAccounts.length ===
          0 && (
          <section className="mt-7">
            <div
              className="rounded-[var(--radius-lg)] p-4"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",
              }}
            >
              <p className="text-sm font-semibold">
                No active account
              </p>

              <p
                className="mt-1 text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Restore or create
                an account before
                recording a loan
                repayment.
              </p>
            </div>
          </section>
        )}

      {/* History */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            History
          </h2>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {repayments.length +
              1}{" "}
            {repayments.length +
              1 ===
            1
              ? "entry"
              : "entries"}
          </span>
        </div>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          {repayments.map(
            (
              repayment,
              index
            ) => (
              <HistoryRow
                key={
                  repayment.id
                }
                type="repayment"
                date={
                  repayment.repaid_at ??
                  ""
                }
                amount={
                  moneyToCents(
                    repayment.amount
                  )
                }
                accountName={
                  accountNames.get(
                    repayment.to_account_id
                  ) ??
                  "Account"
                }
                note={
                  repayment.note
                }
                borderTop={
                  index >
                  0
                }
              />
            )
          )}

          <HistoryRow
            type="loan"
            date={
              loan.lent_at
            }
            amount={
              principal
            }
            accountName={
              sourceAccount
                ?.name ??
              "Account"
            }
            note={
              loan.note
            }
            borderTop={
              repayments.length >
              0
            }
          />
        </div>
      </section>
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

function HistoryRow({
  type,
  date,
  amount,
  accountName,
  note,
  borderTop,
}: {
  type:
    | "loan"
    | "repayment";

  date: string;
  amount: bigint;
  accountName: string;

  note?:
    | string
    | null;

  borderTop: boolean;
}) {
  const repayment =
    type ===
    "repayment";

  return (
    <div
      className="flex items-start gap-3 px-4 py-4"
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
            repayment
              ? "var(--positive-soft)"
              : "var(--surface-secondary)",

          color:
            repayment
              ? "var(--positive)"
              : "var(--primary)",
        }}
      >
        {repayment ? (
          <RotateCcw
            size={15}
          />
        ) : (
          <WalletCards
            size={15}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {repayment
                ? "Repayment"
                : "Money lent"}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {formatKathmanduDate(
                date
              )}
              {" • "}
              {accountName}
            </p>
          </div>

          <p
            className="shrink-0 text-sm font-semibold tabular-nums"
            style={{
              color:
                repayment
                  ? "var(--positive)"
                  : "var(--foreground)",
            }}
          >
            {repayment
              ? "+"
              : ""}
            NPR{" "}
            {formatMoneyFromCents(
              amount
            )}
          </p>
        </div>

        {note && (
          <p
            className="mt-2 truncate text-[10px]"
            style={{
              color:
                "var(--foreground-secondary)",
            }}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

function formatKathmanduDate(
  value:
    string
) {
  if (
    !value
  ) {
    return "";
  }

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
        Number(
          year
        ),

        Number(
          month
        ) - 1,

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

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    date
  );
}