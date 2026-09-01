"use client";

import {
  Pencil,
  Save,
  Trash2,
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

type Account = {
  id: string;
  name: string;
};

type TransactionType =
  | "income"
  | "expense"
  | "transfer";

export function TransactionActions({
  transactionId,
  transactionType,
  initialAmount,
  initialFromAccountId,
  initialToAccountId,
  initialCategory,
  initialNote,
  accounts,
}: {
  transactionId: string;

  transactionType:
    TransactionType;

  initialAmount:
    string;

  initialFromAccountId:
    string | null;

  initialToAccountId:
    string | null;

  initialCategory:
    string | null;

  initialNote:
    string | null;

  accounts:
    Account[];
}) {
  const router =
    useRouter();

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    amount,
    setAmount,
  ] =
    useState(
      initialAmount
    );

  const [
    fromAccountId,
    setFromAccountId,
  ] =
    useState(
      initialFromAccountId ??
      accounts[0]?.id ??
      ""
    );

  const [
    toAccountId,
    setToAccountId,
  ] =
    useState(
      initialToAccountId ??
      accounts[0]?.id ??
      ""
    );

  const [
    category,
    setCategory,
  ] =
    useState(
      initialCategory ??
      ""
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
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanAmount =
      amount.trim();

    if (
      !/^\d+(\.\d{1,2})?$/.test(
        cleanAmount
      ) ||
      Number(
        cleanAmount
      ) <= 0
    ) {
      setError(
        "Enter an amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (
      transactionType ===
        "expense" &&
      !fromAccountId
    ) {
      setError(
        "Select the account this expense was paid from."
      );

      return;
    }

    if (
      transactionType ===
        "income" &&
      !toAccountId
    ) {
      setError(
        "Select the account this income was deposited to."
      );

      return;
    }

    if (
      transactionType ===
      "transfer"
    ) {
      if (
        !fromAccountId ||
        !toAccountId
      ) {
        setError(
          "Select both transfer accounts."
        );

        return;
      }

      if (
        fromAccountId ===
        toAccountId
      ) {
        setError(
          "From account and to account must be different."
        );

        return;
      }
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      error:
        updateError,
    } =
      await supabase.rpc(
        "update_manual_transaction",
        {
          p_transaction_id:
            transactionId,

          p_amount:
            cleanAmount,

          p_from_account_id:
            transactionType ===
              "income"
              ? null
              : fromAccountId,

          p_to_account_id:
            transactionType ===
              "expense"
              ? null
              : toAccountId,

          p_category:
            transactionType ===
              "transfer"
              ? null
              : category.trim() ||
                null,

          p_note:
            note.trim() ||
            null,
        }
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

    setEditing(false);
    setLoading(false);

    router.refresh();
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Delete this transaction? This will update your balances, reports, and budgets. This action cannot be undone."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError("");
    setDeleting(true);

    const supabase =
      createClient();

    const {
      error:
        deleteError,
    } =
      await supabase.rpc(
        "delete_manual_transaction",
        {
          p_transaction_id:
            transactionId,
        }
      );

    if (
      deleteError
    ) {
      setError(
        deleteError.message
      );

      setDeleting(false);

      return;
    }

    router.replace(
      "/activity"
    );

    router.refresh();
  }

  function cancelEdit() {
    setAmount(
      initialAmount
    );

    setFromAccountId(
      initialFromAccountId ??
      accounts[0]?.id ??
      ""
    );

    setToAccountId(
      initialToAccountId ??
      accounts[0]?.id ??
      ""
    );

    setCategory(
      initialCategory ??
      ""
    );

    setNote(
      initialNote ??
      ""
    );

    setError("");

    setEditing(false);
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
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(
                  true
                );

                setError("");
              }}
              disabled={
                deleting
              }
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ActionIcon>
                <Pencil
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Edit transaction
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Change amount,
                  account, category
                  or note.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={
                handleDelete
              }
              disabled={
                deleting
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
                <Trash2
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
                  {deleting
                    ? "Deleting..."
                    : "Delete transaction"}
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Removes this
                  entry and
                  recalculates
                  your finances.
                </p>
              </div>
            </button>
          </>
        ) : (
          <form
            onSubmit={
              handleSave
            }
            className="p-4"
          >
            <p
              className="text-[9px] font-medium uppercase tracking-[0.12em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {transactionType}
            </p>

            <label
              htmlFor="edit-transaction-amount"
              className="mt-4 block text-sm font-semibold"
            >
              Amount
            </label>

            <div className="relative mt-2">
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
                id="edit-transaction-amount"
                type="text"
                inputMode="decimal"
                value={
                  amount
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
                  )
                }
                disabled={
                  loading
                }
                className="h-11 w-full rounded-[var(--radius-md)] pl-12 pr-3 text-right text-sm font-semibold tabular-nums outline-none disabled:opacity-60"
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

            {transactionType ===
              "expense" && (
              <AccountSelect
                id="edit-expense-from"
                label="Paid from"
                value={
                  fromAccountId
                }
                accounts={
                  accounts
                }
                disabled={
                  loading
                }
                onChange={
                  setFromAccountId
                }
              />
            )}

            {transactionType ===
              "income" && (
              <AccountSelect
                id="edit-income-to"
                label="Deposited to"
                value={
                  toAccountId
                }
                accounts={
                  accounts
                }
                disabled={
                  loading
                }
                onChange={
                  setToAccountId
                }
              />
            )}

            {transactionType ===
              "transfer" && (
              <>
                <AccountSelect
                  id="edit-transfer-from"
                  label="From"
                  value={
                    fromAccountId
                  }
                  accounts={
                    accounts
                  }
                  disabled={
                    loading
                  }
                  onChange={
                    setFromAccountId
                  }
                />

                <AccountSelect
                  id="edit-transfer-to"
                  label="To"
                  value={
                    toAccountId
                  }
                  accounts={
                    accounts
                  }
                  disabled={
                    loading
                  }
                  onChange={
                    setToAccountId
                  }
                />
              </>
            )}

            {transactionType !==
              "transfer" && (
              <div className="mt-4">
                <label
                  htmlFor="edit-transaction-category"
                  className="block text-sm font-semibold"
                >
                  Category
                </label>

                <input
                  id="edit-transaction-category"
                  type="text"
                  value={
                    category
                  }
                  onChange={(
                    event
                  ) =>
                    setCategory(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                  placeholder={
                    transactionType ===
                    "income"
                      ? "Salary, Freelance..."
                      : "Food, Transport..."
                  }
                  className="mt-2 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none disabled:opacity-60"
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
            )}

            <div className="mt-4">
              <label
                htmlFor="edit-transaction-note"
                className="block text-sm font-semibold"
              >
                Note
              </label>

              <textarea
                id="edit-transaction-note"
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
                rows={2}
                placeholder="Add a note..."
                className="mt-2 w-full resize-none rounded-[var(--radius-md)] px-3 py-3 text-sm outline-none disabled:opacity-60"
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

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={
                  loading
                }
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--primary)",

                  color:
                    "var(--primary-foreground)",
                }}
              >
                <Save
                  size={15}
                />

                {loading
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={
                  cancelEdit
                }
                disabled={
                  loading
                }
                className="h-11 flex-1 rounded-[var(--radius-md)] text-sm font-semibold disabled:opacity-60"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  border:
                    "1px solid var(--border)",

                  color:
                    "var(--foreground-secondary)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
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
    </section>
  );
}

function AccountSelect({
  id,
  label,
  value,
  accounts,
  disabled,
  onChange,
}: {
  id: string;

  label: string;

  value: string;

  accounts:
    Account[];

  disabled:
    boolean;

  onChange:
    (
      value:
        string
    ) => void;
}) {
  return (
    <div className="mt-4">
      <label
        htmlFor={
          id
        }
        className="block text-sm font-semibold"
      >
        {label}
      </label>

      <select
        id={
          id
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        disabled={
          disabled
        }
        className="mt-2 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none disabled:opacity-60"
        style={{
          backgroundColor:
            "var(--surface-secondary)",

          border:
            "1px solid var(--border)",

          color:
            "var(--foreground)",
        }}
      >
        {accounts.map(
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
  );
}

function ActionIcon({
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
          "var(--primary)",
      }}
    >
      {children}
    </div>
  );
}