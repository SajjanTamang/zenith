"use client";

import {
  Check,
  HandCoins,
  StickyNote,
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

export function GameWinningsReceivableForm({
  sessionId,
  settlementAccountId,
  settlementAccountName,
  remainingCapacityCents,
  alreadyRecordedCents,
}: {
  sessionId: string;
  settlementAccountId: string;
  settlementAccountName: string;
  remainingCapacityCents: string;
  alreadyRecordedCents: string;
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

  const remainingCapacity =
    BigInt(
      remainingCapacityCents
    );

  const alreadyRecorded =
    BigInt(
      alreadyRecordedCents
    );

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

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanPersonName =
      personName.trim();

    const cleanAmount =
      amount.trim();

    if (
      !cleanPersonName
    ) {
      setError(
        "Enter the name of the person who still owes you the winnings."
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

    const currentAmount =
      moneyToCents(
        cleanAmount
      );

    if (
      currentAmount >
      remainingCapacity
    ) {
      setError(
        `You can mark at most NPR ${formatMoneyFromCents(
          remainingCapacity
        )} more from this Game Session as owed.`
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
        receivableError,
    } =
      await supabase.rpc(
        "create_receivable",
        {
          p_person_name:
            cleanPersonName,

          p_source_account_id:
            settlementAccountId,

          p_principal_amount:
            cleanAmount,

          p_claim_type:
            "game_winnings",

          p_game_session_id:
            sessionId,

          p_due_date:
            null,

          p_note:
            note.trim() ||
            null,
        }
      );

    if (
      receivableError
    ) {
      setError(
        receivableError.message
      );

      setLoading(
        false
      );

      return;
    }

    setPersonName("");
    setAmount("");
    setNote("");

    setSuccess(
      `NPR ${formatMoneyFromCents(
        currentAmount
      )} recorded as game winnings owed to you.`
    );

    setLoading(
      false
    );

    router.refresh();
  }

  if (
    remainingCapacity <=
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
            Game receivable
          </p>

          <h2 className="mt-1 text-sm font-semibold">
            Winnings still owed
          </h2>
        </div>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "rgba(0, 102, 255, 0.10)",

            color:
              "var(--primary)",
          }}
        >
          <HandCoins
            size={16}
          />
        </div>
      </div>

      <p
        className="mt-2 text-[10px] leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Use this when you
        already won the money
        in this session but
        someone has not paid
        part of it to you yet.
      </p>

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
              id="game-winnings-owed-amount"
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

                setSuccess(
                  ""
                );
              }}
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
            className="mt-4 grid grid-cols-2 gap-4 border-t pt-3"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <div>
              <p
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Already recorded
              </p>

              <p className="mt-1 text-xs font-semibold tabular-nums">
                NPR{" "}
                {formatMoneyFromCents(
                  alreadyRecorded
                )}
              </p>
            </div>

            <div>
              <p
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Available to mark
              </p>

              <p
                className="mt-1 text-xs font-semibold tabular-nums"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                NPR{" "}
                {formatMoneyFromCents(
                  remainingCapacity
                )}
              </p>
            </div>
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
          <div className="flex items-start gap-3 px-4 py-4">
            <DetailIcon>
              <UserRound
                size={15}
              />
            </DetailIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="game-winnings-person"
                className="text-sm font-semibold"
              >
                Owed by
              </label>

              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Person who will
                give you this
                money later.
              </p>

              <input
                id="game-winnings-person"
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

                  setSuccess(
                    ""
                  );
                }}
                placeholder="Person name"
                disabled={
                  loading
                }
                className="mt-3 h-10 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none disabled:opacity-60"
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

          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <DetailIcon>
              <WalletCards
                size={15}
              />
            </DetailIcon>

            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Reclassified from
              </p>

              <p className="mt-1 text-sm font-semibold">
                {settlementAccountName}
              </p>

              <p
                className="mt-1 text-[9px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                This is the
                session&apos;s settlement
                account.
              </p>
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
                  htmlFor="game-winnings-note"
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
                id="game-winnings-note"
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
                placeholder="Will pay tomorrow..."
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

      {/* Preview */}
      {validAmount &&
        amountCents <=
          remainingCapacity && (
        <section
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
              {settlementAccountName}
            </span>

            <span className="text-sm font-semibold tabular-nums">
              -NPR{" "}
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
              Owed to you
            </span>

            <span
              className="text-sm font-semibold tabular-nums"
              style={{
                color:
                  "var(--primary)",
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
            Game P&amp;L and
            net worth stay
            unchanged. You are
            only moving value
            from available money
            into money owed to
            you.
          </p>
        </section>
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
        <HandCoins
          size={16}
        />

        {loading
          ? "Recording..."
          : "Record Winnings Owed"}
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