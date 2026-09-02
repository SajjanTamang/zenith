import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Gamepad2,
  HandCoins,
  StickyNote,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  LoanActions,
} from "@/components/lending/loan-actions";

import {
  RepaymentHistoryItem,
} from "@/components/lending/repayment-history-item";

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

type Repayment =
  FinanceLoanRepayment & {
    id: string;
    loan_id: string;
    to_account_id: string;

    amount:
      | string
      | number;

    note:
      | string
      | null;

    repaid_at: string;
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
          claim_type,
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

          Money
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Money owed
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
          money owed:{" "}
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
      []) as Repayment[];

  const people =
    (peopleResult.data ??
      []) as Person[];

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const claimType =
    loan.claim_type ??
    "loan";

  const isGameWinnings =
    claimType ===
    "game_winnings";

  const isOtherReceivable =
    claimType ===
    "other";

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

  const sourceAccountArchived =
    Boolean(
      sourceAccount
        ?.archived_at
    );

  const loanEditAccounts =
    accounts
      .filter(
        (
          account
        ) =>
          isGameWinnings
            ? account.id ===
              loan.source_account_id
            : account.archived_at ===
                null ||
              account.id ===
                loan.source_account_id
      )
      .map(
        (
          account
        ) => ({
          id:
            account.id,

          name:
            account.name,

          archived:
            account.archived_at !==
            null,
        })
      );

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

  const accountsById =
    new Map(
      accounts.map(
        (
          account
        ) => [
          account.id,
          account,
        ]
      )
    );

  const eyebrow =
    isGameWinnings
      ? "Game winnings owed"
      : isOtherReceivable
        ? "Receivable"
        : "Money owed";

  const datePrefix =
    isGameWinnings ||
    isOtherReceivable
      ? "Recorded"
      : "Lent";

  const completedLabel =
    isGameWinnings
      ? "Winnings collected"
      : isOtherReceivable
        ? "Receivable collected"
        : "Loan repaid";

  const detailsTitle =
    isGameWinnings
      ? "Game winnings details"
      : isOtherReceivable
        ? "Receivable details"
        : "Loan details";

  const principalLabel =
    isGameWinnings
      ? "Winnings owed"
      : isOtherReceivable
        ? "Original receivable"
        : "Originally lent";

  const returnedLabel =
    isGameWinnings ||
    isOtherReceivable
      ? "Collected"
      : "Returned";

  const sourceLabel =
    isGameWinnings
      ? "Reclassified from"
      : isOtherReceivable
        ? "From account"
        : "Lent from";

  const dateLabel =
    isGameWinnings ||
    isOtherReceivable
      ? "Recorded on"
      : "Lent on";

  const originalHistoryTitle =
    isGameWinnings
      ? "Game winnings owed"
      : isOtherReceivable
        ? "Receivable recorded"
        : "Money lent";

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

        Money
      </Link>

      <div className="mt-5">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {eyebrow}
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {person?.name ??
            "Money owed"}
        </h1>

        <p
          className="mt-2 text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {datePrefix}{" "}
          {formatKathmanduDate(
            loan.lent_at
          )}
        </p>
      </div>

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
                ? completedLabel
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
            ) : isGameWinnings ? (
              <Gamepad2
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

      <section className="mt-7">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {detailsTitle}
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
            label={
              principalLabel
            }
            value={`NPR ${formatMoneyFromCents(
              principal
            )}`}
          />

          <SummaryRow
            label={
              returnedLabel
            }
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
            label={
              sourceLabel
            }
            value={
              sourceAccount
                ?.name ??
              "Unknown account"
            }
            borderTop
          />

          <SummaryRow
            label={
              dateLabel
            }
            value={
              formatKathmanduDate(
                loan.lent_at
              )
            }
            borderTop
          />

          {!isGameWinnings && (
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
          )}

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
            claimType={
              claimType
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
                recording money
                returned to you.
              </p>
            </div>
          </section>
        )}

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
            ) => {
              const currentAccount =
                accountsById.get(
                  repayment.to_account_id
                );

              const currentRepayment =
                moneyToCents(
                  repayment.amount
                );

              const maxAmount =
                outstanding +
                currentRepayment;

              const editorAccounts =
                accounts
                  .filter(
                    (
                      account
                    ) =>
                      account.archived_at ===
                        null ||
                      account.id ===
                        repayment.to_account_id
                  )
                  .map(
                    (
                      account
                    ) => ({
                      id:
                        account.id,

                      name:
                        account.name,

                      archived:
                        account.archived_at !==
                        null,
                    })
                  );

              return (
                <RepaymentHistoryItem
                  key={
                    repayment.id
                  }
                  repaymentId={
                    repayment.id
                  }
                  initialAccountId={
                    repayment.to_account_id
                  }
                  initialAmount={
                    repayment.amount
                  }
                  initialNote={
                    repayment.note ??
                    null
                  }
                  repaidAt={
                    repayment.repaid_at
                  }
                  accountName={
                    accountNames.get(
                      repayment.to_account_id
                    ) ??
                    "Account"
                  }
                  accountArchived={
                    Boolean(
                      currentAccount
                        ?.archived_at
                    )
                  }
                  maxAmountCents={
                    maxAmount.toString()
                  }
                  accounts={
                    editorAccounts
                  }
                  borderTop={
                    index >
                    0
                  }
                  claimType={
                    claimType
                  }
                />
              );
            }
          )}

          <LoanHistoryRow
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
            title={
              originalHistoryTitle
            }
            gameWinnings={
              isGameWinnings
            }
          />
        </div>
      </section>

      <LoanActions
        loanId={
          loan.id
        }
        initialPersonName={
          person?.name ??
          ""
        }
        initialSourceAccountId={
          loan.source_account_id
        }
        initialPrincipalAmount={
          String(
            loan.principal_amount
          )
        }
        initialDueDate={
          loan.due_date ??
          null
        }
        initialNote={
          loan.note ??
          null
        }
        totalRepaidCents={
          returned.toString()
        }
        repaymentCount={
          repayments.length
        }
        sourceAccountArchived={
          sourceAccountArchived
        }
        accounts={
          loanEditAccounts
        }
        claimType={
          claimType
        }
      />
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

function LoanHistoryRow({
  date,
  amount,
  accountName,
  note,
  borderTop,
  title,
  gameWinnings,
}: {
  date: string;
  amount: bigint;
  accountName: string;

  note?:
    | string
    | null;

  borderTop: boolean;
  title: string;
  gameWinnings: boolean;
}) {
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
            "var(--surface-secondary)",

          color:
            "var(--primary)",
        }}
      >
        {gameWinnings ? (
          <Gamepad2
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
              {title}
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

          <p className="shrink-0 text-sm font-semibold tabular-nums">
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
  value: string
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

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    date
  );
}