import {
  moneyToCents,
} from "@/lib/money";

export type FinanceAccount = {
  id: string;
  account_type: string;
  opening_balance:
    | string
    | number;
};

export type FinanceTransaction = {
  transaction_type:
    | "income"
    | "expense"
    | "transfer";

  amount:
    | string
    | number;

  from_account_id:
    | string
    | null;

  to_account_id:
    | string
    | null;

  occurred_at?:
    string;
};

export type FinanceGameSession = {
  bankroll_account_id:
    string;

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

  started_at?:
    string;

  ended_at?:
    | string
    | null;
};

/*
  Money owed TO the user.

  This table now supports:
  - normal lending
  - unpaid game winnings
  - other receivables

  All of them are assets.

  They are NOT expenses.
*/
export type FinanceLoan = {
  id: string;

  person_id: string;

  source_account_id:
    string;

  principal_amount:
    | string
    | number;

  game_session_id?:
    | string
    | null;

  claim_type?:
    | "loan"
    | "game_winnings"
    | "other";

  note?:
    | string
    | null;

  lent_at?:
    string;

  due_date?:
    | string
    | null;
};

/*
  Money returned to the user against
  a loan or receivable.

  This is NOT income.
*/
export type FinanceLoanRepayment = {
  id?:
    string;

  loan_id:
    string;

  to_account_id:
    string;

  amount:
    | string
    | number;

  note?:
    | string
    | null;

  repaid_at?:
    string;
};

/*
  Money the USER borrowed from someone.

  Example:

  Borrow NPR 700 into Cash.

  Cash:
    +700

  Liability:
    +700

  Net worth:
    unchanged
*/
export type FinanceBorrowing = {
  id: string;

  person_id:
    string;

  to_account_id:
    string;

  principal_amount:
    | string
    | number;

  game_session_id?:
    | string
    | null;

  note?:
    | string
    | null;

  borrowed_at?:
    string;

  due_date?:
    | string
    | null;
};

/*
  Money the user pays back against
  a borrowing.

  This is NOT an expense.
*/
export type FinanceBorrowingRepayment = {
  id?:
    string;

  borrowing_id:
    string;

  from_account_id:
    string;

  amount:
    | string
    | number;

  note?:
    | string
    | null;

  repaid_at?:
    string;
};

export function calculateAccountBalances(
  accounts:
    FinanceAccount[],

  transactions:
    FinanceTransaction[],

  gameSessions:
    FinanceGameSession[] = [],

  loans:
    FinanceLoan[] = [],

  loanRepayments:
    FinanceLoanRepayment[] = [],

  borrowings:
    FinanceBorrowing[] = [],

  borrowingRepayments:
    FinanceBorrowingRepayment[] = []
) {
  const balances =
    new Map<
      string,
      bigint
    >();

  /*
    Opening balance.

    Wealth already owned when the account
    was created.

    NOT income.
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
    Normal transactions.
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
      Income.
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
      Expense.
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
      Transfer.

      Owned account -> owned account.

      Net worth unchanged.
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
    Completed Game Session P&L.

    Playing amount itself does NOT create
    profit or loss.

    Only the final result changes wealth.
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
      Even = no change.
    */
  }

  /*
    Money owed TO the user.

    Loan / game winnings receivable /
    other receivable.

    The amount leaves an owned account
    and becomes an asset owed back.
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
    Loan / receivable collection.

    Asset receivable decreases elsewhere,
    while money enters an owned account.

    NOT income.
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

  /*
    BORROWED MONEY.

    Example:

      Borrow 700
      Receive into Cash

      Cash +700

    The corresponding +700 liability is
    tracked separately for net worth.
  */
  for (
    const borrowing
    of borrowings
  ) {
    const amount =
      moneyToCents(
        borrowing.principal_amount
      );

    addToBalance(
      balances,
      borrowing.to_account_id,
      amount
    );
  }

  /*
    BORROWING REPAYMENT.

    Money leaves an owned account.

    The liability decreases by the same
    amount separately.

    NOT an expense.
  */
  for (
    const repayment
    of borrowingRepayments
  ) {
    const amount =
      moneyToCents(
        repayment.amount
      );

    addToBalance(
      balances,
      repayment.from_account_id,
      -amount
    );
  }

  return balances;
}

