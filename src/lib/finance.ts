import { moneyToCents } from "@/lib/money";

export type FinanceAccount = {
  id: string;
  account_type: string;
  opening_balance: string | number;
};

export type FinanceTransaction = {
  transaction_type:
    | "income"
    | "expense"
    | "transfer";

  amount: string | number;

  from_account_id:
    | string
    | null;

  to_account_id:
    | string
    | null;

  occurred_at?: string;
};

export type FinanceGameSession = {
  bankroll_account_id: string;

  status:
    | "active"
    | "completed";

  result_type:
    | "win"
    | "loss"
    | "even"
    | null;

  result_amount:
    | string
    | number
    | null;

  started_at?: string;

  ended_at?:
    | string
    | null;
};

/*
  Money lent to another person.

  Lending is NOT an expense.

  It moves money out of one of the user's
  accounts and turns it into money owed
  back to the user.
*/
export type FinanceLoan = {
  id: string;

  person_id: string;

  source_account_id: string;

  principal_amount:
    | string
    | number;

  game_session_id?:
    | string
    | null;

  note?:
    | string
    | null;

  lent_at?: string;

  due_date?:
    | string
    | null;
};

/*
  Money returned by someone.

  A repayment is NOT income.

  It converts part of the outstanding loan
  back into money inside one of the user's
  accounts.
*/
export type FinanceLoanRepayment = {
  id?: string;

  loan_id: string;

  to_account_id: string;

  amount:
    | string
    | number;

  note?:
    | string
    | null;

  repaid_at?: string;
};

