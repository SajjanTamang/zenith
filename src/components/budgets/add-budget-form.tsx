"use client";

import {
  Banknote,
  Plus,
  Tag,
} from "lucide-react";

import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

export function AddBudgetForm() {
  const router =
    useRouter();

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    monthlyLimit,
    setMonthlyLimit,
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
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanCategory =
      category.trim();

    const cleanLimit =
      monthlyLimit.trim();

    if (!cleanCategory) {
      setError(
        "Category is required."
      );

      return;
    }

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
      error: insertError,
    } =
      await supabase
        .from("budgets")
        .insert({
          category:
            cleanCategory,

          monthly_limit:
            cleanLimit,
        });

    if (insertError) {
      if (
        insertError.code ===
        "23505"
      ) {
        setError(
          `You already have a budget for ${cleanCategory}.`
        );
      } else {
        setError(
          insertError.message
        );
      }

      setLoading(false);

      return;
    }

    router.replace(
      "/budgets"
    );

    router.refresh();
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
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
        {/* Category */}
        <FormSection>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Tag
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="budget-category"
                className="block text-sm font-semibold"
              >
                Category
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Match the
                category you
                use when adding
                expenses.
              </p>

              <input
                id="budget-category"
                type="text"
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Food, Transport, Shopping..."
                autoComplete="off"
                required
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

              <p
                className="mt-2 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Example: expenses
                saved as Food
                will count toward
                a Food budget.
              </p>
            </div>
          </div>
        </FormSection>

        {/* Monthly limit */}
        <FormSection
          borderTop
        >
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Banknote
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="monthly-limit"
                className="block text-sm font-semibold"
              >
                Monthly limit
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Maximum amount
                you want to
                spend in this
                category each
                month.
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
                  id="monthly-limit"
                  type="text"
                  inputMode="decimal"
                  value={
                    monthlyLimit
                  }
                  onChange={(
                    event
                  ) =>
                    setMonthlyLimit(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="0.00"
                  required
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

              <p
                className="mt-2 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                This limit
                automatically
                applies every
                month until you
                edit or delete
                the budget.
              </p>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Information */}
      <div
        className="mt-4 rounded-[var(--radius-md)] px-4 py-3"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <p
          className="text-[10px] leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Only expense
          transactions count
          toward this budget.
          Income, transfers,
          lending, repayments
          and Game P&amp;L do
          not count.
        </p>
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
          disabled={
            loading
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor:
              "var(--primary)",

            color:
              "var(--primary-foreground)",
          }}
        >
          <Plus
            size={16}
          />

          {loading
            ? "Creating budget..."
            : "Create Budget"}
        </button>

        <button
          type="button"
          disabled={
            loading
          }
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
    ReactNode;

  borderTop?:
    boolean;
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
    ReactNode;
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