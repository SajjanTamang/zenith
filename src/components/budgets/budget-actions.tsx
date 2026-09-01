"use client";

import {
  Archive,
  Pencil,
  Save,
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

export function BudgetActions({
  budgetId,
  category,
  monthlyLimit,
}: {
  budgetId: string;
  category: string;
  monthlyLimit: string;
}) {
  const router =
    useRouter();

  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    limit,
    setLimit,
  ] =
    useState(
      monthlyLimit
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    archiving,
    setArchiving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function handleUpdate(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanLimit =
      limit.trim();

    const moneyPattern =
      /^\d+(\.\d{1,2})?$/;

    if (
      !moneyPattern.test(
        cleanLimit
      )
    ) {
      setError(
        "Enter a valid monthly limit with no more than 2 decimal places."
      );

      return;
    }

    if (
      Number(
        cleanLimit
      ) <= 0
    ) {
      setError(
        "Monthly limit must be greater than NPR 0."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      error: updateError,
    } =
      await supabase
        .from("budgets")
        .update({
          monthly_limit:
            cleanLimit,
        })
        .eq(
          "id",
          budgetId
        );

    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      setLoading(false);

      return;
    }

    setSuccess(
      "Budget updated."
    );

    setEditing(false);
    setLoading(false);

    router.refresh();
  }

  async function handleArchive() {
    const confirmed =
      window.confirm(
        `Archive the ${category} budget? Your expense transactions and budget history will be preserved.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setArchiving(true);

    const supabase =
      createClient();

    const {
      error: archiveError,
    } =
      await supabase
        .from("budgets")
        .update({
          archived_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          budgetId
        );

    if (
      archiveError
    ) {
      setError(
        archiveError.message
      );

      setArchiving(false);

      return;
    }

    router.replace(
      "/budgets"
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
        Manage
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
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(
                true
              );

              setError("");
              setSuccess("");
            }}
            disabled={
              archiving
            }
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              <Pencil
                size={15}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Edit monthly limit
              </p>

              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Change how much
                you want to spend
                each month.
              </p>
            </div>
          </button>
        ) : (
          <form
            onSubmit={
              handleUpdate
            }
            className="p-4"
          >
            <label
              htmlFor="edit-budget-limit"
              className="block text-sm font-semibold"
            >
              Monthly limit
            </label>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              This changes the
              recurring monthly
              limit for{" "}
              {category}.
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
                id="edit-budget-limit"
                type="text"
                inputMode="decimal"
                value={
                  limit
                }
                onChange={(
                  event
                ) =>
                  setLimit(
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  loading
                }
                className="h-11 w-full rounded-[var(--radius-md)] pl-12 pr-3 text-right text-sm font-semibold tabular-nums outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--primary)]"
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

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={
                  loading
                }
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--primary)",

                  color:
                    "var(--primary-foreground)",
                }}
              >
                <Save
                  size={14}
                />

                {loading
                  ? "Saving..."
                  : "Save"}
              </button>

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() => {
                  setLimit(
                    monthlyLimit
                  );

                  setEditing(
                    false
                  );

                  setError("");
                }}
                className="h-10 flex-1 rounded-[var(--radius-md)] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--foreground-secondary)",

                  border:
                    "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={
            handleArchive
          }
          disabled={
            loading ||
            archiving
          }
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            borderTop:
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
            <Archive
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
              {archiving
                ? "Archiving..."
                : "Archive budget"}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Stops the active
              budget but keeps
              its historical
              records.
            </p>
          </div>
        </button>
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

      {success && (
        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
          style={{
            backgroundColor:
              "var(--positive-soft)",

            border:
              "1px solid var(--positive)",

            color:
              "var(--positive)",
          }}
        >
          {success}
        </div>
      )}
    </section>
  );
}