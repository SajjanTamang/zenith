"use client";

import {
  Check,
  ChevronDown,
  RotateCcw,
  StickyNote,
  WalletCards,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

type Account = {
  id: string;
  name: string;
};

export function RepaymentForm({
  loanId,
  outstandingCents,
  accounts,
}: {
  loanId: string;
  outstandingCents: string;
  accounts: Account[];
}) {
  const router =
    useRouter();

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    accountId,
    setAccountId,
  ] =
    useState(
      accounts[0]?.id ??
        ""
    );

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const outstanding =
    BigInt(
      outstandingCents
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanAmount =
      amount.trim();

    if (
      !isPositiveMoney(
        cleanAmount
      )
    ) {
      setError(
        "Enter a repayment amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (!accountId) {
      setError(
        "Select the account receiving the money."
      );

      return;
    }

    const amountCents =
      moneyToCents(
        cleanAmount
      );

    if (
      amountCents >
      outstanding
    ) {
      setError(
        `This loan only has NPR ${formatMoneyFromCents(
          outstanding
        )} outstanding.`
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      error:
        insertError,
    } =
      await supabase
        .from(
          "loan_repayments"
        )
        .insert({
          loan_id:
            loanId,

          to_account_id:
            accountId,

          amount:
            cleanAmount,

          note:
            note.trim() ||
            null,
        });

    if (
      insertError
    ) {
      setError(
        insertError.message
      );

      setLoading(false);

      return;
    }

    setAmount("");
    setNote("");

    setSuccess(
      `NPR ${formatMoneyFromCents(
        amountCents
      )} repayment recorded.`
    );

    setLoading(false);

    router.refresh();
  }

  if (
    outstanding <=
    BigInt(0)
  ) {
    return null;
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Repayment
          </p>

          <h2 className="mt-1 text-sm font-semibold">
            Record money returned
          </h2>
        </div>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "var(--positive-soft)",
            color:
              "var(--positive)",
          }}
        >
          <RotateCcw
            size={16}
          />
        </div>
      </div>

      {/* Amount */}
      <section className="mt-5">
        <div
          className="rounded-[var(--radius-lg)] px-4 py-4"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <div className="flex items-end gap-3">
            <span
              className="mb-1 text-xs font-medium"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              NPR
            </span>

            <input
              id="repayment-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={
                amount
              }
              onChange={(
                event
              ) =>
                setAmount(
                  event
                    .target
                    .value
                )
              }
              placeholder="0.00"
              disabled={
                loading
              }
              className="min-w-0 flex-1 bg-transparent text-right text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums outline-none disabled:opacity-60"
              style={{
                color:
                  "var(--foreground)",
              }}
            />
          </div>

          <div
            className="mt-4 border-t pt-3"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <p
              className="text-[10px] tabular-nums"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Outstanding: NPR{" "}
              {formatMoneyFromCents(
                outstanding
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="mt-4">
        <div
          className="overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <DetailIcon>
              <WalletCards
                size={15}
              />
            </DetailIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="repayment-account"
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Receive into
              </label>

              <div className="relative mt-1">
                <select
                  id="repayment-account"
                  value={
                    accountId
                  }
                  onChange={(
                    event
                  ) =>
                    setAccountId(
                      event
                        .target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                  className="h-8 w-full appearance-none bg-transparent pr-8 text-sm font-semibold outline-none disabled:opacity-60"
                  style={{
                    color:
                      "var(--foreground)",
                  }}
                >
                  {accounts.map(
                    (
                      account
                    ) => (
                      <option
                        key={
                          account.id
                        }
                        value={
                          account.id
                        }
                      >
                        {
                          account.name
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="flex items-start gap-3 px-4 py-4"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <DetailIcon>
              <StickyNote
                size={15}
              />
            </DetailIcon>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="repayment-note"
                  className="text-sm font-semibold"
                >
                  Note
                </label>

                <span
                  className="text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Optional
                </span>
              </div>

              <textarea
                id="repayment-note"
                value={
                  note
                }
                onChange={(
                  event
                ) =>
                  setNote(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Cash returned, bank transfer..."
                rows={2}
                disabled={
                  loading
                }
                className="mt-3 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
                style={{
                  color:
                    "var(--foreground)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
          style={{
            backgroundColor:
              "var(--negative-soft)",
            border:
              "1px solid var(--negative)",
            color:
              "var(--negative)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-xs font-medium"
          style={{
            backgroundColor:
              "var(--positive-soft)",
            border:
              "1px solid var(--positive)",
            color:
              "var(--positive)",
          }}
        >
          <Check
            size={14}
          />

          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={
          loading
        }
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor:
            "var(--primary)",
          color:
            "var(--primary-foreground)",
        }}
      >
        <Check
          size={16}
        />

        {loading
          ? "Recording..."
          : "Record Repayment"}
      </button>
    </form>
  );
}

function DetailIcon({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </div>
  );
}

function isPositiveMoney(
  value:
    string
) {
  const cleanValue =
    value.trim();

  if (
    !/^\d+(\.\d{1,2})?$/.test(
      cleanValue
    )
  ) {
    return false;
  }

  return (
    moneyToCents(
      cleanValue
    ) >
    BigInt(0)
  );
}