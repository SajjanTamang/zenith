"use client";

import {
  Check,
  Equal,
  RotateCcw,
  TrendingDown,
  TrendingUp,
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

type ResultType =
  | "win"
  | "loss"
  | "even";

export function FinishSessionForm({
  sessionId,
  playingAmount,
  automaticSettlement,
  bankrollName,
  fundingAccountName,
}: {
  sessionId: string;

  playingAmount:
    | string
    | number;

  automaticSettlement:
    boolean;

  bankrollName:
    string;

  fundingAccountName:
    string | null;
}) {
  const router =
    useRouter();

  const [
    resultType,
    setResultType,
  ] =
    useState<ResultType>(
      "win"
    );

  const [
    resultAmount,
    setResultAmount,
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

  const playingAmountCents =
    moneyToCents(
      playingAmount
    );

  const amount =
    resultType ===
    "even"
      ? BigInt(0)
      : isPositiveMoney(
            resultAmount
          )
        ? moneyToCents(
            resultAmount.trim()
          )
        : BigInt(0);

  const pnl =
    resultType ===
    "win"
      ? amount
      : resultType ===
          "loss"
        ? -amount
        : BigInt(0);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    let cleanResultAmount =
      "0.00";

    if (
      resultType !==
      "even"
    ) {
      cleanResultAmount =
        resultAmount.trim();

      if (
        !isPositiveMoney(
          cleanResultAmount
        )
      ) {
        setError(
          "Enter a result amount greater than 0 with no more than 2 decimal places."
        );

        return;
      }
    }

    if (
      resultType ===
        "loss" &&
      moneyToCents(
        cleanResultAmount
      ) >
        playingAmountCents
    ) {
      setError(
        "Loss cannot be greater than today's playing amount."
      );

      return;
    }

    setLoading(
      true
    );

    const supabase =
      createClient();

    /*
      New sessions use the atomic
      bankroll settlement RPC.

      Old sessions created before
      funding_account_id was added
      keep the old finish behavior.
    */
    if (
      automaticSettlement
    ) {
      const {
        error:
          finishError,
      } =
        await supabase.rpc(
          "finish_game_session",
          {
            p_session_id:
              sessionId,

            p_result_type:
              resultType,

            p_result_amount:
              cleanResultAmount,
          }
        );

      if (
        finishError
      ) {
        setError(
          finishError.message
        );

        setLoading(
          false
        );

        return;
      }
    } else {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "game_sessions"
          )
          .update({
            status:
              "completed",

            result_type:
              resultType,

            result_amount:
              cleanResultAmount,

            ended_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            sessionId
          )
          .eq(
            "status",
            "active"
          );

      if (
        updateError
      ) {
        setError(
          updateError.message
        );

        setLoading(
          false
        );

        return;
      }
    }

    router.replace(
      "/sessions"
    );

    router.refresh();
  }

  function selectResultType(
    type:
      ResultType
  ) {
    setResultType(
      type
    );

    setError("");

    if (
      type ===
      "even"
    ) {
      setResultAmount(
        ""
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-8"
    >
      {/* Result */}
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Result
        </p>

        <h2 className="mt-1 text-sm font-semibold">
          How did today go?
        </h2>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ResultButton
            label="Win"
            type="win"
            active={
              resultType ===
              "win"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectResultType(
                "win"
              )
            }
          />

          <ResultButton
            label="Loss"
            type="loss"
            active={
              resultType ===
              "loss"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectResultType(
                "loss"
              )
            }
          />

          <ResultButton
            label="Even"
            type="even"
            active={
              resultType ===
              "even"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectResultType(
                "even"
              )
            }
          />
        </div>
      </section>

      {/* Result amount */}
      {resultType !==
        "even" && (
        <section className="mt-7">
          <label
            htmlFor="result-amount"
            className="text-sm font-medium"
          >
            {resultType ===
            "win"
              ? "Amount won"
              : "Amount lost"}
          </label>

          <p
            className="mt-1 text-xs leading-5"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Enter only the
            net{" "}
            {resultType ===
            "win"
              ? "profit"
              : "loss"}{" "}
            for the day.
          </p>

          <div className="relative mt-3">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              NPR
            </span>

            <input
              id="result-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={
                resultAmount
              }
              onChange={(
                event
              ) =>
                setResultAmount(
                  event.target
                    .value
                )
              }
              placeholder="0.00"
              disabled={
                loading
              }
              className="h-12 w-full rounded-[var(--radius-md)] pl-14 pr-4 text-right text-sm font-semibold tabular-nums outline-none disabled:opacity-60 focus:border-[var(--primary)]"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",

                color:
                  "var(--foreground)",
              }}
            />
          </div>

          {resultType ===
            "loss" && (
            <p
              className="mt-2 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Maximum loss:
              NPR{" "}
              {formatMoneyFromCents(
                playingAmountCents
              )}
            </p>
          )}
        </section>
      )}

      {/* P&L Preview */}
      <section className="mt-7">
        <div
          className="rounded-[var(--radius-lg)] p-5"
          style={{
            backgroundColor:
              getPnlBackground(
                pnl
              ),

            border:
              `1px solid ${getPnlBorder(
                pnl
              )}`,
          }}
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
                Today&apos;s
                P&amp;L
              </p>

              <p
                className="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
                style={{
                  color:
                    getPnlColor(
                      pnl
                    ),
                }}
              >
                {formatSignedMoney(
                  pnl
                )}
              </p>
            </div>

            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                color:
                  getPnlColor(
                    pnl
                  ),
              }}
            >
              {resultType ===
              "win" ? (
                <TrendingUp
                  size={18}
                />
              ) : resultType ===
                "loss" ? (
                <TrendingDown
                  size={18}
                />
              ) : (
                <Equal
                  size={18}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Automatic Settlement */}
      {automaticSettlement &&
        fundingAccountName && (
        <section
          className="mt-4 rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                color:
                  "var(--primary)",
              }}
            >
              <RotateCcw
                size={14}
              />
            </div>

            <div>
              <p className="text-xs font-semibold">
                Automatic
                settlement
              </p>

              <p
                className="mt-1 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                After the result
                is recorded,
                everything
                remaining in{" "}
                <span className="font-semibold">
                  {
                    bankrollName
                  }
                </span>{" "}
                returns to{" "}
                <span className="font-semibold">
                  {
                    fundingAccountName
                  }
                </span>
                .
              </p>

              <p
                className="mt-2 text-[10px] font-medium"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                Bankroll ends at
                NPR 0.00
              </p>
            </div>
          </div>
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
          <Check
            size={16}
          />

          {loading
            ? "Finishing session..."
            : "Finish Session"}
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

function ResultButton({
  label,
  type,
  active,
  disabled,
  onClick,
}: {
  label: string;
  type: ResultType;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color =
    type ===
    "win"
      ? "var(--positive)"
      : type ===
          "loss"
        ? "var(--negative)"
        : "var(--foreground-secondary)";

  const activeBackground =
    type ===
    "win"
      ? "var(--positive-soft)"
      : type ===
          "loss"
        ? "var(--negative-soft)"
        : "var(--surface-elevated)";

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
      style={{
        backgroundColor:
          active
            ? activeBackground
            : "var(--surface)",

        border:
          active
            ? `1px solid ${color}`
            : "1px solid var(--border)",

        color:
          active
            ? color
            : "var(--foreground-muted)",
      }}
    >
      {type ===
        "win" && (
        <TrendingUp
          size={15}
        />
      )}

      {type ===
        "loss" && (
        <TrendingDown
          size={15}
        />
      )}

      {type ===
        "even" && (
        <Equal
          size={15}
        />
      )}

      {label}
    </button>
  );
}

function formatSignedMoney(
  value: bigint
) {
  if (
    value >
    BigInt(0)
  ) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      -value
    )}`;
  }

  return "NPR 0.00";
}

function getPnlColor(
  value: bigint
) {
  if (
    value >
    BigInt(0)
  ) {
    return "var(--positive)";
  }

  if (
    value <
    BigInt(0)
  ) {
    return "var(--negative)";
  }

  return "var(--foreground)";
}

function getPnlBackground(
  value: bigint
) {
  if (
    value >
    BigInt(0)
  ) {
    return "var(--positive-soft)";
  }

  if (
    value <
    BigInt(0)
  ) {
    return "var(--negative-soft)";
  }

  return "var(--surface)";
}

function getPnlBorder(
  value: bigint
) {
  if (
    value >
    BigInt(0)
  ) {
    return "var(--positive)";
  }

  if (
    value <
    BigInt(0)
  ) {
    return "var(--negative)";
  }

  return "var(--border)";
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