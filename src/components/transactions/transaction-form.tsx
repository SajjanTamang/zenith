"use client";

import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  Repeat2,
  StickyNote,
  Tag,
  WalletCards,
} from "lucide-react";

import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

type TransactionType =
  | "expense"
  | "income"
  | "transfer";

export function TransactionForm({
  accounts,
}: {
  accounts: Account[];
}) {
  const [
    transactionType,
    setTransactionType,
  ] = useState<TransactionType>(
    "expense"
  );

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    primaryAccountId,
    setPrimaryAccountId,
  ] = useState(
    accounts[0]?.id ?? ""
  );

  const [
    toAccountId,
    setToAccountId,
  ] = useState(
    accounts[1]?.id ??
      accounts[0]?.id ??
      ""
  );

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  if (accounts.length === 0) {
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
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "var(--surface-secondary)",
              color:
                "var(--foreground-muted)",
            }}
          >
            <WalletCards
              size={18}
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Add an account first
            </p>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Transactions need an
              account to move money
              into or out of.
            </p>
          </div>
        </div>

        <Link
          href="/accounts/new"
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          <Plus size={15} />
          Add Account
        </Link>
      </div>
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
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
        "Enter an amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (!primaryAccountId) {
      setError(
        "Select an account."
      );

      return;
    }

    if (
      transactionType ===
      "transfer"
    ) {
      if (!toAccountId) {
        setError(
          "Select a destination account."
        );

        return;
      }

      if (
        primaryAccountId ===
        toAccountId
      ) {
        setError(
          "From account and to account must be different."
        );

        return;
      }
    }

    setLoading(true);

    const supabase =
      createClient();

    const fromAccountId =
      transactionType ===
      "income"
        ? null
        : primaryAccountId;

    const destinationAccountId =
      transactionType ===
      "expense"
        ? null
        : transactionType ===
            "income"
          ? primaryAccountId
          : toAccountId;

    const {
      error: insertError,
    } = await supabase
      .from("transactions")
      .insert({
        transaction_type:
          transactionType,

        amount:
          cleanAmount,

        from_account_id:
          fromAccountId,

        to_account_id:
          destinationAccountId,

        category:
          category.trim() ||
          null,

        note:
          note.trim() ||
          null,
      });

    if (insertError) {
      setError(
        insertError.message
      );

      setLoading(false);

      return;
    }

    setAmount("");
    setCategory("");
    setNote("");

    setSuccess(
      `${capitalize(
        transactionType
      )} added successfully.`
    );

    setLoading(false);
  }

  function selectType(
    type: TransactionType
  ) {
    setTransactionType(type);
    setError("");
    setSuccess("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 pb-20"
    >
      {/* Type selector */}
      <section>
        <p
          className="text-[9px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Transaction type
        </p>

        <div
          className="mt-3 grid grid-cols-3 rounded-[var(--radius-md)] p-1"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
          }}
        >
          <TypeButton
            label="Expense"
            type="expense"
            active={
              transactionType ===
              "expense"
            }
            disabled={loading}
            onClick={() =>
              selectType(
                "expense"
              )
            }
          />

          <TypeButton
            label="Income"
            type="income"
            active={
              transactionType ===
              "income"
            }
            disabled={loading}
            onClick={() =>
              selectType(
                "income"
              )
            }
          />

          <TypeButton
            label="Transfer"
            type="transfer"
            active={
              transactionType ===
              "transfer"
            }
            disabled={loading}
            onClick={() =>
              selectType(
                "transfer"
              )
            }
          />
        </div>
      </section>

      {/* Hero amount */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-[9px] font-medium uppercase tracking-[0.15em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {getAmountLabel(
                transactionType
              )}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {getAmountDescription(
                transactionType
              )}
            </p>
          </div>

          <TransactionIcon
            type={
              transactionType
            }
            size={17}
          />
        </div>

        <div
          className="mt-6 flex items-end gap-3 border-b pb-4"
          style={{
            borderColor:
              "var(--border)",
          }}
        >
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
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value
              )
            }
            placeholder="0.00"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent text-right text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              color:
                "var(--foreground)",
            }}
          />
        </div>
      </section>

      {/* Details */}
      <section className="mt-8">
        <p
          className="text-[9px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {transactionType ===
          "transfer"
            ? "Transfer between"
            : "Details"}
        </p>

        <div
          className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          {transactionType ===
          "transfer" ? (
            <TransferAccounts
              accounts={accounts}
              fromAccountId={
                primaryAccountId
              }
              toAccountId={
                toAccountId
              }
              disabled={
                loading
              }
              onFromChange={
                setPrimaryAccountId
              }
              onToChange={
                setToAccountId
              }
            />
          ) : (
            <>
              <DetailRow>
                <AccountField
                  id="account"
                  label={
                    transactionType ===
                    "income"
                      ? "Deposit to"
                      : "Pay from"
                  }
                  value={
                    primaryAccountId
                  }
                  accounts={
                    accounts
                  }
                  disabled={
                    loading
                  }
                  onChange={
                    setPrimaryAccountId
                  }
                />
              </DetailRow>

              <DetailRow borderTop>
                <div className="flex items-start gap-3">
                  <DetailIcon>
                    <Tag size={15} />
                  </DetailIcon>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="category"
                        className="text-sm font-semibold"
                      >
                        Category
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

                    <input
                      id="category"
                      type="text"
                      value={
                        category
                      }
                      onChange={(
                        event
                      ) =>
                        setCategory(
                          event.target
                            .value
                        )
                      }
                      placeholder={
                        transactionType ===
                        "income"
                          ? "Salary, Freelance, Other..."
                          : "Food, Transport, Shopping..."
                      }
                      disabled={
                        loading
                      }
                      className="mt-3 h-10 w-full bg-transparent text-sm outline-none disabled:opacity-60"
                      style={{
                        color:
                          "var(--foreground)",
                      }}
                    />
                  </div>
                </div>
              </DetailRow>
            </>
          )}

          <DetailRow borderTop>
            <div className="flex items-start gap-3">
              <DetailIcon>
                <StickyNote
                  size={15}
                />
              </DetailIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="note"
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
                  id="note"
                  value={note}
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event.target
                        .value
                    )
                  }
                  placeholder="Add a note..."
                  disabled={
                    loading
                  }
                  rows={2}
                  className="mt-3 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
                  style={{
                    color:
                      "var(--foreground)",
                  }}
                />
              </div>
            </div>
          </DetailRow>
        </div>
      </section>

      {/* Error */}
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

      {/* Success */}
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
          <Check size={14} />

          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor:
            "var(--primary)",
          color:
            "var(--primary-foreground)",
        }}
      >
        <TransactionIcon
          type={
            transactionType
          }
          size={16}
        />

        {loading
          ? "Saving..."
          : `Add ${capitalize(
              transactionType
            )}`}
      </button>
    </form>
  );
}

