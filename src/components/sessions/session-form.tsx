"use client";

import {
  AlertTriangle,
  ArrowRight,
  Gamepad2,
  Landmark,
  Play,
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
  balanceCents: string;
};

export function SessionForm({
  fundingAccounts,
  bankrollAccounts,
}: {
  fundingAccounts: AccountOption[];
  bankrollAccounts: AccountOption[];
}) {
  const router =
    useRouter();

  const [
    fundingAccountId,
    setFundingAccountId,
  ] =
    useState(
      fundingAccounts[0]?.id ??
        ""
    );

  const [
    bankrollAccountId,
    setBankrollAccountId,
  ] =
    useState(
      bankrollAccounts[0]?.id ??
        ""
    );

  const [
    playingAmount,
    setPlayingAmount,
  ] =
    useState("");

  const [
    gameType,
    setGameType,
  ] =
    useState("");

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

  const selectedFunding =
    fundingAccounts.find(
      (account) =>
        account.id ===
        fundingAccountId
    );

  const selectedBankroll =
    bankrollAccounts.find(
      (account) =>
        account.id ===
        bankrollAccountId
    );

  const fundingBalance =
    selectedFunding
      ? BigInt(
          selectedFunding.balanceCents
        )
      : BigInt(0);

  const bankrollBalance =
    selectedBankroll
      ? BigInt(
          selectedBankroll.balanceCents
        )
      : BigInt(0);

  const validPlayingAmount =
    isPositiveMoney(
      playingAmount
    );

  const playingAmountCents =
    validPlayingAmount
      ? moneyToCents(
          playingAmount.trim()
        )
      : BigInt(0);

  const sourceShortfall =
    validPlayingAmount &&
    playingAmountCents >
      fundingBalance;

  const bankrollNeedsSettlement =
    bankrollBalance !==
    BigInt(0);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanAmount =
      playingAmount.trim();

    const cleanGameType =
      gameType.trim();

    if (
      !fundingAccountId
    ) {
      setError(
        "Select the account that will fund today's game."
      );

      return;
    }

    if (
      !bankrollAccountId
    ) {
      setError(
        "Select a Game Bankroll."
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

    if (
      bankrollBalance !==
      BigInt(0)
    ) {
      setError(
        "The selected Game Bankroll must be NPR 0.00 before starting a new session."
      );

      return;
    }

    if (
      moneyToCents(
        cleanAmount
      ) >
      fundingBalance
    ) {
      setError(
        "The funding account does not have enough available money."
      );

      return;
    }

    if (
      !cleanGameType
    ) {
      setError(
        "Enter the game type."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    /*
      One atomic database operation:

      1. Create active session
      2. Transfer funding account -> bankroll
      3. Remember the original funding account
    */
    const {
      error:
        startError,
    } =
      await supabase.rpc(
        "start_game_session",
        {
          p_funding_account_id:
            fundingAccountId,

          p_bankroll_account_id:
            bankrollAccountId,

          p_playing_amount:
            cleanAmount,

          p_game_type:
            cleanGameType,

          p_note:
            note.trim() ||
            null,
        }
      );

    if (
      startError
    ) {
      setError(
        startError.message
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
    bankrollAccounts.length ===
    0
  ) {
    return (
      <EmptyState
        title="No Game Bankroll"
        description="Create a Game Bankroll account before starting a session."
      />
    );
  }

  if (
    fundingAccounts.length ===
    0
  ) {
    return (
      <EmptyState
        title="No Funding Account"
        description="Create a Bank, Cash, Wallet, or Other account before starting a session."
      />
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
        {/* Fund from */}
        <FormSection>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Landmark
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="funding-account"
                className="block text-sm font-medium"
              >
                Fund from
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Where today&apos;s
                playing money comes
                from.
              </p>

              <select
                id="funding-account"
                value={
                  fundingAccountId
                }
                onChange={(
                  event
                ) => {
                  setFundingAccountId(
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
                {fundingAccounts.map(
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

              <BalanceRow
                label="Available"
                value={
                  fundingBalance
                }
              />
            </div>
          </div>
        </FormSection>

        {/* Bankroll */}
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
                htmlFor="bankroll"
                className="block text-sm font-medium"
              >
                Game Bankroll
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Temporary pot for
                today&apos;s game.
              </p>

              <select
                id="bankroll"
                value={
                  bankrollAccountId
                }
                onChange={(
                  event
                ) => {
                  setBankrollAccountId(
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

              <BalanceRow
                label="Current bankroll"
                value={
                  bankrollBalance
                }
              />

              {bankrollNeedsSettlement && (
                <div
                  className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] p-3"
                  style={{
                    backgroundColor:
                      "var(--negative-soft)",

                    border:
                      "1px solid var(--negative)",
                  }}
                >
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{
                      color:
                        "var(--negative)",
                    }}
                  />

                  <p
                    className="text-[10px] leading-4"
                    style={{
                      color:
                        "var(--negative)",
                    }}
                  >
                    New sessions
                    start with a
                    zero bankroll.
                    Settle this
                    bankroll before
                    starting.
                  </p>
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {/* Playing amount */}
        <FormSection
          borderTop
        >
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Play
                size={16}
              />
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
                Amount moved into
                today&apos;s
                bankroll.
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
                  ) => {
                    setPlayingAmount(
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
                  className="h-11 w-full rounded-[var(--radius-md)] pl-12 pr-3 text-right text-sm font-medium tabular-nums outline-none disabled:opacity-60 focus:border-[var(--primary)]"
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

              {sourceShortfall && (
                <p
                  className="mt-2 text-[10px] leading-4"
                  style={{
                    color:
                      "var(--negative)",
                  }}
                >
                  Not enough money
                  in{" "}
                  {selectedFunding?.name ??
                    "the funding account"}.
                </p>
              )}
            </div>
          </div>
        </FormSection>

        {/* Transfer preview */}
        {validPlayingAmount &&
          !bankrollNeedsSettlement &&
          !sourceShortfall && (
            <FormSection
              borderTop
            >
              <p
                className="text-[9px] font-medium uppercase tracking-[0.14em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Session funding
              </p>

              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {
                      selectedFunding
                        ?.name
                    }
                  </p>
                </div>

                <ArrowRight
                  size={14}
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                />

                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-xs font-semibold">
                    {
                      selectedBankroll
                        ?.name
                    }
                  </p>
                </div>
              </div>

              <p
                className="mt-3 text-center text-sm font-semibold tabular-nums"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                NPR{" "}
                {formatMoneyFromCents(
                  playingAmountCents
                )}
              </p>

              <p
                className="mt-2 text-center text-[9px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Transfer only —
                not income or an
                expense.
              </p>
            </FormSection>
          )}

        {/* Game type */}
        <FormSection
          borderTop
        >
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

        {/* Note */}
        <FormSection
          borderTop
        >
          <div>
            <div className="flex items-center justify-between">
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
              placeholder="Anything you want to remember..."
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
            loading ||
            bankrollNeedsSettlement ||
            sourceShortfall
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundColor:
              "var(--primary)",

            color:
              "var(--primary-foreground)",
          }}
        >
          <Play
            size={15}
          />

          {loading
            ? "Starting session..."
            : "Fund & Start Session"}
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

function BalanceRow({
  label,
  value,
}: {
  label: string;
  value: bigint;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <span
        className="text-[10px]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </span>

      <span
        className="text-xs font-semibold tabular-nums"
        style={{
          color:
            value <
            BigInt(0)
              ? "var(--negative)"
              : "var(--foreground)",
        }}
      >
        {formatBalance(
          value
        )}
      </span>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
        <FieldIcon>
          <WalletCards
            size={17}
          />
        </FieldIcon>

        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p
            className="mt-1 text-xs leading-5"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatBalance(
  value: bigint
) {
  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      -value
    )}`;
  }

  return `NPR ${formatMoneyFromCents(
    value
  )}`;
}

function isPositiveMoney(
  value: string
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