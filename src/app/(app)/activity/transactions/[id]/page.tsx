import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  LockKeyhole,
  StickyNote,
  Tag,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  TransactionActions,
} from "@/components/transactions/transaction-actions";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type Transaction = {
  id: string;

  transaction_type:
    | "income"
    | "expense"
    | "transfer";

  amount:
    | string
    | number;

  from_account_id:
    | string
    | null;

  to_account_id:
    | string
    | null;

  category:
    | string
    | null;

  note:
    | string
    | null;

  occurred_at: string;
};

type Account = {
  id: string;
  name: string;
};

export default async function TransactionDetailPage({
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
    transactionResult,
    accountsResult,
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
          from_account_id,
          to_account_id,
          category,
          note,
          occurred_at
        `)
        .eq(
          "id",
          id
        )
        .maybeSingle(),

      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name
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
    transactionResult.error ||
    accountsResult.error
  ) {
    return (
      <div>
        <Link
          href="/activity"
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          <ArrowLeft
            size={14}
          />

          Activity
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Transaction
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
          transaction:{" "}
          {transactionResult.error
            ?.message ??
            accountsResult.error
              ?.message}
        </div>
      </div>
    );
  }

  if (
    !transactionResult.data
  ) {
    notFound();
  }

  const transaction =
    transactionResult.data as Transaction;

  const accounts =
    (accountsResult.data ??
      []) as Account[];

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

  const amount =
    moneyToCents(
      transaction.amount
    );

  const protectedGameTransfer =
    transaction.transaction_type ===
      "transfer" &&
    (
      transaction.category ===
        "Game Bankroll Funding" ||
      transaction.category ===
        "Game Bankroll Settlement"
    );

  const fromAccount =
    transaction.from_account_id
      ? accountsById.get(
          transaction.from_account_id
        ) ??
        "Unknown account"
      : null;

  const toAccount =
    transaction.to_account_id
      ? accountsById.get(
          transaction.to_account_id
        ) ??
        "Unknown account"
      : null;

  const typeLabel =
    transaction.transaction_type ===
      "income"
      ? "Income"
      : transaction.transaction_type ===
          "expense"
        ? "Expense"
        : "Transfer";

  const amountColor =
    transaction.transaction_type ===
      "income"
      ? "var(--positive)"
      : transaction.transaction_type ===
          "expense"
        ? "var(--negative)"
        : "var(--foreground)";

  return (
    <div>
      <Link
        href="/activity"
        className="inline-flex items-center gap-2 text-xs font-medium"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        <ArrowLeft
          size={14}
        />

        Activity
      </Link>

      <div className="mt-5">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Transaction
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {typeLabel}
        </h1>

        <p
          className="mt-2 text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {formatKathmanduDateTime(
            transaction.occurred_at
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
              Amount
            </p>

            <p
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{
                color:
                  amountColor,
              }}
            >
              {transaction.transaction_type ===
              "income"
                ? "+"
                : transaction.transaction_type ===
                    "expense"
                  ? "-"
                  : ""}
              NPR{" "}
              {formatMoneyFromCents(
                amount
              )}
            </p>
          </div>

          <TransactionIcon
            type={
              transaction.transaction_type
            }
          />
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
          {transaction.transaction_type ===
            "income" && (
            <DetailRow
              icon={
                <WalletCards
                  size={15}
                />
              }
              label="Deposited to"
              value={
                toAccount ??
                "Unknown account"
              }
            />
          )}

          {transaction.transaction_type ===
            "expense" && (
            <DetailRow
              icon={
                <WalletCards
                  size={15}
                />
              }
              label="Paid from"
              value={
                fromAccount ??
                "Unknown account"
              }
            />
          )}

          {transaction.transaction_type ===
            "transfer" && (
            <>
              <DetailRow
                icon={
                  <WalletCards
                    size={15}
                  />
                }
                label="From"
                value={
                  fromAccount ??
                  "Unknown account"
                }
              />

              <DetailRow
                icon={
                  <WalletCards
                    size={15}
                  />
                }
                label="To"
                value={
                  toAccount ??
                  "Unknown account"
                }
                borderTop
              />
            </>
          )}

          {transaction.category &&
            !protectedGameTransfer && (
            <DetailRow
              icon={
                <Tag
                  size={15}
                />
              }
              label="Category"
              value={
                transaction.category
              }
              borderTop
            />
          )}

          <DetailRow
            icon={
              <CalendarDays
                size={15}
              />
            }
            label="Date"
            value={
              formatKathmanduDateTime(
                transaction.occurred_at
              )
            }
            borderTop
          />
        </div>
      </section>

      {transaction.note && (
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
              {transaction.note}
            </p>
          </div>
        </section>
      )}

      {protectedGameTransfer ? (
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
                  "var(--primary)",
              }}
            >
              <LockKeyhole
                size={16}
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Managed automatically
              </p>

              <p
                className="mt-1 text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                This transfer was
                created by a Game
                Session and cannot
                be edited or deleted
                independently.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <TransactionActions
          transactionId={
            transaction.id
          }
          transactionType={
            transaction.transaction_type
          }
          initialAmount={
            String(
              transaction.amount
            )
          }
          initialFromAccountId={
            transaction.from_account_id
          }
          initialToAccountId={
            transaction.to_account_id
          }
          initialCategory={
            transaction.category
          }
          initialNote={
            transaction.note
          }
          accounts={
            accounts
          }
        />
      )}
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

function TransactionIcon({
  type,
}: {
  type:
    Transaction["transaction_type"];
}) {
  const icon =
    type ===
      "income"
      ? (
        <ArrowDownLeft
          size={18}
        />
      )
      : type ===
          "expense"
        ? (
          <ArrowUpRight
            size={18}
          />
        )
        : (
          <ArrowLeftRight
            size={18}
          />
        );

  const color =
    type ===
      "income"
      ? "var(--positive)"
      : type ===
          "expense"
        ? "var(--negative)"
        : "var(--primary)";

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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
        "long",

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