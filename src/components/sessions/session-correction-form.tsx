"use client";

import {
  AlertTriangle,
  Check,
  Gamepad2,
  Pencil,
  StickyNote,
  Trophy,
  X,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/client";

type ResultType =
  | "win"
  | "loss"
  | "even";

export function SessionCorrectionForm({
  sessionId,
  initialGameType,
  initialNote,
  initialResultType,
  initialResultAmount,
  playingAmount,
  canCorrectMoney,
  moneyCorrectionReason,
}: {
  sessionId: string;

  initialGameType: string;

  initialNote:
    | string
    | null;

  initialResultType:
    ResultType;

  initialResultAmount:
    | string
    | number;

  playingAmount:
    | string
    | number;

  canCorrectMoney: boolean;

  moneyCorrectionReason:
    | string
    | null;
}) {
  const router =
    useRouter();

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    gameType,
    setGameType,
  ] =
    useState(
      initialGameType
    );

  const [
    note,
    setNote,
  ] =
    useState(
      initialNote ??
        ""
    );

  const [
    resultType,
    setResultType,
  ] =
    useState<ResultType>(
      initialResultType
    );

  const [
    resultAmount,
    setResultAmount,
  ] =
    useState(
      initialResultType ===
      "even"
        ? ""
        : String(
            initialResultAmount
          )
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

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

  const playingCents =
    moneyToCents(
      playingAmount
    );

  const originalPnL =
    calculatePnL(
      initialResultType,
      initialResultAmount
    );

  const currentResultCents =
    getResultAmountCents(
      resultType,
      resultAmount
    );

  const newPnL =
    currentResultCents ===
    null
      ? null
      : resultType ===
          "win"
        ? currentResultCents
        : resultType ===
            "loss"
          ? -currentResultCents
          : BigInt(0);

  const moneyChanged =
    newPnL !==
      null &&
    newPnL !==
      originalPnL;

  function resetForm() {
    setGameType(
      initialGameType
    );

    setNote(
      initialNote ??
        ""
    );

    setResultType(
      initialResultType
    );

    setResultAmount(
      initialResultType ===
      "even"
        ? ""
        : String(
            initialResultAmount
          )
    );

    setError("");
    setSuccess("");
  }

  function closeEditor() {
    resetForm();

    setEditing(
      false
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanGameType =
      gameType.trim();

    if (
      !cleanGameType
    ) {
      setError(
        "Enter the game type."
      );

      return;
    }

    let cleanResultAmount =
      "0";

    if (
      resultType !==
      "even"
    ) {
      const clean =
        resultAmount.trim();

      if (
        !isPositiveMoney(
          clean
        )
      ) {
        setError(
          "Enter a result amount greater than 0 with no more than 2 decimal places."
        );

        return;
      }

      const resultCents =
        moneyToCents(
          clean
        );

      if (
        resultType ===
          "loss" &&
        resultCents >
          playingCents
      ) {
        setError(
          `Loss cannot be greater than the playing amount of NPR ${formatMoneyFromCents(
            playingCents
          )}.`
        );

        return;
      }

      cleanResultAmount =
        clean;
    }

    if (
      moneyChanged &&
      !canCorrectMoney
    ) {
      setError(
        moneyCorrectionReason ??
          "The money result cannot currently be corrected."
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
        correctionError,
    } =
      await supabase.rpc(
        "correct_game_session",
        {
          p_session_id:
            sessionId,

          p_game_type:
            cleanGameType,

          p_note:
            note.trim() ||
            null,

          p_result_type:
            resultType,

          p_result_amount:
            resultType ===
            "even"
              ? 0
              : cleanResultAmount,
        }
      );

    if (
      correctionError
    ) {
      setError(
        correctionError.message
      );

      setLoading(
        false
      );

      return;
    }

    setSuccess(
      moneyChanged
        ? "Session result corrected successfully."
        : "Session details updated successfully."
    );

    setLoading(
      false
    );

    setEditing(
      false
    );

    router.refresh();
  }

  if (
    !editing
  ) {
    return (
      <section className="mt-7">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Manage session
        </p>

        <button
          type="button"
          onClick={() => {
            setError("");
            setSuccess("");

            setEditing(
              true
            );
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-[var(--radius-lg)] p-4 text-left transition hover:brightness-[0.98]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-muted)",
            }}
          >
            <Pencil
              size={15}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Correct session
            </p>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Correct the game
              name, note, or final
              result without
              changing the original
              bankroll setup.
            </p>
          </div>
        </button>

        {success && (
          <MessageBox
            type="success"
            message={
              success
            }
          />
        )}

        {error && (
          <MessageBox
            type="error"
            message={
              error
            }
          />
        )}
      </section>
    );
  }

  return (
    <section className="mt-7">
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Correct session
      </p>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-3"
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
          {/* Game type */}
          <EditRow>
            <EditIcon>
              <Gamepad2
                size={15}
              />
            </EditIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="session-edit-game-type"
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Game
              </label>

              <input
                id="session-edit-game-type"
                type="text"
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
                disabled={
                  loading
                }
                className="mt-2 h-8 w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
              />
            </div>
          </EditRow>

          {/* Result */}
          <EditRow
            borderTop
          >
            <EditIcon>
              <Trophy
                size={15}
              />
            </EditIcon>

            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Final result
              </p>

              <div
                className="mt-3 grid grid-cols-3 rounded-[var(--radius-sm)] p-1"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                }}
              >
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
                    setResultType(
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
                    setResultType(
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
                  onClick={() => {
                    setResultType(
                      "even"
                    );

                    setResultAmount(
                      ""
                    );
                  }}
                />
              </div>

              {resultType !==
                "even" && (
                <div className="mt-4 flex items-end gap-3 border-b pb-3"
                  style={{
                    borderColor:
                      "var(--border)",
                  }}
                >
                  <span
                    className="mb-1 text-xs"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    NPR
                  </span>

                  <input
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
                    disabled={
                      loading
                    }
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent text-right text-2xl font-semibold tabular-nums outline-none disabled:opacity-60"
                  />
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <PnLPreview
                  label="Current P&L"
                  value={
                    originalPnL
                  }
                />

                <PnLPreview
                  label="Corrected P&L"
                  value={
                    newPnL
                  }
                />
              </div>

              {moneyChanged &&
                !canCorrectMoney && (
                <div
                  className="mt-4 flex gap-2 rounded-[var(--radius-sm)] p-3"
                  style={{
                    backgroundColor:
                      "var(--negative-soft)",

                    color:
                      "var(--negative)",
                  }}
                >
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0"
                  />

                  <p className="text-[10px] leading-5">
                    {moneyCorrectionReason ??
                      "Money correction is currently unavailable."}
                  </p>
                </div>
              )}
            </div>
          </EditRow>

          {/* Note */}
          <EditRow
            borderTop
          >
            <EditIcon>
              <StickyNote
                size={15}
              />
            </EditIcon>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="session-edit-note"
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
                id="session-edit-note"
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
                disabled={
                  loading
                }
                rows={3}
                placeholder="Add a note..."
                className="mt-3 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
              />
            </div>
          </EditRow>
        </div>

        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-[10px] leading-5"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",

            color:
              "var(--foreground-muted)",
          }}
        >
          Playing amount,
          funding account,
          Game Bankroll and
          session timestamps stay
          locked. Changing the final
          result creates an automatic
          balance correction instead
          of rewriting the original
          settlement.
        </div>

        {error && (
          <MessageBox
            type="error"
            message={
              error
            }
          />
        )}

        {success && (
          <MessageBox
            type="success"
            message={
              success
            }
          />
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={
              closeEditor
            }
            disabled={
              loading
            }
            className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",

              color:
                "var(--foreground)",
            }}
          >
            <X
              size={15}
            />

            Cancel
          </button>

          <button
            type="submit"
            disabled={
              loading
            }
            className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
            style={{
              backgroundColor:
                "var(--primary)",

              color:
                "var(--primary-foreground)",
            }}
          >
            <Check
              size={15}
            />

            {loading
              ? "Saving..."
              : "Save correction"}
          </button>
        </div>
      </form>
    </section>
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

  type:
    ResultType;

  active: boolean;
  disabled: boolean;

  onClick:
    () => void;
}) {
  const color =
    type ===
    "win"
      ? "var(--positive)"
      : type ===
          "loss"
        ? "var(--negative)"
        : "var(--foreground)";

  const background =
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
      className="h-9 rounded-[var(--radius-sm)] text-xs font-semibold disabled:opacity-60"
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
      {label}
    </button>
  );
}

function PnLPreview({
  label,
  value,
}: {
  label: string;

  value:
    | bigint
    | null;
}) {
  return (
    <div>
      <p
        className="text-[8px] font-medium uppercase tracking-[0.1em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-2 text-xs font-semibold tabular-nums"
        style={{
          color:
            value ===
            null
              ? "var(--foreground-muted)"
              : value >
                  BigInt(0)
                ? "var(--positive)"
                : value <
                    BigInt(0)
                  ? "var(--negative)"
                  : "var(--foreground)",
        }}
      >
        {value ===
        null
          ? "—"
          : formatSignedMoney(
              value
            )}
      </p>
    </div>
  );
}

function EditRow({
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
      className="flex items-start gap-3 px-4 py-4"
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

function EditIcon({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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

function MessageBox({
  type,
  message,
}: {
  type:
    | "error"
    | "success";

  message: string;
}) {
  const positive =
    type ===
    "success";

  return (
    <div
      className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
      style={{
        backgroundColor:
          positive
            ? "var(--positive-soft)"
            : "var(--negative-soft)",

        border:
          positive
            ? "1px solid var(--positive)"
            : "1px solid var(--negative)",

        color:
          positive
            ? "var(--positive)"
            : "var(--negative)",
      }}
    >
      {message}
    </div>
  );
}

function calculatePnL(
  resultType:
    ResultType,

  resultAmount:
    | string
    | number
) {
  if (
    resultType ===
    "even"
  ) {
    return BigInt(0);
  }

  const amount =
    moneyToCents(
      resultAmount
    );

  return resultType ===
    "win"
    ? amount
    : -amount;
}

function getResultAmountCents(
  resultType:
    ResultType,

  resultAmount:
    string
) {
  if (
    resultType ===
    "even"
  ) {
    return BigInt(0);
  }

  const clean =
    resultAmount.trim();

  if (
    !isPositiveMoney(
      clean
    )
  ) {
    return null;
  }

  return moneyToCents(
    clean
  );
}

function isPositiveMoney(
  value:
    string
) {
  if (
    !/^\d+(\.\d{1,2})?$/.test(
      value
    )
  ) {
    return false;
  }

  return (
    moneyToCents(
      value
    ) >
    BigInt(0)
  );
}

function formatSignedMoney(
  value:
    bigint
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