"use client";

import {
  Gamepad2,
  Play,
  WalletCards,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

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

  const [
    bankrollAccountId,
    setBankrollAccountId,
  ] = useState(
    bankrollAccounts[0]?.id ?? ""
  );

  const [
    playingAmount,
    setPlayingAmount,
  ] = useState("");

  const [
    gameType,
    setGameType,
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
    loading,
    setLoading,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanAmount =
      playingAmount.trim();

    const cleanGameType =
      gameType.trim();

    if (!bankrollAccountId) {
      setError(
        "Select a bankroll account."
      );

      return;
    }

    if (
      !isPositiveMoney(
        cleanAmount
      )
    ) {
      setError(
        "Enter a playing amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (!cleanGameType) {
      setError(
        "Enter the game type."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      error: insertError,
    } = await supabase
      .from("game_sessions")
      .insert({
        bankroll_account_id:
          bankrollAccountId,

        playing_amount:
          cleanAmount,

        game_type:
          cleanGameType,

        note:
          note.trim() || null,

        status: "active",
      });

    if (insertError) {
      setError(
        insertError.message
      );

      setLoading(false);

      return;
    }

    router.replace(
      "/sessions"
    );

    router.refresh();
  }

  if (
    bankrollAccounts.length === 0
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
              size={17}
            />
          </div>

          <div>
            <p className="text-sm font-semibold">
              No Game Bankroll
            </p>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Create a Game
              Bankroll account
              before starting a
              session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8"
    >
      {/* Main form card */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          backgroundColor:
            "var(--surface)",
          border:
            "1px solid var(--border)",
        }}
      >
        {/* Bankroll */}
        <FormSection>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <WalletCards
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="bankroll"
                className="block text-sm font-medium"
              >
                Bankroll
              </label>

              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Account used for
                game profit and
                loss.
              </p>

              <select
                id="bankroll"
                value={
                  bankrollAccountId
                }
                onChange={(
                  event
                ) =>
                  setBankrollAccountId(
                    event.target
                      .value
                  )
                }
                disabled={
                  loading
                }
                className="mt-4 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--primary)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  border:
                    "1px solid var(--border)",
                  color:
                    "var(--foreground)",
                }}
              >
                {bankrollAccounts.map(
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

        {/* Playing amount */}
        <FormSection borderTop>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Play size={16} />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="playing-amount"
                className="block text-sm font-medium"
              >
                Playing amount
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                How much you plan
                to play with
                today.
              </p>

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
                  id="playing-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={
                    playingAmount
                  }
                  onChange={(
                    event
                  ) =>
                    setPlayingAmount(
                      event.target
                        .value
                    )
                  }
                  placeholder="0.00"
                  disabled={
                    loading
                  }
                  className="h-11 w-full rounded-[var(--radius-md)] pl-12 pr-3 text-right text-sm font-medium tabular-nums outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--primary)]"
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

              <p
                className="mt-2 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                This does not
                change your
                balance and is
                not counted as
                income or an
                expense.
              </p>
            </div>
          </div>
        </FormSection>

        {/* Game type */}
        <FormSection borderTop>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Gamepad2
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="game-type"
                className="block text-sm font-medium"
              >
                Game type
              </label>

              <input
                id="game-type"
                type="text"
                autoComplete="off"
                value={
                  gameType
                }
                onChange={(
                  event
                ) =>
                  setGameType(
                    event.target
                      .value
                  )
                }
                placeholder="Cards"
                disabled={
                  loading
                }
                className="mt-4 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--primary)]"
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

        {/* Note */}
        <FormSection borderTop>
          <div>
            <div className="flex items-center justify-between gap-3">
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
              value={note}
              onChange={(
                event
              ) =>
                setNote(
                  event.target
                    .value
                )
              }
              rows={3}
              placeholder="Anything you want to remember about today's session..."
              disabled={
                loading
              }
              className="mt-3 w-full resize-none rounded-[var(--radius-md)] p-3 text-sm leading-5 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--primary)]"
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

      {/* Actions */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          <Play size={15} />

          {loading
            ? "Starting session..."
            : "Start Session"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            router.back()
          }
          className="mt-2 h-11 w-full text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
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
  borderTop?: boolean;
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