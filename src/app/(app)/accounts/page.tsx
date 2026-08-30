import Link from "next/link";
import { Plus, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatMoneyFromCents } from "@/lib/money";
import {
  calculateAccountBalances,
  totalBalanceFromAccounts,
  type FinanceGameSession,
  type FinanceTransaction,
} from "@/lib/finance";

type Account = {
  id: string;
  name: string;
  account_type: string;
  opening_balance: string | number;
  created_at: string;
};

export default async function AccountsPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
    { data: gameSessions, error: gameSessionsError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select(`
        id,
        name,
        account_type,
        opening_balance,
        created_at
      `)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("transactions")
      .select(`
        transaction_type,
        amount,
        from_account_id,
        to_account_id,
        occurred_at
      `),

    supabase
      .from("game_sessions")
      .select(`
        bankroll_account_id,
        status,
        result_type,
        result_amount,
        started_at,
        ended_at
      `),
  ]);

  if (
    accountsError ||
    transactionsError ||
    gameSessionsError
  ) {
    return (
      <div>
        <h1 className="text-xl font-semibold">
          Accounts
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor: "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load account balances:{" "}
          {accountsError?.message ??
            transactionsError?.message ??
            gameSessionsError?.message}
        </div>
      </div>
    );
  }

  const typedAccounts =
    (accounts ?? []) as Account[];

  const typedTransactions =
    (transactions ?? []) as FinanceTransaction[];

  const typedGameSessions =
    (gameSessions ?? []) as FinanceGameSession[];

  /*
    Current balance comes from:

    Opening balance
    + Income
    - Expenses
    + Transfers in
    - Transfers out
    + / - Game P&L for bankroll accounts
  */
  const accountBalances =
    calculateAccountBalances(
      typedAccounts,
      typedTransactions,
      typedGameSessions
    );

  const totalBalance =
    totalBalanceFromAccounts(accountBalances);

  return (
    <div>
      <div>
        <p
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Money
        </p>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Accounts
          </h1>

          <Link
            href="/accounts/new"
            className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Plus size={16} />
            Add
          </Link>
        </div>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--foreground-secondary)",
          }}
        >
          Your cash, bank, wallet, and bankroll accounts.
        </p>
      </div>

      {typedAccounts.length === 0 ? (
        <EmptyAccounts />
      ) : (
        <>
          <section
            className="mt-8 rounded-[var(--radius-lg)] p-5"
            style={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-xs font-medium uppercase tracking-[0.12em]"
              style={{
                color: "var(--foreground-muted)",
              }}
            >
              Total balance
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              NPR {formatMoneyFromCents(totalBalance)}
            </p>
          </section>

          <div className="mt-4 space-y-3">
            {typedAccounts.map((account) => {
              const currentBalance =
                accountBalances.get(account.id) ??
                BigInt(0);

              const isBankroll =
                account.account_type ===
                "game_bankroll";

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-[var(--radius-lg)] p-4"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p className="font-medium">
                      {account.name}
                    </p>

                    <p
                      className="mt-1 text-xs capitalize"
                      style={{
                        color: "var(--foreground-muted)",
                      }}
                    >
                      {formatAccountType(
                        account.account_type
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      NPR{" "}
                      {formatMoneyFromCents(
                        currentBalance
                      )}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: "var(--foreground-muted)",
                      }}
                    >
                      {isBankroll
                        ? "Current bankroll"
                        : "Current balance"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyAccounts() {
  return (
    <div
      className="mt-10 flex flex-col items-center rounded-[var(--radius-lg)] px-6 py-12 text-center"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--surface-secondary)",
          color: "var(--foreground-secondary)",
        }}
      >
        <WalletCards size={20} />
      </div>

      <h2 className="mt-4 text-sm font-semibold">
        No accounts yet
      </h2>

      <p
        className="mt-2 max-w-xs text-sm leading-6"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Add your first account to start tracking your
        money in Zenith.
      </p>
    </div>
  );
}

function formatAccountType(type: string) {
  return type.replaceAll("_", " ");
}