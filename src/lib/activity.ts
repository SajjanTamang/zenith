import { moneyToCents } from "@/lib/money";

export type ActivityKind =
  | "income"
  | "expense"
  | "transfer"
  | "game";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  amountCents: string;
  kind: ActivityKind;
  occurredAt: string;
  searchText: string;
};

type ActivityAccount = {
  id: string;
  name: string;
};

type ActivityTransaction = {
  id: string;
  transaction_type: "income" | "expense" | "transfer";
  amount: string | number;
  category: string | null;
  note: string | null;
  occurred_at: string;
  from_account_id: string | null;
  to_account_id: string | null;
};

type ActivityGameSession = {
  id: string;
  game_type: string;
  playing_amount: string | number;
  note: string | null;
  status: "active" | "completed";
  result_type: "win" | "loss" | "even" | null;
  result_amount: string | number | null;
  started_at: string;
  ended_at: string | null;
};

export function buildActivityItems(
  accounts: ActivityAccount[],
  transactions: ActivityTransaction[],
  gameSessions: ActivityGameSession[]
) {
  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      account.name,
    ])
  );

  const items: ActivityItem[] = [];

  for (const transaction of transactions) {
    const amount = moneyToCents(
      transaction.amount
    );

    if (transaction.transaction_type === "income") {
      const accountName =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ?? "Unknown account"
          : "Unknown account";

      const title =
        transaction.category || "Income";

      const description = transaction.note
        ? `To ${accountName} • ${transaction.note}`
        : `To ${accountName}`;

      items.push({
        id: `transaction-${transaction.id}`,
        title,
        description,
        amountCents: amount.toString(),
        kind: "income",
        occurredAt: transaction.occurred_at,
        searchText: [
          "income",
          title,
          description,
          accountName,
        ]
          .join(" ")
          .toLowerCase(),
      });
    }

    if (transaction.transaction_type === "expense") {
      const accountName =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ?? "Unknown account"
          : "Unknown account";

      const title =
        transaction.category || "Expense";

      const description = transaction.note
        ? `From ${accountName} • ${transaction.note}`
        : `From ${accountName}`;

      items.push({
        id: `transaction-${transaction.id}`,
        title,
        description,
        amountCents: (-amount).toString(),
        kind: "expense",
        occurredAt: transaction.occurred_at,
        searchText: [
          "expense",
          title,
          description,
          accountName,
        ]
          .join(" ")
          .toLowerCase(),
      });
    }

    if (transaction.transaction_type === "transfer") {
      const fromAccount =
        transaction.from_account_id
          ? accountNames.get(
              transaction.from_account_id
            ) ?? "Unknown"
          : "Unknown";

      const toAccount =
        transaction.to_account_id
          ? accountNames.get(
              transaction.to_account_id
            ) ?? "Unknown"
          : "Unknown";

      const accountPath =
        `${fromAccount} → ${toAccount}`;

      const description = transaction.note
        ? `${accountPath} • ${transaction.note}`
        : accountPath;

      items.push({
        id: `transaction-${transaction.id}`,
        title: "Transfer",
        description,
        amountCents: amount.toString(),
        kind: "transfer",
        occurredAt: transaction.occurred_at,
        searchText: [
          "transfer",
          description,
          fromAccount,
          toAccount,
        ]
          .join(" ")
          .toLowerCase(),
      });
    }
  }

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

    const pnl =
      session.result_type === "win"
        ? amount
        : session.result_type === "loss"
          ? -amount
          : BigInt(0);

    const resultLabel =
      session.result_type === "win"
        ? "Win"
        : session.result_type === "loss"
          ? "Loss"
          : "Even";

    const playingAmount =
      moneyToCents(session.playing_amount);

    const descriptionParts = [
      `${resultLabel} • Played NPR ${formatCentsPlain(
        playingAmount
      )}`,
    ];

    if (session.note) {
      descriptionParts.push(session.note);
    }

    const description =
      descriptionParts.join(" • ");

    items.push({
      id: `session-${session.id}`,
      title: session.game_type,
      description,
      amountCents: pnl.toString(),
      kind: "game",
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
    });
  }

  return items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() -
      new Date(a.occurredAt).getTime()
  );
}

function formatCentsPlain(cents: bigint) {
  const whole = cents / BigInt(100);
  const decimal = cents % BigInt(100);

  return `${whole
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ","
    )}.${decimal
    .toString()
    .padStart(2, "0")}`;
}