"use client";

import {
  AlertTriangle,
  Ban,
  Check,
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
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/client";

export function SessionVoidActions({
  sessionId,
  gameType,
  currentPnLCents,
  canVoid,
  blockedReason,
}: {
  sessionId: string;
  gameType: string;
  currentPnLCents: string;
  canVoid: boolean;

  blockedReason:
    | string
    | null;
}) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    reason,
    setReason,
  ] =
    useState("");

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

  const pnl =
    BigInt(
      currentPnLCents
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanReason =
      reason.trim();

    if (
      !cleanReason
    ) {
      setError(
        "Enter why this session is being voided."
      );

      return;
    }

    if (
      !canVoid
    ) {
      setError(
        blockedReason ??
          "This session cannot currently be voided."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Void "${gameType}"?\n\nThis cannot be undone. Its Game P&L will become NPR 0.00 and the original result will be preserved in the audit history.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoading(
      true
    );

    const supabase =
      createClient();

    const {
      error:
        voidError,
    } =
      await supabase.rpc(
        "void_game_session",
        {
          p_session_id:
            sessionId,

          p_reason:
            cleanReason,
        }
      );

    if (
      voidError
    ) {
      setError(
        voidError.message
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(
      false
    );

    router.refresh();
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
        Mistake correction
      </p>

      {!open ? (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(
                true
              );

              setError("");
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
                  "var(--negative-soft)",

                color:
                  "var(--negative)",
              }}
            >
              <Ban
                size={15}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold"
                style={{
                  color:
                    "var(--negative)",
                }}
              >
                Void session
              </p>

              <p
                className="mt-1 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Use this only when
                the entire session was
                recorded by mistake.
              </p>
            </div>
          </button>

          {!canVoid &&
            blockedReason && (
            <div
              className="mt-3 flex gap-2 rounded-[var(--radius-md)] p-3"
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
                {blockedReason}
              </p>
            </div>
          )}
        </>
      ) : (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-3"
        >
          <div
            className="rounded-[var(--radius-lg)] p-4"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--negative)",
            }}
          >
            <div className="flex gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor:
                    "var(--negative-soft)",

                  color:
                    "var(--negative)",
                }}
              >
                <AlertTriangle
                  size={16}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      "var(--negative)",
                  }}
                >
                  Void this session?
                </p>

                <p
                  className="mt-2 text-[10px] leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Zenith will preserve
                  the original session
                  for audit history but
                  remove its Game P&amp;L
                  from your real
                  statistics.
                </p>
              </div>
            </div>

            <div
              className="mt-4 rounded-[var(--radius-md)] px-3 py-3"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
              }}
            >
              <p
                className="text-[9px] font-medium uppercase tracking-[0.11em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Current financial effect
              </p>

              <p
                className="mt-2 text-sm font-semibold tabular-nums"
                style={{
                  color:
                    pnl >
                    BigInt(0)
                      ? "var(--positive)"
                      : pnl <
                          BigInt(0)
                        ? "var(--negative)"
                        : "var(--foreground)",
                }}
              >
                {formatSignedMoney(
                  pnl
                )}
              </p>

              <p
                className="mt-2 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                After voiding:
                NPR 0.00
              </p>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="void-session-reason"
                  className="text-xs font-semibold"
                >
                  Reason
                </label>

                <span
                  className="text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Required
                </span>
              </div>

              <textarea
                id="void-session-reason"
                value={
                  reason
                }
                onChange={(
                  event
                ) =>
                  setReason(
                    event.target
                      .value
                  )
                }
                disabled={
                  loading
                }
                rows={3}
                placeholder="Example: Created this session by mistake"
                className="mt-3 w-full resize-none rounded-[var(--radius-md)] px-3 py-3 text-sm leading-5 outline-none disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  border:
                    "1px solid var(--border)",
                }}
              />
            </div>

            {!canVoid &&
              blockedReason && (
              <div
                className="mt-4 flex gap-2 rounded-[var(--radius-md)] p-3"
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
                  {blockedReason}
                </p>
              </div>
            )}

            {error && (
              <div
                className="mt-4 rounded-[var(--radius-md)] px-3 py-3 text-[10px] leading-5"
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

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(
                    false
                  );

                  setReason(
                    ""
                  );

                  setError(
                    ""
                  );
                }}
                disabled={
                  loading
                }
                className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--foreground)",
                }}
              >
                <X
                  size={14}
                />

                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  !canVoid
                }
                className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor:
                    "var(--negative)",

                  color:
                    "white",
                }}
              >
                <Check
                  size={14}
                />

                {loading
                  ? "Voiding..."
                  : "Void permanently"}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
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