import Link from "next/link";

import {
  ArrowLeft,
  Check,
  HandCoins,
  StickyNote,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  BorrowingRepaymentForm,
} from "@/components/borrowing/borrowing-repayment-form";

import {
  borrowingOutstandingBalance,
  type FinanceBorrowing,
  type FinanceBorrowingRepayment,
} from "@/lib/finance";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type Borrowing =
  FinanceBorrowing & {
    borrowed_at:
      string;
  };

type Account = {
  id:
    string;

  name:
    string;

  archived_at:
    | string
    | null;
};

type Person = {
  id:
    string;

  name:
    string;
};

export default async function BorrowingDetailPage({
  params,
}: {
  params:
    Promise<{
      id:
        string;
    }>;
}) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const [
    borrowingResult,
    repaymentsResult,
    peopleResult,
    accountsResult,
  ] =
    await Promise.all([
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
        .eq(
          "id",
          id
        )
        .maybeSingle(),

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
        .eq(
          "borrowing_id",
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
        `),
    ]);

  const error =
    borrowingResult.error ??
    repaymentsResult.error ??
    peopleResult.error ??
    accountsResult.error;

  if (
    error
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
          borrowing:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  if (
    !borrowingResult.data
  ) {
    notFound();
  }

  const borrowing =
    borrowingResult.data as Borrowing;

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceBorrowingRepayment[];

  const people =
    (peopleResult.data ??
      []) as Person[];

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const personName =
    people.find(
      (
        person
      ) =>
        person.id ===
        borrowing.person_id
    )?.name ??
    "Unknown person";

  const receivingAccountName =
    accounts.find(
      (
        account
      ) =>
        account.id ===
        borrowing.to_account_id
    )?.name ??
    "Unknown account";

  const outstanding =
    borrowingOutstandingBalance(
      borrowing,
      repayments
    );

  const principal =
    moneyToCents(
      borrowing.principal_amount
    );

  const repaid =
    principal -
    outstanding;

  const fullyPaid =
    outstanding ===
    BigInt(0);

  const activeAccounts =
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

      {/* Header */}
      <div className="mt-5 flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              fullyPaid
                ? "var(--positive-soft)"
                : "var(--negative-soft)",

            color:
              fullyPaid
                ? "var(--positive)"
                : "var(--negative)",
          }}
        >
          {fullyPaid ? (
            <Check
              size={18}
            />
          ) : (
            <WalletCards
              size={18}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Money I owe
          </p>

          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {personName}
          </h1>

          <p
            className="mt-1 text-xs"
            style={{
              color:
                fullyPaid
                  ? "var(--positive)"
                  : "var(--negative)",
            }}
          >
            {fullyPaid
              ? "Fully repaid"
              : "Outstanding debt"}
          </p>
        </div>
      </div>

      {/* Outstanding */}
      <section
        className="mt-7 rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Outstanding
        </p>

        <p
          className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
          style={{
            color:
              outstanding >
              BigInt(0)
                ? "var(--negative)"
                : "var(--positive)",
          }}
        >
          NPR{" "}
          {formatMoneyFromCents(
            outstanding
          )}
        </p>

        <div
          className="mt-5 grid grid-cols-2 gap-4 border-t pt-4"
          style={{
            borderColor:
              "var(--border)",
          }}
        >
          <Stat
            label="Borrowed"
            value={
              `NPR ${formatMoneyFromCents(
                principal
              )}`
            }
          />

          <Stat
            label="Repaid"
            value={
              `NPR ${formatMoneyFromCents(
                repaid
              )}`
            }
          />
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
          Details
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
          <DetailRow
            icon={
              <UserRound
                size={15}
              />
            }
            label="Borrowed from"
            value={
              personName
            }
          />

          <DetailRow
            icon={
              <WalletCards
                size={15}
              />
            }
            label="Received into"
            value={
              receivingAccountName
            }
            borderTop
          />

          <DetailRow
            icon={
              <HandCoins
                size={15}
              />
            }
            label="Borrowed on"
            value={
              formatKathmanduDateTime(
                borrowing.borrowed_at
              )
            }
            borderTop
          />

          <DetailRow
            icon={
              <Check
                size={15}
              />
            }
            label="Status"
            value={
              fullyPaid
                ? "Fully repaid"
                : "Outstanding"
            }
            borderTop
          />
        </div>
      </section>

      {borrowing.note && (
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
            <StickyNote
              size={15}
              className="mt-0.5 shrink-0"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            />

            <p
              className="text-xs leading-5"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {borrowing.note}
            </p>
          </div>
        </section>
      )}

      {/* Repayment history */}
      <section className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Repayment history
          </p>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              repayments.length
            }{" "}
            {repayments.length ===
            1
              ? "payment"
              : "payments"}
          </span>
        </div>

        {repayments.length ===
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
            <p className="text-sm font-semibold">
              Nothing repaid yet
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Payments you make
              will appear here.
            </p>
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
            {repayments.map(
              (
                repayment,
                index
              ) => (
                <div
                  key={
                    repayment.id
                  }
                  className="flex items-start justify-between gap-4 px-4 py-4"
                  style={{
                    borderTop:
                      index >
                      0
                        ? "1px solid var(--border)"
                        : undefined,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Paid from{" "}
                      {accountsById.get(
                        repayment.from_account_id
                      ) ??
                        "Unknown account"}
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      {repayment.repaid_at
                        ? formatKathmanduDateTime(
                            repayment.repaid_at
                          )
                        : "Repayment"}
                    </p>

                    {repayment.note && (
                      <p
                        className="mt-2 text-[10px]"
                        style={{
                          color:
                            "var(--foreground-secondary)",
                        }}
                      >
                        {repayment.note}
                      </p>
                    )}
                  </div>

                  <p
                    className="shrink-0 text-sm font-semibold tabular-nums"
                    style={{
                      color:
                        "var(--positive)",
                    }}
                  >
                    NPR{" "}
                    {formatMoneyFromCents(
                      moneyToCents(
                        repayment.amount
                      )
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {!fullyPaid && (
        <BorrowingRepaymentForm
          borrowingId={
            borrowing.id
          }
          outstandingCents={
            outstanding.toString()
          }
          accounts={
            activeAccounts
          }
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <p
        className="text-[9px] font-medium uppercase tracking-[0.12em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  borderTop = false,
}: {
  icon:
    React.ReactNode;

  label:
    string;

  value:
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

          color:
            "var(--foreground-muted)",
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[9px] font-medium uppercase tracking-[0.11em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatKathmanduDateTime(
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

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}