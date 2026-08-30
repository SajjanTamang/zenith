"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: string;
};

type TransactionType = "expense" | "income" | "transfer";

export function TransactionForm({
  accounts,
}: {
  accounts: Account[];
}) {
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");

  const [amount, setAmount] = useState("");
  const [primaryAccountId, setPrimaryAccountId] = useState(
    accounts[0]?.id ?? ""
  );

  const [toAccountId, setToAccountId] = useState(
    accounts[1]?.id ?? accounts[0]?.id ?? ""
  );

  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (accounts.length === 0) {
    return (
      <div
        className="mt-8 rounded-[var(--radius-lg)] p-6 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <h2 className="text-sm font-semibold">
          Add an account first
        </h2>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Transactions need an account to move money into or out of.
        </p>

        <Link
          href="/accounts/new"
          className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-md)] px-4 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
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

    const cleanAmount = amount.trim();

    if (!isPositiveMoney(cleanAmount)) {
      setError(
        "Enter an amount greater than 0 with no more than 2 decimal places."
      );
      return;
    }

    if (!primaryAccountId) {
      setError("Select an account.");
      return;
    }

    if (transactionType === "transfer") {
      if (!toAccountId) {
        setError("Select a destination account.");
        return;
      }

      if (primaryAccountId === toAccountId) {
        setError(
          "From account and to account must be different."
        );
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();

    const fromAccountId =
      transactionType === "income"
        ? null
        : primaryAccountId;

    const destinationAccountId =
      transactionType === "expense"
        ? null
        : transactionType === "income"
          ? primaryAccountId
          : toAccountId;

    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        transaction_type: transactionType,
        amount: cleanAmount,
        from_account_id: fromAccountId,
        to_account_id: destinationAccountId,
        category: category.trim() || null,
        note: note.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setAmount("");
    setCategory("");
    setNote("");

    setSuccess(
      `${capitalize(transactionType)} added successfully.`
    );

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium">
          Transaction type
        </p>

        <div
          className="grid grid-cols-3 rounded-[var(--radius-md)] p-1"
          style={{
            backgroundColor: "var(--surface-secondary)",
          }}
        >
          <TypeButton
            label="Expense"
            active={transactionType === "expense"}
            onClick={() => {
              setTransactionType("expense");
              setError("");
              setSuccess("");
            }}
          />

          <TypeButton
            label="Income"
            active={transactionType === "income"}
            onClick={() => {
              setTransactionType("income");
              setError("");
              setSuccess("");
            }}
          />

          <TypeButton
            label="Transfer"
            active={transactionType === "transfer"}
            onClick={() => {
              setTransactionType("transfer");
              setError("");
              setSuccess("");
            }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="mb-2 block text-sm font-medium"
        >
          Amount
        </label>

        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            NPR
          </span>

          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder="0.00"
            disabled={loading}
            className="h-12 w-full rounded-[var(--radius-md)] pl-14 pr-4 text-right text-sm tabular-nums outline-none"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {transactionType === "transfer" ? (
        <>
          <AccountSelect
            id="from-account"
            label="From account"
            value={primaryAccountId}
            accounts={accounts}
            disabled={loading}
            onChange={setPrimaryAccountId}
          />

          <AccountSelect
            id="to-account"
            label="To account"
            value={toAccountId}
            accounts={accounts}
            disabled={loading}
            onChange={setToAccountId}
          />
        </>
      ) : (
        <AccountSelect
          id="account"
          label={
            transactionType === "income"
              ? "Deposit to"
              : "Pay from"
          }
          value={primaryAccountId}
          accounts={accounts}
          disabled={loading}
          onChange={setPrimaryAccountId}
        />
      )}

      {transactionType !== "transfer" && (
        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-sm font-medium"
          >
            Category
          </label>

          <input
            id="category"
            type="text"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            placeholder={
              transactionType === "income"
                ? "Salary, Freelance, Other..."
                : "Food, Transport, Shopping..."
            }
            disabled={loading}
            className="h-12 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      )}

      <div>
        <label
          htmlFor="note"
          className="mb-2 block text-sm font-medium"
        >
          Note
          <span
            className="ml-1 font-normal"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            optional
          </span>
        </label>

        <textarea
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a note..."
          disabled={loading}
          rows={3}
          className="w-full resize-none rounded-[var(--radius-md)] p-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {error && (
        <div
          className="rounded-[var(--radius-md)] px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-[var(--radius-md)] px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--positive-soft)",
            color: "var(--positive)",
          }}
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-[var(--radius-md)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {loading
          ? "Saving..."
          : `Add ${capitalize(transactionType)}`}
      </button>
    </form>
  );
}

function TypeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[var(--radius-sm)] text-sm font-medium"
      style={{
        backgroundColor: active
          ? "var(--surface-elevated)"
          : "transparent",
        color: active
          ? "var(--foreground)"
          : "var(--foreground-muted)",
      }}
    >
      {label}
    </button>
  );
}

function AccountSelect({
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
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="h-12 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function isPositiveMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return false;
  }

  const [wholePart, decimalPart = ""] =
    value.split(".");

  const cents =
    BigInt(wholePart) * BigInt(100) +
    BigInt(decimalPart.padEnd(2, "0"));

  return cents > BigInt(0);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}