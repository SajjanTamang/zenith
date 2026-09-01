"use client";

import {
  Banknote,
  LockKeyhole,
  Pencil,
  Save,
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

export function AccountEditForm({
  accountId,
  accountType,
  initialName,
  initialOpeningBalance,
}: {
  accountId: string;
  accountType: string;
  initialName: string;

  initialOpeningBalance:
    | string
    | number;
}) {
  const router =
    useRouter();

  const isGameBankroll =
    accountType ===
    "game_bankroll";

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    name,
    setName,
  ] =
    useState(
      initialName
    );

  const [
    openingBalance,
    setOpeningBalance,
  ] =
    useState(
      String(
        initialOpeningBalance
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

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName =
      name.trim();

    if (
      !cleanName
    ) {
      setError(
        "Account name is required."
      );

      return;
    }

    const cleanBalance =
      isGameBankroll
        ? String(
            initialOpeningBalance
          )
        : openingBalance.trim();

    const moneyPattern =
      /^-?\d+(\.\d{1,2})?$/;

    if (
      !moneyPattern.test(
        cleanBalance
      )
    ) {
      setError(
        "Enter a valid opening balance with no more than 2 decimal places."
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
        "update_manual_account",
        {
          p_account_id:
            accountId,

          p_name:
            cleanName,

          p_opening_balance:
            cleanBalance,
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

    setLoading(
      false
    );

    setEditing(
      false
    );

    setSuccess(
      "Account updated successfully."
    );

    router.refresh();
  }

  function cancelEdit() {
    setName(
      initialName
    );

    setOpeningBalance(
      String(
        initialOpeningBalance
      )
    );

    setError("");
    setSuccess("");

    setEditing(
      false
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
        Manage
      </p>

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
                "var(--primary)",
            }}
          >
            <Pencil
              size={15}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Edit account
            </p>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {isGameBankroll
                ? "Change the account name."
                : "Change the name or opening balance."}
            </p>
          </div>
        </button>
      ) : (
        <form
          onSubmit={
            handleSave
          }
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          {/* Name */}
          <div className="p-5">
            <div className="flex items-start gap-3">
              <FieldIcon>
                <WalletCards
                  size={16}
                />
              </FieldIcon>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor="edit-account-name"
                  className="block text-sm font-semibold"
                >
                  Account name
                </label>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Give this account
                  a clear name.
                </p>

                <input
                  id="edit-account-name"
                  type="text"
                  value={
                    name
                  }
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                  autoComplete="off"
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
              </div>
            </div>
          </div>

          {/* Opening balance */}
          <div
            className="p-5"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <div className="flex items-start gap-3">
              <FieldIcon>
                {isGameBankroll ? (
                  <LockKeyhole
                    size={16}
                  />
                ) : (
                  <Banknote
                    size={16}
                  />
                )}
              </FieldIcon>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor="edit-opening-balance"
                  className="block text-sm font-semibold"
                >
                  Opening balance
                </label>

                {isGameBankroll ? (
                  <>
                    <p
                      className="mt-1 text-xs leading-5"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Game Bankroll
                      opening balances
                      are locked because
                      session funding is
                      managed automatically.
                    </p>

                    <div
                      className="mt-4 rounded-[var(--radius-md)] px-3 py-3 text-right text-sm font-semibold tabular-nums"
                      style={{
                        backgroundColor:
                          "var(--surface-secondary)",

                        border:
                          "1px solid var(--border)",

                        color:
                          "var(--foreground-secondary)",
                      }}
                    >
                      NPR{" "}
                      {
                        initialOpeningBalance
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      className="mt-1 text-xs leading-5"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      Correct the amount
                      that was already in
                      this account when
                      tracking began.
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
                        id="edit-opening-balance"
                        type="text"
                        inputMode="decimal"
                        value={
                          openingBalance
                        }
                        onChange={(
                          event
                        ) =>
                          setOpeningBalance(
                            event.target
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

                    <p
                      className="mt-2 text-[10px] leading-4"
                      style={{
                        color:
                          "var(--foreground-muted)",
                      }}
                    >
                      This changes your
                      calculated balance
                      and net worth, but
                      does not create an
                      income transaction.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Type */}
          <div
            className="p-5"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <div className="flex items-start gap-3">
              <FieldIcon>
                <LockKeyhole
                  size={16}
                />
              </FieldIcon>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Account type
                </p>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  {
                    formatAccountType(
                      accountType
                    )
                  }
                  {" • "}
                  Type cannot be
                  changed after
                  creation.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="mx-5 mb-5 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
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

          <div
            className="flex gap-2 p-5"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <button
              type="submit"
              disabled={
                loading
              }
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
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
              className="h-11 flex-1 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:opacity-60"
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

      {success && (
        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs font-medium"
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

function FieldIcon({
  children,
}: {
  children:
    React.ReactNode;
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

function formatAccountType(
  type: string
) {
  if (
    type ===
    "game_bankroll"
  ) {
    return "Game Bankroll";
  }

  if (
    type ===
    "cash"
  ) {
    return "Cash";
  }

  if (
    type ===
    "bank"
  ) {
    return "Bank";
  }

  if (
    type ===
    "wallet"
  ) {
    return "Wallet";
  }

  return type
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}