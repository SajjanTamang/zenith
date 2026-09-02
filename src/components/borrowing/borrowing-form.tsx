"use client";

import {
  HandCoins,
  UserRound,
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

type AccountOption = {
  id: string;
  name: string;
};

export function BorrowingForm({
  accounts,
}: {
  accounts: AccountOption[];
}) {
  const router =
    useRouter();

  const [
    personName,
    setPersonName,
  ] =
    useState("");

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
    loading,
    setLoading,
  ] =
    useState(false);

  const validAmount =
    isPositiveMoney(
      amount
    );

  const amountCents =
    validAmount
      ? moneyToCents(
          amount.trim()
        )
      : BigInt(0);

  const selectedAccount =
    accounts.find(
      (
        account
      ) =>
        account.id ===
        accountId
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanPersonName =
      personName.trim();

    const cleanAmount =
      amount.trim();

    if (
      !cleanPersonName
    ) {
      setError(
        "Enter the name of the person you borrowed from."
      );

      return;
    }

    if (
      !accountId
    ) {
      setError(
        "Select the account that received the borrowed money."
      );

      return;
    }

    if (
      !isPositiveMoney(
        cleanAmount
      )
    ) {
      setError(
        "Enter an amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    setLoading(
      true
    );

    const supabase =
      createClient();

    const {
      error:
        borrowingError,
    } =
      await supabase.rpc(
        "create_borrowing",
        {
          p_person_name:
            cleanPersonName,

          p_to_account_id:
            accountId,

          p_principal_amount:
            cleanAmount,

          p_due_date:
            null,

          p_note:
            note.trim() ||
            null,
        }
      );

    if (
      borrowingError
    ) {
      setError(
        borrowingError.message
      );

      setLoading(
        false
      );

      return;
    }

    router.replace(
      "/lending"
    );

    router.refresh();
  }

  if (
    accounts.length ===
    0
  ) {
    return (
      <div
        className="mt-8 rounded-[var(--radius-lg)] p-6"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <p className="text-sm font-semibold">
          No receiving account
        </p>

        <p
          className="mt-2 text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Create an active Cash,
          Bank, Wallet, or Other
          account before recording
          borrowed money.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-8"
    >
      <div
        className="overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <FormSection>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <UserRound
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="person-name"
                className="text-sm font-medium"
              >
                Borrowed from
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Person you now owe.
              </p>

              <input
                id="person-name"
                type="text"
                autoComplete="off"
                value={
                  personName
                }
                onChange={(
                  event
                ) => {
                  setPersonName(
                    event.target
                      .value
                  );

                  setError(
                    ""
                  );
                }}
                placeholder="Person name"
                disabled={
                  loading
                }
                className="mt-4 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none disabled:opacity-60 focus:border-[var(--primary)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  border:
                    "1px solid var(--border)",

                  color:
                    "var(--foreground)",
                }}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          borderTop
        >
          <div className="flex items-start gap-3">
            <FieldIcon>
              <HandCoins
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="borrowed-amount"
                className="text-sm font-medium"
              >
                Amount borrowed
              </label>

              <div className="relative mt-4">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  NPR
                </span>

                <input
                  id="borrowed-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={
                    amount
                  }
                  onChange={(
                    event
                  ) => {
                    setAmount(
                      event.target
                        .value
                    );

                    setError(
                      ""
                    );
                  }}
                  placeholder="0.00"
                  disabled={
                    loading
                  }
                  className="h-11 w-full rounded-[var(--radius-md)] pl-12 pr-3 text-right text-sm font-semibold tabular-nums outline-none disabled:opacity-60 focus:border-[var(--primary)]"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",

                    border:
                      "1px solid var(--border)",

                    color:
                      "var(--foreground)",
                  }}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          borderTop
        >
          <div className="flex items-start gap-3">
            <FieldIcon>
              <WalletCards
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="receiving-account"
                className="text-sm font-medium"
              >
                Receive into
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Account where the
                borrowed money became
                available.
              </p>

              <select
                id="receiving-account"
                value={
                  accountId
                }
                onChange={(
                  event
                ) => {
                  setAccountId(
                    event.target
                      .value
                  );

                  setError(
                    ""
                  );
                }}
                disabled={
                  loading
                }
                className="mt-4 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none disabled:opacity-60 focus:border-[var(--primary)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  border:
                    "1px solid var(--border)",

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
            </div>
          </div>
        </FormSection>

        <FormSection
          borderTop
        >
          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="note"
                className="text-sm font-medium"
              >
                Note
              </label>

              <span
                className="text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Optional
              </span>
            </div>

            <textarea
              id="note"
              value={
                note
              }
              onChange={(
                event
              ) =>
                setNote(
                  event.target
                    .value
                )
              }
              rows={3}
              placeholder="Borrowed while playing..."
              disabled={
                loading
              }
              className="mt-3 w-full resize-none rounded-[var(--radius-md)] p-3 text-sm leading-5 outline-none disabled:opacity-60 focus:border-[var(--primary)]"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                border:
                  "1px solid var(--border)",

                color:
                  "var(--foreground)",
              }}
            />
          </div>
        </FormSection>
      </div>

      {validAmount && (
        <div
          className="mt-4 rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <p
            className="text-[9px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Accounting preview
          </p>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span
              className="text-xs"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {
                selectedAccount
                  ?.name
              }
            </span>

            <span className="text-sm font-semibold tabular-nums">
              +NPR{" "}
              {formatMoneyFromCents(
                amountCents
              )}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4">
            <span
              className="text-xs"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              Money you owe
            </span>

            <span
              className="text-sm font-semibold tabular-nums"
              style={{
                color:
                  "var(--negative)",
              }}
            >
              +NPR{" "}
              {formatMoneyFromCents(
                amountCents
              )}
            </span>
          </div>

          <p
            className="mt-3 text-[10px] leading-4"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Borrowing is not
            income. Net worth
            does not increase.
          </p>
        </div>
      )}

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

      <div className="mt-6">
        <button
          type="submit"
          disabled={
            loading
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor:
              "var(--primary)",

            color:
              "var(--primary-foreground)",
          }}
        >
          <HandCoins
            size={16}
          />

          {loading
            ? "Recording borrowing..."
            : "Record Borrowing"}
        </button>

        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            router.back()
          }
          className="mt-2 h-11 w-full text-sm font-medium disabled:opacity-60"
          style={{
            color:
              "var(--foreground-secondary)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormSection({
  children,
  borderTop = false,
}: {
  children:
    React.ReactNode;

  borderTop?:
    boolean;
}) {
  return (
    <div
      className="p-5"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      {children}
    </div>
  );
}

function FieldIcon({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor:
          "var(--surface-secondary)",

        color:
          "var(--foreground-secondary)",
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