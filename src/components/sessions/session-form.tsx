"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type BankrollAccount = {
  id: string;
  name: string;
};

export function SessionForm({
  bankrollAccounts,
}: {
  bankrollAccounts: BankrollAccount[];
}) {
  const router = useRouter();

  const [bankrollAccountId, setBankrollAccountId] =
    useState(bankrollAccounts[0]?.id ?? "");

  const [playingAmount, setPlayingAmount] = useState("");
  const [gameType, setGameType] = useState("");
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanAmount = playingAmount.trim();
    const cleanGameType = gameType.trim();

    if (!bankrollAccountId) {
      setError("Select a bankroll account.");
      return;
    }

    if (!isPositiveMoney(cleanAmount)) {
      setError(
        "Enter a playing amount greater than 0 with no more than 2 decimal places."
      );
      return;
    }

    if (!cleanGameType) {
      setError("Enter the game type.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("game_sessions")
      .insert({
        bankroll_account_id: bankrollAccountId,
        playing_amount: cleanAmount,
        game_type: cleanGameType,
        note: note.trim() || null,
        status: "active",
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.replace("/sessions");
    router.refresh();
  }

  if (bankrollAccounts.length === 0) {
    return (
      <div
        className="mt-8 rounded-[var(--radius-lg)] p-6 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-sm font-semibold">
          No game bankroll account
        </p>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Create a Game Bankroll account before starting a session.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label
          htmlFor="bankroll"
          className="mb-2 block text-sm font-medium"
        >
          Bankroll
        </label>

        <select
          id="bankroll"
          value={bankrollAccountId}
          onChange={(event) =>
            setBankrollAccountId(event.target.value)
          }
          disabled={loading}
          className="h-12 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {bankrollAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="playing-amount"
          className="mb-2 block text-sm font-medium"
        >
          Playing amount
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
            id="playing-amount"
            type="text"
            inputMode="decimal"
            value={playingAmount}
            onChange={(event) =>
              setPlayingAmount(event.target.value)
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

        <p
          className="mt-2 text-xs leading-5"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          The amount you plan to play with today. This is not counted as
          income or an expense.
        </p>
      </div>

      <div>
        <label
          htmlFor="game-type"
          className="mb-2 block text-sm font-medium"
        >
          Game type
        </label>

        <input
          id="game-type"
          type="text"
          value={gameType}
          onChange={(event) =>
            setGameType(event.target.value)
          }
          placeholder="Cards, Teen Patti, Poker..."
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
          onChange={(event) =>
            setNote(event.target.value)
          }
          rows={3}
          placeholder="Anything you want to remember about today's games..."
          disabled={loading}
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

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-[var(--radius-md)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {loading ? "Starting session..." : "Start Session"}
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
    </form>
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