"use client";

import Link from "next/link";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Dice5,
  HandCoins,
  Plus,
  Repeat2,
  StickyNote,
  Tag,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  formatMoneyFromCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: string;
  balanceCents: string;
};

type ActiveSession = {
  id: string;
  gameType: string;
  startedAt: string;
};

type EntryType =
  | "expense"
  | "income"
  | "transfer"
  | "lend";

export function TransactionForm({
  accounts,
  activeSessions,
  initialEntryType,
  initialRelatedSessionId,
}: {
  accounts: Account[];
  activeSessions: ActiveSession[];

  initialEntryType?:
    EntryType;

  initialRelatedSessionId?:
    string;
}) {
  const [
    entryType,
    setEntryType,
  ] =
    useState<EntryType>(
      initialEntryType ??
        "expense"
    );

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    primaryAccountId,
    setPrimaryAccountId,
  ] =
    useState(
      accounts[0]?.id ??
        ""
    );

  const [
    toAccountId,
    setToAccountId,
  ] =
    useState(
      accounts[1]?.id ??
        accounts[0]?.id ??
        ""
    );

  const [
    category,
    setCategory,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    personName,
    setPersonName,
  ] =
    useState("");

  const [
    dueDate,
    setDueDate,
  ] =
    useState("");

  /*
    If Quick Add was opened from an
    active session, that session is
    already selected.

    We still validate that it exists
    in the activeSessions list.
  */
  const [
    relatedSessionId,
    setRelatedSessionId,
  ] =
    useState(
      initialRelatedSessionId &&
        activeSessions.some(
          (session) =>
            session.id ===
            initialRelatedSessionId
        )
        ? initialRelatedSessionId
        : ""
    );

  const [
    accountBalances,
    setAccountBalances,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      () =>
        Object.fromEntries(
          accounts.map(
            (
              account
            ) => [
              account.id,
              account.balanceCents,
            ]
          )
        )
    );

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

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  if (
    accounts.length ===
    0
  ) {
    return (
      <div
        className="mt-8 rounded-[var(--radius-lg)] p-6"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-muted)",
            }}
          >
            <WalletCards
              size={18}
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Add an account first
            </p>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Entries need an
              account to move money
              into or out of.
            </p>
          </div>
        </div>

        <Link
          href="/accounts/new"
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",

            color:
              "var(--primary-foreground)",
          }}
        >
          <Plus
            size={15}
          />

          Add Account
        </Link>
      </div>
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
        "Enter an amount greater than 0 with no more than 2 decimal places."
      );

      return;
    }

    if (
      !primaryAccountId
    ) {
      setError(
        "Select an account."
      );

      return;
    }

    const amountCents =
      moneyStringToCents(
        cleanAmount
      );

    if (
      entryType ===
      "transfer"
    ) {
      if (
        !toAccountId
      ) {
        setError(
          "Select a destination account."
        );

        return;
      }

      if (
        primaryAccountId ===
        toAccountId
      ) {
        setError(
          "From account and to account must be different."
        );

        return;
      }
    }

    if (
      entryType ===
      "lend"
    ) {
      const cleanPersonName =
        personName.trim();

      if (
        !cleanPersonName
      ) {
        setError(
          "Enter the name of the person receiving the money."
        );

        return;
      }

      const availableBalance =
        getAccountBalance(
          accountBalances,
          primaryAccountId
        );

      if (
        availableBalance <=
        BigInt(0)
      ) {
        setError(
          "The selected account has no available balance to lend."
        );

        return;
      }

      if (
        amountCents >
        availableBalance
      ) {
        setError(
          `You only have NPR ${formatMoneyFromCents(
            availableBalance
          )} available in ${getAccountName(
            accounts,
            primaryAccountId
          )}.`
        );

        return;
      }
    }

    setLoading(
      true
    );

    const supabase =
      createClient();

    /*
      Lending
    */
    if (
      entryType ===
      "lend"
    ) {
      const cleanPersonName =
        personName.trim();

      const {
        personId,
        error:
          personError,
      } =
        await getOrCreateLoanPerson(
          supabase,
          cleanPersonName
        );

      if (
        personError ||
        !personId
      ) {
        setError(
          personError ??
            "Could not create the borrower."
        );

        setLoading(
          false
        );

        return;
      }

      const {
        error:
          loanError,
      } =
        await supabase
          .from("loans")
          .insert({
            person_id:
              personId,

            source_account_id:
              primaryAccountId,

            principal_amount:
              cleanAmount,

            game_session_id:
              relatedSessionId ||
              null,

            due_date:
              dueDate ||
              null,

            note:
              note.trim() ||
              null,
          });

      if (
        loanError
      ) {
        setError(
          loanError.message
        );

        setLoading(
          false
        );

        return;
      }

      adjustLocalBalance(
        primaryAccountId,
        -amountCents
      );

      /*
        Reset the fields that should
        change for the next loan.

        We intentionally KEEP the
        related session selected.

        During a game you may lend
        money to more than one person,
        so repeatedly selecting the
        same active session would be
        unnecessary.
      */
      setAmount("");
      setPersonName("");
      setDueDate("");
      setNote("");

      setSuccess(
        `NPR ${formatMoneyFromCents(
          amountCents
        )} lent to ${cleanPersonName}.`
      );

      setLoading(
        false
      );

      return;
    }

    /*
      Normal transactions
    */
    const fromAccountId =
      entryType ===
      "income"
        ? null
        : primaryAccountId;

    const destinationAccountId =
      entryType ===
      "expense"
        ? null
        : entryType ===
            "income"
          ? primaryAccountId
          : toAccountId;

    const {
      error:
        insertError,
    } =
      await supabase
        .from(
          "transactions"
        )
        .insert({
          transaction_type:
            entryType,

          amount:
            cleanAmount,

          from_account_id:
            fromAccountId,

          to_account_id:
            destinationAccountId,

          category:
            category.trim() ||
            null,

          note:
            note.trim() ||
            null,
        });

    if (
      insertError
    ) {
      setError(
        insertError.message
      );

      setLoading(
        false
      );

      return;
    }

    if (
      entryType ===
      "income"
    ) {
      adjustLocalBalance(
        primaryAccountId,
        amountCents
      );
    }

    if (
      entryType ===
      "expense"
    ) {
      adjustLocalBalance(
        primaryAccountId,
        -amountCents
      );
    }

    if (
      entryType ===
      "transfer"
    ) {
      adjustLocalBalance(
        primaryAccountId,
        -amountCents
      );

      adjustLocalBalance(
        toAccountId,
        amountCents
      );
    }

    setAmount("");
    setCategory("");
    setNote("");

    setSuccess(
      `${capitalize(
        entryType
      )} added successfully.`
    );

    setLoading(
      false
    );
  }

  function adjustLocalBalance(
    accountId:
      string,

    difference:
      bigint
  ) {
    setAccountBalances(
      (
        current
      ) => {
        const oldBalance =
          BigInt(
            current[
              accountId
            ] ??
              "0"
          );

        return {
          ...current,

          [accountId]:
            (
              oldBalance +
              difference
            ).toString(),
        };
      }
    );
  }

  function selectType(
    type:
      EntryType
  ) {
    setEntryType(
      type
    );

    setError("");
    setSuccess("");
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-8"
    >
      {/* Entry type */}
      <section>
        <p
          className="text-[9px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Entry type
        </p>

        <div
          className="mt-3 grid grid-cols-4 rounded-[var(--radius-md)] p-1"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
          }}
        >
          <TypeButton
            label="Expense"
            type="expense"
            active={
              entryType ===
              "expense"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectType(
                "expense"
              )
            }
          />

          <TypeButton
            label="Income"
            type="income"
            active={
              entryType ===
              "income"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectType(
                "income"
              )
            }
          />

          <TypeButton
            label="Transfer"
            type="transfer"
            active={
              entryType ===
              "transfer"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectType(
                "transfer"
              )
            }
          />

          <TypeButton
            label="Lend"
            type="lend"
            active={
              entryType ===
              "lend"
            }
            disabled={
              loading
            }
            onClick={() =>
              selectType(
                "lend"
              )
            }
          />
        </div>
      </section>

      {/* Hero amount */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-[9px] font-medium uppercase tracking-[0.15em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {getAmountLabel(
                entryType
              )}
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {getAmountDescription(
                entryType
              )}
            </p>
          </div>

          <EntryIcon
            type={
              entryType
            }
            size={17}
          />
        </div>

        <div
          className="mt-6 flex items-end gap-3 border-b pb-4"
          style={{
            borderColor:
              "var(--border)",
          }}
        >
          <span
            className="mb-1 text-xs font-medium"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            NPR
          </span>

          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
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
            placeholder="0.00"
            disabled={
              loading
            }
            className="min-w-0 flex-1 bg-transparent text-right text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              color:
                "var(--foreground)",
            }}
          />
        </div>
      </section>

      {/* Details */}
      <section className="mt-8">
        <p
          className="text-[9px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {entryType ===
          "transfer"
            ? "Transfer between"
            : "Details"}
        </p>

        <div
          className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          {entryType ===
          "transfer" ? (
            <TransferAccounts
              accounts={
                accounts
              }
              fromAccountId={
                primaryAccountId
              }
              toAccountId={
                toAccountId
              }
              disabled={
                loading
              }
              onFromChange={
                setPrimaryAccountId
              }
              onToChange={
                setToAccountId
              }
            />
          ) : entryType ===
            "lend" ? (
            <LendingDetails
              accounts={
                accounts
              }
              accountBalances={
                accountBalances
              }
              primaryAccountId={
                primaryAccountId
              }
              personName={
                personName
              }
              dueDate={
                dueDate
              }
              relatedSessionId={
                relatedSessionId
              }
              activeSessions={
                activeSessions
              }
              loading={
                loading
              }
              onAccountChange={
                setPrimaryAccountId
              }
              onPersonChange={
                setPersonName
              }
              onDueDateChange={
                setDueDate
              }
              onSessionChange={
                setRelatedSessionId
              }
            />
          ) : (
            <>
              <DetailRow>
                <AccountField
                  id="account"
                  label={
                    entryType ===
                    "income"
                      ? "Deposit to"
                      : "Pay from"
                  }
                  value={
                    primaryAccountId
                  }
                  accounts={
                    accounts
                  }
                  disabled={
                    loading
                  }
                  onChange={
                    setPrimaryAccountId
                  }
                />
              </DetailRow>

              <DetailRow
                borderTop
              >
                <div className="flex items-start gap-3">
                  <DetailIcon>
                    <Tag
                      size={15}
                    />
                  </DetailIcon>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="category"
                        className="text-sm font-semibold"
                      >
                        Category
                      </label>

                      <OptionalLabel />
                    </div>

                    <input
                      id="category"
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
                      placeholder={
                        entryType ===
                        "income"
                          ? "Salary, Freelance, Other..."
                          : "Food, Transport, Shopping..."
                      }
                      disabled={
                        loading
                      }
                      className="mt-3 h-10 w-full bg-transparent text-sm outline-none disabled:opacity-60"
                      style={{
                        color:
                          "var(--foreground)",
                      }}
                    />
                  </div>
                </div>
              </DetailRow>
            </>
          )}

          <DetailRow
            borderTop
          >
            <div className="flex items-start gap-3">
              <DetailIcon>
                <StickyNote
                  size={15}
                />
              </DetailIcon>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="note"
                    className="text-sm font-semibold"
                  >
                    Note
                  </label>

                  <OptionalLabel />
                </div>

                <textarea
                  id="note"
                  value={
                    note
                  }
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={
                    entryType ===
                    "lend"
                      ? "Why did you lend the money?"
                      : "Add a note..."
                  }
                  disabled={
                    loading
                  }
                  rows={2}
                  className="mt-3 w-full resize-none bg-transparent text-sm leading-5 outline-none disabled:opacity-60"
                  style={{
                    color:
                      "var(--foreground)",
                  }}
                />
              </div>
            </div>
          </DetailRow>
        </div>
      </section>

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

      {/* Success */}
      {success && (
        <div
          className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-xs font-medium"
          style={{
            backgroundColor:
              "var(--positive-soft)",

            border:
              "1px solid var(--positive)",

            color:
              "var(--positive)",
          }}
        >
          <Check
            size={14}
          />

          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={
          loading
        }
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor:
            "var(--primary)",

          color:
            "var(--primary-foreground)",
        }}
      >
        <EntryIcon
          type={
            entryType
          }
          size={16}
        />

        {loading
          ? "Saving..."
          : getSubmitLabel(
              entryType
            )}
      </button>
    </form>
  );
}