/*
  Money physically/currently sitting inside
  the user's owned accounts.

  This does not include receivables.

  It DOES include borrowed money currently
  sitting in an account because that money
  really is available to spend.

  Net worth subtracts the matching liability.
*/
export function totalBalanceFromAccounts(
  balances:
    Map<
      string,
      bigint
    >
) {
  return Array.from(
    balances.values()
  ).reduce(
    (
      total,
      balance
    ) =>
      total +
      balance,

    BigInt(0)
  );
}

export function totalAccountTypeBalance(
  accounts:
    FinanceAccount[],

  balances:
    Map<
      string,
      bigint
    >,

  accountType:
    string
) {
  return accounts
    .filter(
      (
        account
      ) =>
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

      return total;
    },

    BigInt(0)
  );
}

/* =========================================================
   MONEY OWED TO USER
   ========================================================= */

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
    principal -
    repaid;

  return outstanding >
    BigInt(0)
    ? outstanding
    : BigInt(0);
}

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

/* =========================================================
   MONEY USER OWES
   ========================================================= */

export function totalBorrowedPrincipal(
  borrowings:
    FinanceBorrowing[]
) {
  return borrowings.reduce(
    (
      total,
      borrowing
    ) =>
      total +
      moneyToCents(
        borrowing.principal_amount
      ),

    BigInt(0)
  );
}

export function totalBorrowingRepayments(
  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  return borrowingRepayments.reduce(
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

export function borrowingOutstandingBalance(
  borrowing:
    FinanceBorrowing,

  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  const principal =
    moneyToCents(
      borrowing.principal_amount
    );

  const repaid =
    borrowingRepayments.reduce(
      (
        total,
        repayment
      ) => {
        if (
          repayment.borrowing_id !==
          borrowing.id
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
    principal -
    repaid;

  return outstanding >
    BigInt(0)
    ? outstanding
    : BigInt(0);
}

export function totalOutstandingBorrowings(
  borrowings:
    FinanceBorrowing[],

  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  return borrowings.reduce(
    (
      total,
      borrowing
    ) =>
      total +
      borrowingOutstandingBalance(
        borrowing,
        borrowingRepayments
      ),

    BigInt(0)
  );
}

/*
  TRUE NET WORTH

  Accounts
  + money owed TO user
  - money user OWES

  Example:

    Cash              700
    Receivables         0
    Debt              700

    Net worth           0
*/
export function totalNetWorth(
  balances:
    Map<
      string,
      bigint
    >,

  loans:
    FinanceLoan[],

  loanRepayments:
    FinanceLoanRepayment[],

  borrowings:
    FinanceBorrowing[] = [],

  borrowingRepayments:
    FinanceBorrowingRepayment[] = []
) {
  return (
    totalBalanceFromAccounts(
      balances
    ) +
    totalOutstandingLoans(
      loans,
      loanRepayments
    ) -
    totalOutstandingBorrowings(
      borrowings,
      borrowingRepayments
    )
  );
}

/* =========================================================
   LOAN / RECEIVABLE STATUS
   ========================================================= */

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
    ) ===
    BigInt(0)
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

/* =========================================================
   BORROWING STATUS
   ========================================================= */

export function isBorrowingFullyPaid(
  borrowing:
    FinanceBorrowing,

  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  return (
    borrowingOutstandingBalance(
      borrowing,
      borrowingRepayments
    ) ===
    BigInt(0)
  );
}

export function isBorrowingPartiallyPaid(
  borrowing:
    FinanceBorrowing,

  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  const principal =
    moneyToCents(
      borrowing.principal_amount
    );

  const outstanding =
    borrowingOutstandingBalance(
      borrowing,
      borrowingRepayments
    );

  return (
    outstanding >
      BigInt(0) &&
    outstanding <
      principal
  );
}

export function isBorrowingOverdue(
  borrowing:
    FinanceBorrowing,

  borrowingRepayments:
    FinanceBorrowingRepayment[]
) {
  if (
    !borrowing.due_date
  ) {
    return false;
  }

  if (
    isBorrowingFullyPaid(
      borrowing,
      borrowingRepayments
    )
  ) {
    return false;
  }

  return (
    borrowing.due_date <
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
    Map<
      string,
      bigint
    >,

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
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (
        part
      ) =>
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
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}