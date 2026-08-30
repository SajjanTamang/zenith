"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const accountTypes = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "wallet", label: "Wallet" },
  { value: "game_bankroll", label: "Game Bankroll" },
  { value: "other", label: "Other" },
] as const;

export function AddAccountForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("cash");
  const [openingBalance, setOpeningBalance] = useState("0.00");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanBalance = openingBalance.trim();

    if (!cleanName) {
      setError("Account name is required.");
      return;
    }

    const moneyPattern = /^-?\d+(\.\d{1,2})?$/;

    if (!moneyPattern.test(cleanBalance)) {
      setError("Enter a valid amount with no more than 2 decimal places.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("accounts")
      .insert({
        name: cleanName,
        account_type: accountType,
        opening_balance: cleanBalance,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.replace("/accounts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label
          htmlFor="account-name"
          className="mb-2 block text-sm font-medium"
        >
          Account name
        </label>

        <input
          id="account-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Cash, Nabil Bank, eSewa..."
          autoComplete="off"
          required
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div>
        <label
          htmlFor="account-type"
          className="mb-2 block text-sm font-medium"
        >
          Account type
        </label>

        <select
          id="account-type"
          value={accountType}
          onChange={(event) => setAccountType(event.target.value)}
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="opening-balance"
          className="mb-2 block text-sm font-medium"
        >
          Opening balance
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
            id="opening-balance"
            type="text"
            inputMode="decimal"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
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

        <p
          className="mt-2 text-xs leading-5"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Enter the amount already in this account when you begin using
          Zenith. It will not be counted as income.
        </p>
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

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-md)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => router.back()}
          className="h-11 w-full text-sm font-medium"
          style={{
            color: "var(--foreground-secondary)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}