function LendingDetails({
  accounts,
  accountBalances,
  primaryAccountId,
  personName,
  dueDate,
  relatedSessionId,
  activeSessions,
  loading,
  onAccountChange,
  onPersonChange,
  onDueDateChange,
  onSessionChange,
}: {
  accounts:
    Account[];

  accountBalances:
    Record<
      string,
      string
    >;

  primaryAccountId:
    string;

  personName:
    string;

  dueDate:
    string;

  relatedSessionId:
    string;

  activeSessions:
    ActiveSession[];

  loading:
    boolean;

  onAccountChange:
    (
      value:
        string
    ) => void;

  onPersonChange:
    (
      value:
        string
    ) => void;

  onDueDateChange:
    (
      value:
        string
    ) => void;

  onSessionChange:
    (
      value:
        string
    ) => void;
}) {
  const available =
    getAccountBalance(
      accountBalances,
      primaryAccountId
    );

  return (
    <>
      <DetailRow>
        <div className="flex items-start gap-3">
          <DetailIcon>
            <UserRound
              size={15}
            />
          </DetailIcon>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="loan-person"
              className="text-[9px] font-medium uppercase tracking-[0.11em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Person
            </label>

            <input
              id="loan-person"
              type="text"
              value={
                personName
              }
              onChange={(
                event
              ) =>
                onPersonChange(
                  event
                    .target
                    .value
                )
              }
              placeholder="Who are you lending to?"
              autoComplete="off"
              disabled={
                loading
              }
              className="mt-2 h-8 w-full bg-transparent text-sm font-semibold outline-none disabled:opacity-60"
              style={{
                color:
                  "var(--foreground)",
              }}
            />
          </div>
        </div>
      </DetailRow>

      <DetailRow
        borderTop
      >
        <AccountField
          id="loan-account"
          label="Lend from"
          value={
            primaryAccountId
          }
          accounts={
            accounts
          }
          disabled={
            loading
          }
          onChange={
            onAccountChange
          }
        />

        <p
          className="mt-2 pl-11 text-[10px] tabular-nums"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Available: NPR{" "}
          {formatMoneyFromCents(
            available
          )}
        </p>
      </DetailRow>

      <DetailRow
        borderTop
      >
        <div className="flex items-start gap-3">
          <DetailIcon>
            <Dice5
              size={15}
            />
          </DetailIcon>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="loan-session"
                className="text-sm font-semibold"
              >
                Related session
              </label>

              <OptionalLabel />
            </div>

            <div className="relative mt-2">
              <select
                id="loan-session"
                value={
                  relatedSessionId
                }
                onChange={(
                  event
                ) =>
                  onSessionChange(
                    event.target
                      .value
                  )
                }
                disabled={
                  loading
                }
                className="h-9 w-full appearance-none bg-transparent pr-8 text-sm outline-none disabled:opacity-60"
                style={{
                  color:
                    "var(--foreground)",
                }}
              >
                <option value="">
                  None
                </option>

                {activeSessions.map(
                  (
                    session
                  ) => (
                    <option
                      key={
                        session.id
                      }
                      value={
                        session.id
                      }
                    >
                      {session.gameType}
                      {" • Active"}
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

            {activeSessions.length ===
              0 && (
              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                No active game
                session right now.
              </p>
            )}
          </div>
        </div>
      </DetailRow>

      <DetailRow
        borderTop
      >
        <div className="flex items-start gap-3">
          <DetailIcon>
            <CalendarDays
              size={15}
            />
          </DetailIcon>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="loan-due-date"
                className="text-sm font-semibold"
              >
                Due date
              </label>

              <OptionalLabel />
            </div>

            <input
              id="loan-due-date"
              type="date"
              value={
                dueDate
              }
              onChange={(
                event
              ) =>
                onDueDateChange(
                  event.target
                    .value
                )
              }
              disabled={
                loading
              }
              className="mt-2 h-9 w-full bg-transparent text-sm outline-none disabled:opacity-60"
              style={{
                color:
                  "var(--foreground)",
              }}
            />
          </div>
        </div>
      </DetailRow>
    </>
  );
}

function TypeButton({
  label,
  type,
  active,
  disabled,
  onClick,
}: {
  label: string;
  type: EntryType;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color =
    type ===
    "expense"
      ? "var(--negative)"
      : type ===
          "income"
        ? "var(--positive)"
        : "var(--primary)";

  const background =
    type ===
    "expense"
      ? "var(--negative-soft)"
      : type ===
          "income"
        ? "var(--positive-soft)"
        : "var(--surface-elevated)";

  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="flex h-10 min-w-0 items-center justify-center gap-1 rounded-[var(--radius-sm)] px-1 text-[9px] font-semibold transition disabled:opacity-60"
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
      <EntryIcon
        type={
          type
        }
        size={
          11
        }
      />

      <span className="truncate">
        {label}
      </span>
    </button>
  );
}

function TransferAccounts({
  accounts,
  fromAccountId,
  toAccountId,
  disabled,
  onFromChange,
  onToChange,
}: {
  accounts: Account[];
  fromAccountId: string;
  toAccountId: string;
  disabled: boolean;

  onFromChange:
    (
      value:
        string
    ) => void;

  onToChange:
    (
      value:
        string
    ) => void;
}) {
  return (
    <div className="relative">
      <DetailRow>
        <AccountField
          id="from-account"
          label="From"
          value={
            fromAccountId
          }
          accounts={
            accounts
          }
          disabled={
            disabled
          }
          onChange={
            onFromChange
          }
        />
      </DetailRow>

      <div
        className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            "var(--surface-elevated)",

          border:
            "1px solid var(--border)",

          color:
            "var(--primary)",
        }}
      >
        <Repeat2
          size={14}
        />
      </div>

      <DetailRow
        borderTop
      >
        <AccountField
          id="to-account"
          label="To"
          value={
            toAccountId
          }
          accounts={
            accounts
          }
          disabled={
            disabled
          }
          onChange={
            onToChange
          }
        />
      </DetailRow>
    </div>
  );
}

function AccountField({
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
  accounts: Account[];
  disabled: boolean;

  onChange:
    (
      value:
        string
    ) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <DetailIcon>
        <WalletCards
          size={15}
        />
      </DetailIcon>

      <div className="min-w-0 flex-1">
        <label
          htmlFor={
            id
          }
          className="text-[9px] font-medium uppercase tracking-[0.11em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {label}
        </label>

        <div className="relative mt-1">
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
            className="h-8 w-full appearance-none bg-transparent pr-8 text-sm font-semibold outline-none disabled:opacity-60"
            style={{
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
    </div>
  );
}

function DetailRow({
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
      className="px-4 py-4"
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
    ReactNode;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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

function OptionalLabel() {
  return (
    <span
      className="text-[9px]"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      Optional
    </span>
  );
}

function EntryIcon({
  type,
  size,
}: {
  type: EntryType;
  size: number;
}) {
  if (
    type ===
    "income"
  ) {
    return (
      <ArrowDownLeft
        size={
          size
        }
      />
    );
  }

  if (
    type ===
    "transfer"
  ) {
    return (
      <ArrowLeftRight
        size={
          size
        }
      />
    );
  }

  if (
    type ===
    "lend"
  ) {
    return (
      <HandCoins
        size={
          size
        }
      />
    );
  }

  return (
    <ArrowUpRight
      size={
        size
      }
    />
  );
}

function getAmountLabel(
  type:
    EntryType
) {
  if (
    type ===
    "income"
  ) {
    return "Income amount";
  }

  if (
    type ===
    "transfer"
  ) {
    return "Transfer amount";
  }

  if (
    type ===
    "lend"
  ) {
    return "Lend amount";
  }

  return "Expense amount";
}

function getAmountDescription(
  type:
    EntryType
) {
  if (
    type ===
    "income"
  ) {
    return "Money received.";
  }

  if (
    type ===
    "transfer"
  ) {
    return "Money moved between your accounts.";
  }

  if (
    type ===
    "lend"
  ) {
    return "Money temporarily given to someone.";
  }

  return "Money spent.";
}

function getSubmitLabel(
  type:
    EntryType
) {
  if (
    type ===
    "lend"
  ) {
    return "Lend Money";
  }

  return `Add ${capitalize(
    type
  )}`;
}

function getAccountBalance(
  accountBalances:
    Record<
      string,
      string
    >,

  accountId:
    string
) {
  return BigInt(
    accountBalances[
      accountId
    ] ??
      "0"
  );
}

function getAccountName(
  accounts:
    Account[],

  accountId:
    string
) {
  return (
    accounts.find(
      (
        account
      ) =>
        account.id ===
        accountId
    )?.name ??
    "this account"
  );
}

async function getOrCreateLoanPerson(
  supabase:
    ReturnType<
      typeof createClient
    >,

  name:
    string
) {
  const cleanName =
    name.trim();

  const normalizedName =
    cleanName.toLocaleLowerCase();

  const {
    data:
      existingPeople,

    error:
      peopleError,
  } =
    await supabase
      .from(
        "loan_people"
      )
      .select(
        "id, name"
      );

  if (
    peopleError
  ) {
    return {
      personId:
        null,

      error:
        peopleError.message,
    };
  }

  const existingPerson =
    existingPeople?.find(
      (
        person
      ) =>
        person.name
          .trim()
          .toLocaleLowerCase() ===
        normalizedName
    );

  if (
    existingPerson
  ) {
    return {
      personId:
        existingPerson.id,

      error:
        null,
    };
  }

  const {
    data:
      createdPerson,

    error:
      createError,
  } =
    await supabase
      .from(
        "loan_people"
      )
      .insert({
        name:
          cleanName,
      })
      .select(
        "id"
      )
      .single();

  if (
    !createError &&
    createdPerson
  ) {
    return {
      personId:
        createdPerson.id,

      error:
        null,
    };
  }

  /*
    A unique constraint protects against
    duplicate names.

    If two requests happen almost together,
    retry the lookup instead of failing.
  */
  const {
    data:
      retryPeople,

    error:
      retryError,
  } =
    await supabase
      .from(
        "loan_people"
      )
      .select(
        "id, name"
      );

  if (
    retryError
  ) {
    return {
      personId:
        null,

      error:
        createError?.message ??
        retryError.message,
    };
  }

  const retryPerson =
    retryPeople?.find(
      (
        person
      ) =>
        person.name
          .trim()
          .toLocaleLowerCase() ===
        normalizedName
    );

  if (
    retryPerson
  ) {
    return {
      personId:
        retryPerson.id,

      error:
        null,
    };
  }

  return {
    personId:
      null,

    error:
      createError?.message ??
      "Could not save this person.",
  };
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
    moneyStringToCents(
      value
    ) >
    BigInt(0)
  );
}

function moneyStringToCents(
  value:
    string
) {
  const [
    wholePart,
    decimalPart = "",
  ] =
    value.split(
      "."
    );

  return (
    BigInt(
      wholePart
    ) *
      BigInt(100) +
    BigInt(
      decimalPart.padEnd(
        2,
        "0"
      )
    )
  );
}

function capitalize(
  value:
    string
) {
  return (
    value
      .charAt(
        0
      )
      .toUpperCase() +
    value.slice(
      1
    )
  );
}