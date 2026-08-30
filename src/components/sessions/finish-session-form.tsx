"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

type ResultType = "win" | "loss" | "even";

export function FinishSessionForm({
  sessionId,
  playingAmount,
}: {
  sessionId: string;
  playingAmount: string | number;
}) {
  const router = useRouter();

  const [resultType, setResultType] =
    useState<ResultType>("win");

  const [resultAmount, setResultAmount] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const amount =
    resultType === "even"
      ? BigInt(0)
      : isPositiveMoney(resultAmount)
        ? moneyToCents(resultAmount)
        : BigInt(0);

  const pnl =
    resultType === "win"
      ? amount
      : resultType === "loss"
        ? -amount
        : BigInt(0);

  const pnlColor =
    pnl > BigInt(0)
      ? "var(--positive)"
      : pnl < BigInt(0)
        ? "var(--negative)"
        : "var(--foreground)";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    let cleanResultAmount = "0.00";

    if (resultType !== "even") {
      cleanResultAmount = resultAmount.trim();

      if (!isPositiveMoney(cleanResultAmount)) {
        setError(
          "Enter a result amount greater than 0."
        );
        return;
      }
    }

    /*
      Since playing amount represents the total amount
      you planned to spend today, the day's loss cannot
      be greater than that amount.
    */
    if (
      resultType === "loss" &&
      moneyToCents(cleanResultAmount) >
        moneyToCents(playingAmount)
    ) {
      setError(
        "Loss cannot be greater than today's playing amount."
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("game_sessions")
      .update({
        status: "completed",
        result_type: resultType,
        result_amount: cleanResultAmount,
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "active");

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace("/sessions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium">
          How did today go?
        </p>

        <div
          className="grid grid-cols-3 rounded-[var(--radius-md)] p-1"
          style={{
            backgroundColor: "var(--surface-secondary)",
          }}
        >
          <ResultButton
            label="Win"
            active={resultType === "win"}
            onClick={() => {
              setResultType("win");
              setError("");
            }}
          />

          <ResultButton
            label="Loss"
            active={resultType === "loss"}
            onClick={() => {
              setResultType("loss");
              setError("");
            }}
          />

          <ResultButton
            label="Even"
            active={resultType === "even"}
            onClick={() => {
              setResultType("even");
              setResultAmount("");
              setError("");
            }}
          />
        </div>
      </div>

      {resultType !== "even" && (
        <div>
          <label
            htmlFor="result-amount"
            className="mb-2 block text-sm font-medium"
          >
            {resultType === "win"
              ? "Amount won"
              : "Amount lost"}
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
              id="result-amount"
              type="text"
              inputMode="decimal"
              value={resultAmount}
              onChange={(event) =>
                setResultAmount(event.target.value)
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
      )}

      <div
        className="rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor: "var(--surface-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Today&apos;s P&amp;L
        </p>

        <p
          className="mt-2 text-2xl font-semibold tabular-nums"
          style={{
            color: pnlColor,
          }}
        >
          {pnl > BigInt(0) ? "+" : ""}
          NPR {formatMoneyFromCents(pnl)}
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

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {loading
          ? "Finishing session..."
          : "Finish Session"}
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

function ResultButton({
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

function isPositiveMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return false;
  }

  return moneyToCents(value) > BigInt(0);
}