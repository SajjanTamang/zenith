"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  RotateCcw,
  StickyNote,
  Trash2,
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

export function RepaymentHistoryItem({
  repaymentId,
  initialAccountId,
  initialAmount,
  initialNote,
  repaidAt,
  accountName,
  accountArchived,
  maxAmountCents,
  accounts,
  borderTop,
}: {
  repaymentId: string;
  initialAccountId: string;
  initialAmount: string | number;
  initialNote: string | null | undefined;
  repaidAt: string;

  accountName: string;
  accountArchived: boolean;

  maxAmountCents: string;

  accounts: Account[];

  borderTop: boolean;
}) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    accountId,
    setAccountId,
  ] =
    useState(
      initialAccountId
    );

  const [
    amount,
    setAmount,
  ] =
    useState(
      String(
        initialAmount
      )
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

  const repaymentAmount =
    moneyToCents(
      initialAmount
    );

  const maximumAmount =
    BigInt(
      maxAmountCents
    );

  function resetForm() {
    setAccountId(
      initialAccountId
    );

    setAmount(
      String(
        initialAmount
      )
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

    const cleanAmount =
      amount.trim();

    if (
      !isPositiveMoney(
        cleanAmount
      )
    ) {
      setError(
        "Enter a repayment amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (
      !accountId
    ) {
      setError(
        "Select the account receiving the repayment."
      );

      return;
    }

    const amountCents =
      moneyToCents(
        cleanAmount
      );

    if (
      amountCents >
      maximumAmount
    ) {
      setError(
        `This repayment can be at most NPR ${formatMoneyFromCents(
          maximumAmount
        )}.`
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
        "update_manual_repayment",
        {
          p_repayment_id:
            repaymentId,

          p_to_account_id:
            accountId,

          p_amount:
            cleanAmount,

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
      "Repayment updated."
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
      accountArchived
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete this NPR ${formatMoneyFromCents(
          repaymentAmount
        )} repayment? The money will be removed from the receiving account and the loan outstanding balance will increase again.`
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
        "delete_manual_repayment",
        {
          p_repayment_id:
            repaymentId,
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

    setDeleting(
      false
    );

    router.refresh();
  }

  return (
    <div
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen(
            (
              current
            ) =>
              !current
          );

          setError("");
          setSuccess("");
        }}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:brightness-[0.98]"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              "var(--positive-soft)",

            color:
              "var(--positive)",
          }}
        >
          <RotateCcw
            size={15}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Repayment
              </p>

              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {formatKathmanduDate(
                  repaidAt
                )}
                {" • "}
                {accountName}
                {accountArchived
                  ? " • Archived"
                  : ""}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="text-sm font-semibold tabular-nums"
                style={{
                  color:
                    "var(--positive)",
                }}
              >
                +NPR{" "}
                {formatMoneyFromCents(
                  repaymentAmount
                )}
              </p>

              {initialNote && (
                <p
                  className="mt-1 max-w-[140px] truncate text-[9px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  {initialNote}
                </p>
              )}
            </div>
          </div>
        </div>

        <ChevronRight
          size={15}
          className={`mt-1 shrink-0 transition ${
            open
              ? "rotate-90"
              : ""
          }`}
          style={{
            color:
              "var(--foreground-muted)",
          }}
        />
      </button>

      {open && (
        <div
          className="px-4 pb-4"
          style={{
            borderTop:
              "1px solid var(--border)",
          }}
        >
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 pt-4">
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
                    deleting
                  }
                  className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:opacity-60"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",

                    color:
                      "var(--foreground)",
                  }}
                >
                  <Pencil
                    size={14}
                  />

                  Edit
                </button>

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    deleting ||
                    accountArchived
                  }
                  className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor:
                      "var(--negative-soft)",

                    color:
                      "var(--negative)",
                  }}
                >
                  <Trash2
                    size={14}
                  />

                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>

              {accountArchived && (
                <p
                  className="mt-3 text-[10px] leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Restore the historical
                  receiving account before
                  deleting this repayment
                  or changing its money
                  movement.
                </p>
              )}
            </>
          ) : (
            <form
              onSubmit={
                handleSubmit
              }
              className="pt-4"
            >
              <div
                className="overflow-hidden rounded-[var(--radius-md)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                }}
              >
                {/* Amount */}
                <EditRow>
                  <DetailIcon>
                    <RotateCcw
                      size={14}
                    />
                  </DetailIcon>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`repayment-amount-${repaymentId}`}
                        className="text-[9px] font-medium uppercase tracking-[0.11em]"
                        style={{
                          color:
                            "var(--foreground-muted)",
                        }}
                      >
                        Amount
                      </label>

                      {accountArchived && (
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
                        id={`repayment-amount-${repaymentId}`}
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
                          loading ||
                          accountArchived
                        }
                        className="h-8 min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums outline-none disabled:opacity-60"
                      />
                    </div>

                    <p
                      className="mt-1 text-[9px]"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Maximum NPR{" "}
                      {formatMoneyFromCents(
                        maximumAmount
                      )}
                    </p>
                  </div>
                </EditRow>

                {/* Account */}
                <EditRow
                  borderTop
                >
                  <DetailIcon>
                    <WalletCards
                      size={14}
                    />
                  </DetailIcon>

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`repayment-account-${repaymentId}`}
                      className="text-[9px] font-medium uppercase tracking-[0.11em]"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Receive into
                    </label>

                    <div className="relative mt-1">
                      <select
                        id={`repayment-account-${repaymentId}`}
                        value={
                          accountId
                        }
                        onChange={(
                          event
                        ) =>
                          setAccountId(
                            event.target
                              .value
                          )
                        }
                        disabled={
                          loading ||
                          accountArchived
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

                {/* Note */}
                <EditRow
                  borderTop
                >
                  <DetailIcon>
                    <StickyNote
                      size={14}
                    />
                  </DetailIcon>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`repayment-note-${repaymentId}`}
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
                      id={`repayment-note-${repaymentId}`}
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
                      className="mt-2 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
                    />
                  </div>
                </EditRow>
              </div>

              {accountArchived && (
                <p
                  className="mt-3 text-[10px] leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  The receiving account is
                  archived. You may still
                  correct the note, but
                  restore the account before
                  changing the amount or
                  destination.
                </p>
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

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    closeEditor
                  }
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
                    loading
                  }
                  className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold disabled:opacity-60"
                  style={{
                    backgroundColor:
                      "var(--primary)",

                    color:
                      "var(--primary-foreground)",
                  }}
                >
                  <Check
                    size={14}
                  />

                  {loading
                    ? "Saving..."
                    : "Save"}
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
        </div>
      )}
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
      className="flex items-start gap-3 px-3 py-3"
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
          "var(--surface)",

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
  const success =
    type ===
    "success";

  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] px-3 py-2 text-[10px] leading-5"
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
  value: string
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

function formatKathmanduDate(
  value: string
) {
  if (
    !value
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}