export function calculateAccountBalances(
  accounts: FinanceAccount[],

  transactions: FinanceTransaction[],

  gameSessions:
    FinanceGameSession[] = [],

  loans:
    FinanceLoan[] = [],

  loanRepayments:
    FinanceLoanRepayment[] = []
) {
  const balances =
    new Map<string, bigint>();

  /*
    Every account starts with its opening balance.

    Opening balance contributes to wealth,
    but it is NOT income.
  */
  for (
    const account
    of accounts
  ) {
    balances.set(
      account.id,
      moneyToCents(
        account.opening_balance
      )
    );
  }

  /*
    Apply normal financial transactions.
  */
  for (
    const transaction
    of transactions
  ) {
    const amount =
      moneyToCents(
        transaction.amount
      );

    /*
      Income:
      money enters an account.
    */
    if (
      transaction.transaction_type ===
        "income" &&
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
      transaction.transaction_type ===
        "expense" &&
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
    if (
      transaction.transaction_type ===
      "transfer"
    ) {
      if (
        transaction.from_account_id
      ) {
        addToBalance(
          balances,
          transaction.from_account_id,
          -amount
        );
      }

      if (
        transaction.to_account_id
      ) {
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

    Only the final result changes the
    Game Bankroll account.

    Win  -> bankroll increases
    Loss -> bankroll decreases
    Even -> no change
  */
  for (
    const session
    of gameSessions
  ) {
    if (
      session.status !==
        "completed" ||
      session.result_type ===
        null ||
      session.result_amount ===
        null
    ) {
      continue;
    }

    const amount =
      moneyToCents(
        session.result_amount
      );

    if (
      session.result_type ===
      "win"
    ) {
      addToBalance(
        balances,
        session.bankroll_account_id,
        amount
      );
    }

    if (
      session.result_type ===
      "loss"
    ) {
      addToBalance(
        balances,
        session.bankroll_account_id,
        -amount
      );
    }

    /*
      Even session = no balance change.
    */
  }

  /*
    Apply money that has been lent out.

    Example:

    Cash before:
    NPR 5,000

    Lend Ram:
    NPR 2,000

    Cash after:
    NPR 3,000

    The NPR 2,000 is NOT an expense.
    It is tracked separately as money owed.
  */
  for (
    const loan
    of loans
  ) {
    const amount =
      moneyToCents(
        loan.principal_amount
      );

    addToBalance(
      balances,
      loan.source_account_id,
      -amount
    );
  }

  /*
    Apply loan repayments.

    When money is returned, it goes back
    into the selected account.

    This is NOT income.
  */
  for (
    const repayment
    of loanRepayments
  ) {
    const amount =
      moneyToCents(
        repayment.amount
      );

    addToBalance(
      balances,
      repayment.to_account_id,
      amount
    );
  }

  return balances;
}

/*
  Money currently sitting inside the user's
  actual Zenith accounts.

  This does NOT include money currently lent
  out to other people.
*/
export function totalBalanceFromAccounts(
  balances:
    Map<string, bigint>
) {
  return Array.from(
    balances.values()
  ).reduce(
    (
      total,
      balance
    ) =>
      total + balance,

    BigInt(0)
  );
}

export function totalAccountTypeBalance(
  accounts:
    FinanceAccount[],

  balances:
    Map<string, bigint>,

  accountType:
    string
) {
  return accounts
    .filter(
      (account) =>
        account.account_type ===
        accountType
    )
    .reduce(
      (
        total,
        account
      ) => {
        const balance =
          balances.get(
            account.id
          ) ??
          BigInt(0);

        return (
          total +
          balance
        );
      },

      BigInt(0)
    );
}

export function totalTransactionsByType(
  transactions:
    FinanceTransaction[],

  type:
    | "income"
    | "expense",

  filter?: (
    transaction:
      FinanceTransaction
  ) => boolean
) {
  return transactions.reduce(
    (
      total,
      transaction
    ) => {
      if (
        transaction.transaction_type !==
        type
      ) {
        return total;
      }

      if (
        filter &&
        !filter(
          transaction
        )
      ) {
        return total;
      }

      return (
        total +
        moneyToCents(
          transaction.amount
        )
      );
    },

    BigInt(0)
  );
}

export function totalGamePnL(
  gameSessions:
    FinanceGameSession[]
) {
  return gameSessions.reduce(
    (
      total,
      session
    ) => {
      if (
        session.status !==
          "completed" ||
        session.result_type ===
          null ||
        session.result_amount ===
          null
      ) {
        return total;
      }

      const amount =
        moneyToCents(
          session.result_amount
        );

      if (
        session.result_type ===
        "win"
      ) {
        return (
          total +
          amount
        );
      }

      if (
        session.result_type ===
        "loss"
      ) {
        return (
          total -
          amount
        );
      }

      /*
        Even session = NPR 0 P&L.
      */
      return total;
    },

    BigInt(0)
  );
}

/*
  Total amount originally lent.

  Example:

  Ram   NPR 5,000
  Hari  NPR 2,000

  Result:
  NPR 7,000
*/
export function totalLoanPrincipal(
  loans:
    FinanceLoan[]
) {
  return loans.reduce(
    (
      total,
      loan
    ) =>
      total +
      moneyToCents(
        loan.principal_amount
      ),

    BigInt(0)
  );
}

/*
  Total amount borrowers have returned.
*/
export function totalLoanRepayments(
  loanRepayments:
    FinanceLoanRepayment[]
) {
  return loanRepayments.reduce(
    (
      total,
      repayment
    ) =>
      total +
      moneyToCents(
        repayment.amount
      ),

    BigInt(0)
  );
}

/*
  Outstanding amount for ONE loan.

  Example:

  Lent:
  NPR 5,000

  Repaid:
  NPR 2,000

  Outstanding:
  NPR 3,000
*/
export function loanOutstandingBalance(
  loan:
    FinanceLoan,

  loanRepayments:
    FinanceLoanRepayment[]
) {
  const principal =
    moneyToCents(
      loan.principal_amount
    );

  const repaid =
    loanRepayments.reduce(
      (
        total,
        repayment
      ) => {
        if (
          repayment.loan_id !==
          loan.id
        ) {
          return total;
        }

        return (
          total +
          moneyToCents(
            repayment.amount
          )
        );
      },

      BigInt(0)
    );

  const outstanding =
    principal - repaid;

  /*
    UI validation will prevent overpayment.

    Still, never show a negative amount owed.
  */
  return outstanding >
    BigInt(0)
    ? outstanding
    : BigInt(0);
}

/*
  Total money currently owed to the user
  across every outstanding loan.
*/
export function totalOutstandingLoans(
  loans:
    FinanceLoan[],

  loanRepayments:
    FinanceLoanRepayment[]
) {
  return loans.reduce(
    (
      total,
      loan
    ) =>
      total +
      loanOutstandingBalance(
        loan,
        loanRepayments
      ),

    BigInt(0)
  );
}

/*
  True net worth includes:

  money currently inside accounts
  +
  money currently owed back to the user

  Example:

  Accounts:
  NPR 15,000

  Lent out:
  NPR 2,000

  Net worth:
  NPR 17,000
*/
export function totalNetWorth(
  balances:
    Map<string, bigint>,

  loans:
    FinanceLoan[],

  loanRepayments:
    FinanceLoanRepayment[]
) {
  return (
    totalBalanceFromAccounts(
      balances
    ) +
    totalOutstandingLoans(
      loans,
      loanRepayments
    )
  );
}

export function isLoanFullyPaid(
  loan:
    FinanceLoan,

  loanRepayments:
    FinanceLoanRepayment[]
) {
  return (
    loanOutstandingBalance(
      loan,
      loanRepayments
    ) === BigInt(0)
  );
}

export function isLoanPartiallyPaid(
  loan:
    FinanceLoan,

  loanRepayments:
    FinanceLoanRepayment[]
) {
  const principal =
    moneyToCents(
      loan.principal_amount
    );

  const outstanding =
    loanOutstandingBalance(
      loan,
      loanRepayments
    );

  return (
    outstanding >
      BigInt(0) &&
    outstanding <
      principal
  );
}

export function isLoanOverdue(
  loan:
    FinanceLoan,

  loanRepayments:
    FinanceLoanRepayment[]
) {
  if (
    !loan.due_date
  ) {
    return false;
  }

  if (
    isLoanFullyPaid(
      loan,
      loanRepayments
    )
  ) {
    return false;
  }

  return (
    loan.due_date <
    kathmanduDateKey(
      new Date()
    )
  );
}

export function isInCurrentKathmanduMonth(
  occurredAt:
    string
) {
  const transactionMonth =
    kathmanduYearMonth(
      new Date(
        occurredAt
      )
    );

  const currentMonth =
    kathmanduYearMonth(
      new Date()
    );

  return (
    transactionMonth ===
    currentMonth
  );
}

function addToBalance(
  balances:
    Map<string, bigint>,

  accountId:
    string,

  amount:
    bigint
) {
  const currentBalance =
    balances.get(
      accountId
    ) ??
    BigInt(0);

  balances.set(
    accountId,
    currentBalance +
      amount
  );
}

function kathmanduYearMonth(
  date:
    Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year:
          "numeric",

        month:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  return `${year}-${month}`;
}

function kathmanduDateKey(
  date:
    Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}