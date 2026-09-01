import {
  moneyToCents,
} from "@/lib/money";

export type ActivityKind =
  | "income"
  | "expense"
  | "transfer"
  | "game"
  | "loan"
  | "repayment";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  amountCents: string;
  kind: ActivityKind;
  occurredAt: string;
  searchText: string;
  href: string | null;
};

type ActivityAccount = {
  id: string;
  name: string;
};

type ActivityTransaction = {
  id: string;

  transaction_type:
    | "income"
    | "expense"
    | "transfer";

  amount:
    | string
    | number;

  category:
    | string
    | null;

  note:
    | string
    | null;

  occurred_at: string;

  from_account_id:
    | string
    | null;

  to_account_id:
    | string
    | null;
};

type ActivityGameSession = {
  id: string;
  game_type: string;

  playing_amount:
    | string
    | number;

  note:
    | string
    | null;

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

  started_at: string;

  ended_at:
    | string
    | null;
};

type ActivityLoanPerson = {
  id: string;
  name: string;
};

type ActivityLoan = {
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

  lent_at: string;

  due_date?:
    | string
    | null;
};

type ActivityLoanRepayment = {
  id: string;
  loan_id: string;
  to_account_id: string;

  amount:
    | string
    | number;

  note?:
    | string
    | null;

  repaid_at: string;
};

