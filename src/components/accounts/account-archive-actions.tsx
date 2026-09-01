"use client";

import {
  Archive,
  RotateCcw,
} from "lucide-react";

import {
  useState,
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

type AccountArchiveActionsProps = {
  accountId: string;
  accountName: string;
  isArchived: boolean;
  currentBalanceCents: string;
  hasActiveGameSession: boolean;
};

export function AccountArchiveActions({
  accountId,
  accountName,
  isArchived,
  currentBalanceCents,
  hasActiveGameSession,
}: AccountArchiveActionsProps) {
  const router =
    useRouter();

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

  const currentBalance =
    BigInt(
      currentBalanceCents
    );

  const canArchive =
    currentBalance ===
      BigInt(0) &&
    !hasActiveGameSession;

  async function handleArchive() {
    if (
      !canArchive
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Archive ${accountName}? It will disappear from new transaction and account selectors, but all historical records will be preserved.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoading(
      true
    );

    setError("");

    const supabase =
      createClient();

    const {
      error:
        archiveError,
    } =
      await supabase.rpc(
        "archive_account",
        {
          p_account_id:
            accountId,
        }
      );

    if (
      archiveError
    ) {
      setError(
        archiveError.message
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

  async function handleRestore() {
    const confirmed =
      window.confirm(
        `Restore ${accountName}? It will become available for new transactions again.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setLoading(
      true
    );

    setError("");

    const supabase =
      createClient();

    const {
      error:
        restoreError,
    } =
      await supabase.rpc(
        "restore_account",
        {
          p_account_id:
            accountId,
        }
      );

    if (
      restoreError
    ) {
      setError(
        restoreError.message
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

  /*
    Archived account
    ----------------
    Only show Restore.
  */
  if (
    isArchived
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
          Account status
        </p>

        <button
          type="button"
          onClick={
            handleRestore
          }
          disabled={
            loading
          }
          className="mt-3 flex w-full items-center gap-3 rounded-[var(--radius-lg)] p-4 text-left transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                "var(--primary)",
            }}
          >
            <RotateCcw
              size={16}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {loading
                ? "Restoring..."
                : "Restore account"}
            </p>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Make this account
              available for new
              transactions again.
            </p>
          </div>
        </button>

        {error && (
          <ErrorBox
            message={
              error
            }
          />
        )}
      </section>
    );
  }

  /*
    Active account
    --------------
    Archive is only allowed when:
      balance = 0
      no active game session
  */
  return (
    <section className="mt-7">
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Account status
      </p>

      <div
        className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={
            handleArchive
          }
          disabled={
            loading ||
            !canArchive
          }
          className="flex w-full items-center gap-3 p-4 text-left transition enabled:hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                canArchive
                  ? "var(--foreground-secondary)"
                  : "var(--foreground-muted)",
            }}
          >
            <Archive
              size={16}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {loading
                ? "Archiving..."
                : "Archive account"}
            </p>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Hide this account
              from future money
              entry while keeping
              all historical
              records.
            </p>
          </div>
        </button>

        {!canArchive && (
          <div
            className="px-4 py-3"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            {currentBalance !==
            BigInt(0) ? (
              <p
                className="text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Balance must be
                NPR 0.00 before
                this account can
                be archived.
                Current balance:{" "}
                <span className="font-semibold">
                  {formatSignedBalance(
                    currentBalance
                  )}
                </span>
              </p>
            ) : hasActiveGameSession ? (
              <p
                className="text-[10px] leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Finish the active
                Game Session before
                archiving this
                Game Bankroll.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {error && (
        <ErrorBox
          message={
            error
          }
        />
      )}
    </section>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
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
      {message}
    </div>
  );
}

function formatSignedBalance(
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