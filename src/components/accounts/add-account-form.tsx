"use client";

import {
  Banknote,
  Gamepad2,
  Landmark,
  Plus,
  Smartphone,
  WalletCards,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const accountTypes = [
  {
    value: "cash",
    label: "Cash",
    description: "Physical cash you keep.",
  },
  {
    value: "bank",
    label: "Bank",
    description: "A bank account.",
  },
  {
    value: "wallet",
    label: "Wallet",
    description: "Digital wallet such as eSewa.",
  },
  {
    value: "game_bankroll",
    label: "Game Bankroll",
    description: "Money reserved for game sessions.",
  },
  {
    value: "other",
    label: "Other",
    description: "Any other money account.",
  },
] as const;

export function AddAccountForm() {
  const router = useRouter();

  const [
    name,
    setName,
  ] = useState("");

  const [
    accountType,
    setAccountType,
  ] = useState("cash");

  const [
    openingBalance,
    setOpeningBalance,
  ] = useState("0.00");

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName =
      name.trim();

    const cleanBalance =
      openingBalance.trim();

    if (!cleanName) {
      setError(
        "Account name is required."
      );

      return;
    }

    const moneyPattern =
      /^-?\d+(\.\d{1,2})?$/;

    if (
      !moneyPattern.test(
        cleanBalance
      )
    ) {
      setError(
        "Enter a valid amount with no more than 2 decimal places."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      error: insertError,
    } = await supabase
      .from("accounts")
      .insert({
        name: cleanName,

        account_type:
          accountType,

        opening_balance:
          cleanBalance,
      });

    if (insertError) {
      setError(
        insertError.message
      );

      setLoading(false);

      return;
    }

    router.replace(
      "/accounts"
    );

    router.refresh();
  }

  const selectedType =
    accountTypes.find(
      (type) =>
        type.value ===
        accountType
    ) ??
    accountTypes[0];

  return (
    <form
      onSubmit={handleSubmit}
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
        {/* Account name */}
        <FormSection>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <WalletCards
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="account-name"
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
                id="account-name"
                type="text"
                value={name}
                onChange={(
                  event
                ) =>
                  setName(
                    event.target
                      .value
                  )
                }
                placeholder="Cash, Nabil Bank, eSewa..."
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
            </div>
          </div>
        </FormSection>

        {/* Account type */}
        <FormSection borderTop>
          <div className="flex items-start gap-3">
            <AccountTypeIcon
              type={accountType}
            />

            <div className="min-w-0 flex-1">
              <label
                htmlFor="account-type"
                className="block text-sm font-semibold"
              >
                Account type
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {
                  selectedType.description
                }
              </p>

              <select
                id="account-type"
                value={
                  accountType
                }
                onChange={(
                  event
                ) =>
                  setAccountType(
                    event.target
                      .value
                  )
                }
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
              >
                {accountTypes.map(
                  (type) => (
                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {
                        type.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </FormSection>

        {/* Opening balance */}
        <FormSection borderTop>
          <div className="flex items-start gap-3">
            <FieldIcon>
              <Banknote
                size={16}
              />
            </FieldIcon>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="opening-balance"
                className="block text-sm font-semibold"
              >
                Opening balance
              </label>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Current amount
                already in this
                account.
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
                  id="opening-balance"
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
                  placeholder="0.00"
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
                Opening balance
                contributes to
                your total wealth
                but is not counted
                as income.
              </p>
            </div>
          </div>
        </FormSection>
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
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          <Plus size={16} />

          {loading
            ? "Creating account..."
            : "Create Account"}
        </button>

        <button
          type="button"
          disabled={loading}
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
    React.ReactNode;
  borderTop?: boolean;
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

function AccountTypeIcon({
  type,
}: {
  type: string;
}) {
  let icon =
    <WalletCards
      size={16}
    />;

  let color =
    "var(--foreground-secondary)";

  if (type === "cash") {
    icon =
      <Banknote
        size={16}
      />;
  }

  if (type === "bank") {
    icon =
      <Landmark
        size={16}
      />;
  }

  if (type === "wallet") {
    icon =
      <Smartphone
        size={16}
      />;
  }

  if (
    type ===
    "game_bankroll"
  ) {
    icon =
      <Gamepad2
        size={16}
      />;

    color =
      "var(--primary)";
  }

  return (
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        color,
      }}
    >
      {icon}
    </div>
  );
}