export function buildActivityItems(
  accounts: ActivityAccount[],
  transactions: ActivityTransaction[],
  gameSessions: ActivityGameSession[],
  loanPeople: ActivityLoanPerson[] = [],
  loans: ActivityLoan[] = [],
  loanRepayments: ActivityLoanRepayment[] = []
) {
  const accountNames =
    new Map(
      accounts.map(
        (
          account
        ) => [
          account.id,
          account.name,
        ]
      )
    );

  const personNames =
    new Map(
      loanPeople.map(
        (
          person
        ) => [
          person.id,
          person.name,
        ]
      )
    );

  const loansById =
    new Map(
      loans.map(
        (
          loan
        ) => [
          loan.id,
          loan,
        ]
      )
    );

  const gameNames =
    new Map(
      gameSessions.map(
        (
          session
        ) => [
          session.id,
          session.game_type,
        ]
      )
    );

  const items:
    ActivityItem[] = [];

  /*
    Regular transactions
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
      Income
    */
    if (
      transaction.transaction_type ===
      "income"
    ) {
      const accountName =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ??
            "Unknown account"
          : "Unknown account";

      const title =
        transaction.category ||
        "Income";

      const description =
        transaction.note
          ? `To ${accountName} • ${transaction.note}`
          : `To ${accountName}`;

      items.push({
        id:
          `transaction-${transaction.id}`,

        title,

        description,

        amountCents:
          amount.toString(),

        kind:
          "income",

        occurredAt:
          transaction.occurred_at,

        searchText: [
          "income",
          title,
          description,
          accountName,
        ]
          .join(" ")
          .toLowerCase(),

        href:
          `/activity/transactions/${transaction.id}`,
      });
    }

    /*
      Expense
    */
    if (
      transaction.transaction_type ===
      "expense"
    ) {
      const accountName =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ??
            "Unknown account"
          : "Unknown account";

      const title =
        transaction.category ||
        "Expense";

      const description =
        transaction.note
          ? `From ${accountName} • ${transaction.note}`
          : `From ${accountName}`;

      items.push({
        id:
          `transaction-${transaction.id}`,

        title,

        description,

        amountCents:
          (-amount).toString(),

        kind:
          "expense",

        occurredAt:
          transaction.occurred_at,

        searchText: [
          "expense",
          title,
          description,
          accountName,
        ]
          .join(" ")
          .toLowerCase(),

        href:
          `/activity/transactions/${transaction.id}`,
      });
    }

    /*
      Transfer
    */
    if (
      transaction.transaction_type ===
      "transfer"
    ) {
      const fromAccount =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ??
            "Unknown"
          : "Unknown";

      const toAccount =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ??
            "Unknown"
          : "Unknown";

      const accountPath =
        `${fromAccount} → ${toAccount}`;

      const description =
        transaction.note
          ? `${accountPath} • ${transaction.note}`
          : accountPath;

      items.push({
        id:
          `transaction-${transaction.id}`,

        title:
          "Transfer",

        description,

        amountCents:
          amount.toString(),

        kind:
          "transfer",

        occurredAt:
          transaction.occurred_at,

        searchText: [
          "transfer",
          description,
          fromAccount,
          toAccount,
        ]
          .join(" ")
          .toLowerCase(),

        href:
          `/activity/transactions/${transaction.id}`,
      });
    }
  }

  /*
    Completed game sessions
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

    const pnl =
      session.result_type ===
      "win"
        ? amount
        : session.result_type ===
            "loss"
          ? -amount
          : BigInt(0);

    const resultLabel =
      session.result_type ===
      "win"
        ? "Win"
        : session.result_type ===
            "loss"
          ? "Loss"
          : "Even";

    const playingAmount =
      moneyToCents(
        session.playing_amount
      );

    const descriptionParts = [
      `${resultLabel} • Played NPR ${formatCentsPlain(
        playingAmount
      )}`,
    ];

    if (
      session.note
    ) {
      descriptionParts.push(
        session.note
      );
    }

    const description =
      descriptionParts.join(
        " • "
      );

    items.push({
      id:
        `session-${session.id}`,

      title:
        session.game_type,

      description,

      amountCents:
        pnl.toString(),

      kind:
        "game",

      occurredAt:
        session.ended_at ??
        session.started_at,

      searchText: [
        "game",
        session.game_type,
        resultLabel,
        description,
      ]
        .join(" ")
        .toLowerCase(),

      href:
        `/sessions/${session.id}`,
    });
  }

  /*
    Money lent

    This is NOT an expense.

    The negative amount only means
    money left an owned account.
  */
  for (
    const loan
    of loans
  ) {
    const amount =
      moneyToCents(
        loan.principal_amount
      );

    const personName =
      personNames.get(
        loan.person_id
      ) ??
      "Unknown person";

    const accountName =
      accountNames.get(
        loan.source_account_id
      ) ??
      "Unknown account";

    const relatedGameName =
      loan.game_session_id
        ? gameNames.get(
            loan.game_session_id
          )
        : undefined;

    const descriptionParts = [
      `Lent from ${accountName}`,
    ];

    if (
      relatedGameName
    ) {
      descriptionParts.push(
        relatedGameName
      );
    }

    if (
      loan.note
    ) {
      descriptionParts.push(
        loan.note
      );
    }

    const description =
      descriptionParts.join(
        " • "
      );

    items.push({
      id:
        `loan-${loan.id}`,

      title:
        personName,

      description,

      amountCents:
        (-amount).toString(),

      kind:
        "loan",

      occurredAt:
        loan.lent_at,

      searchText: [
        "loan",
        "lend",
        "lending",
        "money lent",
        "lent from",
        personName,
        accountName,
        relatedGameName ??
          "",
        loan.note ??
          "",
      ]
        .join(" ")
        .toLowerCase(),

      href:
        `/lending/${loan.id}`,
    });
  }

  /*
    Loan repayments

    This is NOT income.

    The positive amount only means
    money returned to an owned account.
  */
  for (
    const repayment
    of loanRepayments
  ) {
    const loan =
      loansById.get(
        repayment.loan_id
      );

    if (
      !loan
    ) {
      continue;
    }

    const amount =
      moneyToCents(
        repayment.amount
      );

    const personName =
      personNames.get(
        loan.person_id
      ) ??
      "Unknown person";

    const accountName =
      accountNames.get(
        repayment.to_account_id
      ) ??
      "Unknown account";

    const relatedGameName =
      loan.game_session_id
        ? gameNames.get(
            loan.game_session_id
          )
        : undefined;

    const descriptionParts = [
      `Returned to ${accountName}`,
    ];

    if (
      relatedGameName
    ) {
      descriptionParts.push(
        relatedGameName
      );
    }

    if (
      repayment.note
    ) {
      descriptionParts.push(
        repayment.note
      );
    }

    const description =
      descriptionParts.join(
        " • "
      );

    items.push({
      id:
        `repayment-${repayment.id}`,

      title:
        personName,

      description,

      amountCents:
        amount.toString(),

      kind:
        "repayment",

      occurredAt:
        repayment.repaid_at,

      searchText: [
        "repayment",
        "loan repayment",
        "money returned",
        "returned to",
        personName,
        accountName,
        relatedGameName ??
          "",
        repayment.note ??
          "",
      ]
        .join(" ")
        .toLowerCase(),

      href:
        `/lending/${repayment.loan_id}`,
    });
  }

  /*
    Newest activity first
  */
  return items.sort(
    (
      a,
      b
    ) =>
      new Date(
        b.occurredAt
      ).getTime() -
      new Date(
        a.occurredAt
      ).getTime()
  );
}

function formatCentsPlain(
  cents: bigint
) {
  const whole =
    cents /
    BigInt(100);

  const decimal =
    cents %
    BigInt(100);

  return `${whole
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ","
    )}.${decimal
    .toString()
    .padStart(
      2,
      "0"
    )}`;
}