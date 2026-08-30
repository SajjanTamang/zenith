import { moneyToCents } from "@/lib/money";

export type FinanceAccount = {
  id: string;
  account_type: string;
  opening_balance: string | number;
};

export type FinanceTransaction = {
  transaction_type: "income" | "expense" | "transfer";
  amount: string | number;
  from_account_id: string | null;
  to_account_id: string | null;
  occurred_at?: string;
};

export type FinanceGameSession = {
  bankroll_account_id: string;
  status: "active" | "completed";
  result_type: "win" | "loss" | "even" | null;
  result_amount: string | number | null;
  started_at?: string;
  ended_at?: string | null;
};

export function calculateAccountBalances(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  gameSessions: FinanceGameSession[] = []
) {
  const balances = new Map<string, bigint>();

  /*
    Every account starts with its opening balance.

    Opening balance counts toward total wealth,
    but it is not income.
  */
  for (const account of accounts) {
    balances.set(
      account.id,
      moneyToCents(account.opening_balance)
    );
  }

  /*
    Apply normal financial transactions.
  */
  for (const transaction of transactions) {
    const amount = moneyToCents(transaction.amount);

    /*
      Income:
      money enters an account.
    */
    if (
      transaction.transaction_type === "income" &&
      transaction.to_account_id
    ) {
      addToBalance(
        balances,
        transaction.to_account_id,
        amount
      );
    }

    /*
      Expense:
      money leaves an account.
    */
    if (
      transaction.transaction_type === "expense" &&
      transaction.from_account_id
    ) {
      addToBalance(
        balances,
        transaction.from_account_id,
        -amount
      );
    }

    /*
      Transfer:
      money leaves one owned account
      and enters another owned account.

      Total wealth does not change.
    */
    if (transaction.transaction_type === "transfer") {
      if (transaction.from_account_id) {
        addToBalance(
          balances,
          transaction.from_account_id,
          -amount
        );
      }

      if (transaction.to_account_id) {
        addToBalance(
          balances,
          transaction.to_account_id,
          amount
        );
      }
    }
  }

  /*
    Apply completed game-session P&L.

    Playing amount does NOT change account balance.

    Only the final daily result changes the
    Game Bankroll account.

    Win  -> bankroll increases
    Loss -> bankroll decreases
    Even -> no change
  */
  for (const session of gameSessions) {
    if (
      session.status !== "completed" ||
      session.result_type === null ||
      session.result_amount === null
    ) {
      continue;
    }

    const amount = moneyToCents(
      session.result_amount
    );

    if (session.result_type === "win") {
      addToBalance(
        balances,
        session.bankroll_account_id,
        amount
      );
    }

    if (session.result_type === "loss") {
      addToBalance(
        balances,
        session.bankroll_account_id,
        -amount
      );
    }

    /*
      "even" requires no balance change.
    */
  }

  return balances;
}

export function totalBalanceFromAccounts(
  balances: Map<string, bigint>
) {
  return Array.from(balances.values()).reduce(
    (total, balance) => total + balance,
    BigInt(0)
  );
}

export function totalAccountTypeBalance(
  accounts: FinanceAccount[],
  balances: Map<string, bigint>,
  accountType: string
) {
  return accounts
    .filter(
      (account) =>
        account.account_type === accountType
    )
    .reduce((total, account) => {
      const balance =
        balances.get(account.id) ?? BigInt(0);

      return total + balance;
    }, BigInt(0));
}

export function totalTransactionsByType(
  transactions: FinanceTransaction[],
  type: "income" | "expense",
  filter?: (
    transaction: FinanceTransaction
  ) => boolean
) {
  return transactions.reduce(
    (total, transaction) => {
      if (transaction.transaction_type !== type) {
        return total;
      }

      if (filter && !filter(transaction)) {
        return total;
      }

      return (
        total +
        moneyToCents(transaction.amount)
      );
    },
    BigInt(0)
  );
}

export function totalGamePnL(
  gameSessions: FinanceGameSession[]
) {
  return gameSessions.reduce(
    (total, session) => {
      if (
        session.status !== "completed" ||
        session.result_type === null ||
        session.result_amount === null
      ) {
        return total;
      }

      const amount = moneyToCents(
        session.result_amount
      );

      if (session.result_type === "win") {
        return total + amount;
      }

      if (session.result_type === "loss") {
        return total - amount;
      }

      /*
        Even session = NPR 0 P&L.
      */
      return total;
    },
    BigInt(0)
  );
}

export function isInCurrentKathmanduMonth(
  occurredAt: string
) {
  const transactionMonth =
    kathmanduYearMonth(new Date(occurredAt));

  const currentMonth =
    kathmanduYearMonth(new Date());

  return transactionMonth === currentMonth;
}

function addToBalance(
  balances: Map<string, bigint>,
  accountId: string,
  amount: bigint
) {
  const currentBalance =
    balances.get(accountId) ?? BigInt(0);

  balances.set(
    accountId,
    currentBalance + amount
  );
}

function kathmanduYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  return `${year}-${month}`;
}