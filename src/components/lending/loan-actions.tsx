"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Pencil,
  StickyNote,
  Trash2,
  UserRound,
  WalletCards,
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

type Account = {
  id: string;
  name: string;
  archived: boolean;
};

export function LoanActions({
  loanId,
  initialPersonName,
  initialSourceAccountId,
  initialPrincipalAmount,
  initialDueDate,
  initialNote,
  totalRepaidCents,
  repaymentCount,
  sourceAccountArchived,
  accounts,
}: {
  loanId: string;

  initialPersonName: string;
  initialSourceAccountId: string;
  initialPrincipalAmount: string;
  initialDueDate: string | null;
  initialNote: string | null;

  totalRepaidCents: string;

  repaymentCount: number;
  sourceAccountArchived: boolean;

  accounts: Account[];
}) {
  const router =
    useRouter();

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    personName,
    setPersonName,
  ] =
    useState(
      initialPersonName
    );

  const [
    sourceAccountId,
    setSourceAccountId,
  ] =
    useState(
      initialSourceAccountId
    );

  const [
    principalAmount,
    setPrincipalAmount,
  ] =
    useState(
      initialPrincipalAmount
    );

  const [
    dueDate,
    setDueDate,
  ] =
    useState(
      initialDueDate ??
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

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const totalRepaid =
    BigInt(
      totalRepaidCents
    );

  const canDelete =
    repaymentCount ===
      0 &&
    !sourceAccountArchived;

  function resetForm() {
    setPersonName(
      initialPersonName
    );

    setSourceAccountId(
      initialSourceAccountId
    );

    setPrincipalAmount(
      initialPrincipalAmount
    );

    setDueDate(
      initialDueDate ??
        ""
    );

    setNote(
      initialNote ??
        ""
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

    const cleanPersonName =
      personName.trim();

    const cleanAmount =
      principalAmount.trim();

    if (
      !cleanPersonName
    ) {
      setError(
        "Enter the borrower's name."
      );

      return;
    }

    if (
      !isPositiveMoney(
        cleanAmount
      )
    ) {
      setError(
        "Enter a loan amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (
      !sourceAccountId
    ) {
      setError(
        "Select the source account."
      );

      return;
    }

    const amountCents =
      moneyToCents(
        cleanAmount
      );

    if (
      amountCents <
      totalRepaid
    ) {
      setError(
        `The loan cannot be lower than NPR ${formatMoneyFromCents(
          totalRepaid
        )}, because that amount has already been repaid.`
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
        updateError,
    } =
      await supabase.rpc(
        "update_manual_loan",
        {
          p_loan_id:
            loanId,

          p_person_name:
            cleanPersonName,

          p_source_account_id:
            sourceAccountId,

          p_principal_amount:
            cleanAmount,

          p_due_date:
            dueDate ||
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

      setLoading(
        false
      );

      return;
    }

    setSuccess(
      "Loan updated successfully."
    );

    setLoading(
      false
    );

    setEditing(
      false
    );

    router.refresh();
  }

  async function handleDelete() {
    if (
      !canDelete
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this loan? The money will be returned to the original source account and this lending record will be permanently removed."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeleting(
      true
    );

    setError("");
    setSuccess("");

    const supabase =
      createClient();

    const {
      error:
        deleteError,
    } =
      await supabase.rpc(
        "delete_manual_loan",
        {
          p_loan_id:
            loanId,
        }
      );

    if (
      deleteError
    ) {
      setError(
        deleteError.message
      );

      setDeleting(
        false
      );

      return;
    }

    router.push(
      "/lending"
    );

    router.refresh();
  }

  return (
    <section className="mt-8">
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Manage loan
      </p>

      {!editing ? (
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
            onClick={() => {
              setError("");
              setSuccess("");

              setEditing(
                true
              );
            }}
            disabled={
              deleting
            }
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:brightness-[0.98] disabled:opacity-60"
          >
            <ActionIcon>
              <Pencil
                size={15}
              />
            </ActionIcon>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Edit loan
              </p>

              <p
                className="mt-1 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Correct the person,
                amount, account,
                due date, or note.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={
              deleting ||
              !canDelete
            }
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition enabled:hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                    canDelete
                      ? "var(--negative)"
                      : "var(--foreground-muted)",
                }}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete loan"}
              </p>

              <p
                className="mt-1 text-[10px] leading-4"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Permanently remove
                an incorrect loan.
              </p>
            </div>
          </button>

          {!canDelete && (
            <div
              className="px-4 py-3"
              style={{
                borderTop:
                  "1px solid var(--border)",
              }}
            >
              {repaymentCount >
              0 ? (
                <p
                  className="text-[10px] leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  This loan has{" "}
                  {repaymentCount}{" "}
                  {repaymentCount ===
                  1
                    ? "repayment"
                    : "repayments"}.
                  Delete those
                  repayments first
                  before deleting the
                  loan.
                </p>
              ) : sourceAccountArchived ? (
                <p
                  className="text-[10px] leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Restore the
                  historical source
                  account before
                  deleting this loan.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : (
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
            {/* Person */}
            <EditRow>
              <ActionIcon>
                <UserRound
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor="edit-loan-person"
                  className="text-[9px] font-medium uppercase tracking-[0.11em]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Person
                </label>

                <input
                  id="edit-loan-person"
                  type="text"
                  value={
                    personName
                  }
                  onChange={(
                    event
                  ) =>
                    setPersonName(
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

            {/* Amount */}
            <EditRow
              borderTop
            >
              <ActionIcon>
                <WalletCards
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="edit-loan-amount"
                    className="text-[9px] font-medium uppercase tracking-[0.11em]"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    Loan amount
                  </label>

                  {sourceAccountArchived && (
                    <span
                      className="text-[9px]"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Locked
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="text-xs"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    NPR
                  </span>

                  <input
                    id="edit-loan-amount"
                    type="text"
                    inputMode="decimal"
                    value={
                      principalAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setPrincipalAmount(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      loading ||
                      sourceAccountArchived
                    }
                    className="h-8 min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums outline-none disabled:opacity-60"
                  />
                </div>

                {totalRepaid >
                  BigInt(0) && (
                  <p
                    className="mt-2 text-[10px]"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    Already repaid:
                    {" "}
                    NPR{" "}
                    {formatMoneyFromCents(
                      totalRepaid
                    )}
                  </p>
                )}
              </div>
            </EditRow>

            {/* Source */}
            <EditRow
              borderTop
            >
              <ActionIcon>
                <WalletCards
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="edit-loan-source"
                    className="text-[9px] font-medium uppercase tracking-[0.11em]"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    Lent from
                  </label>

                  {sourceAccountArchived && (
                    <span
                      className="text-[9px]"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Restore to change
                    </span>
                  )}
                </div>

                <div className="relative mt-1">
                  <select
                    id="edit-loan-source"
                    value={
                      sourceAccountId
                    }
                    onChange={(
                      event
                    ) =>
                      setSourceAccountId(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      loading ||
                      sourceAccountArchived
                    }
                    className="h-8 w-full appearance-none bg-transparent pr-8 text-sm font-semibold outline-none disabled:opacity-60"
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
                          {account.name}
                          {account.archived
                            ? " (Archived)"
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  />
                </div>
              </div>
            </EditRow>

            {/* Due date */}
            <EditRow
              borderTop
            >
              <ActionIcon>
                <CalendarDays
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="edit-loan-due-date"
                    className="text-sm font-semibold"
                  >
                    Due date
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

                <input
                  id="edit-loan-due-date"
                  type="date"
                  value={
                    dueDate
                  }
                  onChange={(
                    event
                  ) =>
                    setDueDate(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                  className="mt-2 h-9 w-full bg-transparent text-sm outline-none disabled:opacity-60"
                />
              </div>
            </EditRow>

            {/* Note */}
            <EditRow
              borderTop
            >
              <ActionIcon>
                <StickyNote
                  size={15}
                />
              </ActionIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="edit-loan-note"
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
                  id="edit-loan-note"
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
                  rows={2}
                  disabled={
                    loading
                  }
                  className="mt-3 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
                />
              </div>
            </EditRow>
          </div>

          {sourceAccountArchived && (
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
              The source account is
              archived. You can still
              correct the person, due
              date, and note, but restore
              the account before changing
              the loan amount or source.
            </div>
          )}

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
                : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {!editing &&
        error && (
        <MessageBox
          type="error"
          message={
            error
          }
        />
      )}

      {!editing &&
        success && (
        <MessageBox
          type="success"
          message={
            success
          }
        />
      )}
    </section>
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

  message:
    string;
}) {
  const success =
    type ===
    "success";

  return (
    <div
      className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
      style={{
        backgroundColor:
          success
            ? "var(--positive-soft)"
            : "var(--negative-soft)",

        border:
          success
            ? "1px solid var(--positive)"
            : "1px solid var(--negative)",

        color:
          success
            ? "var(--positive)"
            : "var(--negative)",
      }}
    >
      {message}
    </div>
  );
}

function isPositiveMoney(
  value:
    string
) {
  const clean =
    value.trim();

  if (
    !/^\d+(\.\d{1,2})?$/.test(
      clean
    )
  ) {
    return false;
  }

  return (
    moneyToCents(
      clean
    ) >
    BigInt(0)
  );
}