function TypeButton({
  label,
  type,
  active,
  disabled,
  onClick,
}: {
  label: string;
  type: TransactionType;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color =
    type === "expense"
      ? "var(--negative)"
      : type === "income"
        ? "var(--positive)"
        : "var(--primary)";

  const background =
    type === "expense"
      ? "var(--negative-soft)"
      : type === "income"
        ? "var(--positive-soft)"
        : "var(--surface-elevated)";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[10px] font-semibold transition disabled:opacity-60"
      style={{
        backgroundColor:
          active
            ? background
            : "transparent",

        color:
          active
            ? color
            : "var(--foreground-muted)",
      }}
    >
      <TransactionIcon
        type={type}
        size={12}
      />

      {label}
    </button>
  );
}

function TransferAccounts({
  accounts,
  fromAccountId,
  toAccountId,
  disabled,
  onFromChange,
  onToChange,
}: {
  accounts: Account[];
  fromAccountId: string;
  toAccountId: string;
  disabled: boolean;
  onFromChange: (
    value: string
  ) => void;
  onToChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="relative">
      <DetailRow>
        <AccountField
          id="from-account"
          label="From"
          value={fromAccountId}
          accounts={accounts}
          disabled={disabled}
          onChange={onFromChange}
        />
      </DetailRow>

      <div
        className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            "var(--surface-elevated)",
          border:
            "1px solid var(--border)",
          color:
            "var(--primary)",
        }}
      >
        <Repeat2 size={14} />
      </div>

      <DetailRow borderTop>
        <AccountField
          id="to-account"
          label="To"
          value={toAccountId}
          accounts={accounts}
          disabled={disabled}
          onChange={onToChange}
        />
      </DetailRow>
    </div>
  );
}

function AccountField({
  id,
  label,
  value,
  accounts,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  accounts: Account[];
  disabled: boolean;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <DetailIcon>
        <WalletCards
          size={15}
        />
      </DetailIcon>

      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="text-[9px] font-medium uppercase tracking-[0.11em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {label}
        </label>

        <div className="relative mt-1">
          <select
            id={id}
            value={value}
            onChange={(
              event
            ) =>
              onChange(
                event.target
                  .value
              )
            }
            disabled={disabled}
            className="h-8 w-full appearance-none bg-transparent pr-8 text-sm font-semibold outline-none disabled:opacity-60"
            style={{
              color:
                "var(--foreground)",
            }}
          >
            {accounts.map(
              (account) => (
                <option
                  key={
                    account.id
                  }
                  value={
                    account.id
                  }
                >
                  {account.name}
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
  );
}

function DetailRow({
  children,
  borderTop = false,
}: {
  children: ReactNode;
  borderTop?: boolean;
}) {
  return (
    <div
      className="px-4 py-4"
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

function DetailIcon({
  children,
}: {
  children: ReactNode;
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

function TransactionIcon({
  type,
  size,
}: {
  type: TransactionType;
  size: number;
}) {
  if (type === "income") {
    return (
      <ArrowDownLeft
        size={size}
      />
    );
  }

  if (type === "transfer") {
    return (
      <ArrowLeftRight
        size={size}
      />
    );
  }

  return (
    <ArrowUpRight
      size={size}
    />
  );
}

function getAmountLabel(
  type: TransactionType
) {
  if (type === "income") {
    return "Income amount";
  }

  if (type === "transfer") {
    return "Transfer amount";
  }

  return "Expense amount";
}

function getAmountDescription(
  type: TransactionType
) {
  if (type === "income") {
    return "Money received.";
  }

  if (type === "transfer") {
    return "Money moved between your accounts.";
  }

  return "Money spent.";
}

function isPositiveMoney(
  value: string
) {
  if (
    !/^\d+(\.\d{1,2})?$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    wholePart,
    decimalPart = "",
  ] = value.split(".");

  const cents =
    BigInt(wholePart) *
      BigInt(100) +
    BigInt(
      decimalPart.padEnd(
        2,
        "0"
      )
    );

  return cents > BigInt(0);
}

function capitalize(
  value: string
) {
  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}