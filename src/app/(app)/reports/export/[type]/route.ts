import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type ExportType =
  | "transactions"
  | "games"
  | "lending";

type RouteContext = {
  params: Promise<{
    type: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const {
    type,
  } =
    await context.params;

  if (
    !isExportType(
      type
    )
  ) {
    return new Response(
      "Unknown export type.",
      {
        status:
          404,
      }
    );
  }

  const supabase =
    await createClient();

  const {
    data:
      claimsData,
    error:
      claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData
      ?.claims
      ?.sub
  ) {
    return new Response(
      "Unauthorized",
      {
        status:
          401,
      }
    );
  }

  const url =
    new URL(
      request.url
    );

  const currentMonthKey =
    getKathmanduMonthKey(
      new Date()
    );

  const requestedMonth =
    url.searchParams.get(
      "month"
    ) ??
    "";

  const monthKey =
    getSafeMonthKey(
      requestedMonth,
      currentMonthKey
    );

  if (
    type ===
    "transactions"
  ) {
    return exportTransactions(
      supabase,
      monthKey
    );
  }

  if (
    type ===
    "games"
  ) {
    return exportGames(
      supabase,
      monthKey
    );
  }

  return exportLending(
    supabase,
    monthKey
  );
}

async function exportTransactions(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  monthKey:
    string
) {
  const [
    transactionsResult,
    accountsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "transactions"
        )
        .select(`
          id,
          transaction_type,
          amount,
          from_account_id,
          to_account_id,
          category,
          note,
          occurred_at
        `)
        .order(
          "occurred_at",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name
        `),
    ]);

  const error =
    transactionsResult.error ??
    accountsResult.error;

  if (
    error
  ) {
    return csvError(
      error.message
    );
  }

  const accountsById =
    new Map(
      (
        accountsResult.data ??
        []
      ).map(
        (
          account
        ) => [
          account.id,
          account.name,
        ]
      )
    );

  const rows =
    (
      transactionsResult.data ??
      []
    )
      .filter(
        (
          transaction
        ) =>
          getKathmanduMonthKey(
            transaction.occurred_at
          ) ===
          monthKey
      )
      .map(
        (
          transaction
        ) => [
          formatKathmanduDate(
            transaction.occurred_at
          ),

          formatKathmanduTime(
            transaction.occurred_at
          ),

          transaction.transaction_type,

          formatMoney(
            transaction.amount
          ),

          transaction.category ??
            "",

          transaction.from_account_id
            ? accountsById.get(
                transaction.from_account_id
              ) ??
              ""
            : "",

          transaction.to_account_id
            ? accountsById.get(
                transaction.to_account_id
              ) ??
              ""
            : "",

          transaction.note ??
            "",
        ]
      );

  const csv =
    makeCsv(
      [
        "Date",
        "Time",
        "Type",
        "Amount NPR",
        "Category",
        "From Account",
        "To Account",
        "Note",
      ],
      rows
    );

  return csvResponse(
    csv,
    `zenith-transactions-${monthKey}.csv`
  );
}

async function exportGames(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  monthKey:
    string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "game_sessions"
      )
      .select(`
        id,
        playing_amount,
        game_type,
        note,
        status,
        result_type,
        result_amount,
        started_at,
        ended_at,
        voided_at,
        void_reason,
        voided_original_result_type,
        voided_original_result_amount
      `)
      .order(
        "started_at",
        {
          ascending:
            true,
        }
      );

  if (
    error
  ) {
    return csvError(
      error.message
    );
  }

  const rows =
    (
      data ??
      []
    )
      .filter(
        (
          session
        ) =>
          getKathmanduMonthKey(
            session.started_at
          ) ===
          monthKey
      )
      .map(
        (
          session
        ) => {
          const voided =
            Boolean(
              session.voided_at
            );

          return [
            formatKathmanduDate(
              session.started_at
            ),

            formatKathmanduTime(
              session.started_at
            ),

            session.game_type,

            formatMoney(
              session.playing_amount
            ),

            voided
              ? "Voided"
              : session.status,

            /*
              Current counted result.

              For a voided session we leave
              this blank because it no longer
              contributes a real result.
            */
            voided
              ? ""
              : session.result_type ??
                "",

            voided
              ? ""
              : session.result_amount ===
                  null
                ? ""
                : formatMoney(
                    session.result_amount
                  ),

            /*
              Audit copy of the result that
              existed before the void.
            */
            voided
              ? session.voided_original_result_type ??
                ""
              : "",

            voided &&
            session.voided_original_result_amount !==
              null
              ? formatMoney(
                  session.voided_original_result_amount
                )
              : "",

            session.void_reason ??
              "",

            session.voided_at
              ? formatKathmanduDateTime(
                  session.voided_at
                )
              : "",

            session.note ??
              "",

            session.ended_at
              ? formatKathmanduDateTime(
                  session.ended_at
                )
              : "",
          ];
        }
      );

  const csv =
    makeCsv(
      [
        "Date",
        "Start Time",
        "Game Type",
        "Playing Amount NPR",
        "Status",
        "Result",
        "Result Amount NPR",
        "Original Result Before Void",
        "Original Result Amount NPR",
        "Void Reason",
        "Voided At",
        "Note",
        "Ended At",
      ],
      rows
    );

  return csvResponse(
    csv,
    `zenith-game-sessions-${monthKey}.csv`
  );
}

async function exportLending(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  monthKey:
    string
) {
  const [
    peopleResult,
    accountsResult,
    sessionsResult,
    loansResult,
    repaymentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "loan_people"
        )
        .select(`
          id,
          name
        `),

      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name
        `),

      /*
        Voided sessions are intentionally
        still included here.

        A loan historically linked to a
        session remains linked to that
        audit record.
      */
      supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          game_type
        `),

      supabase
        .from(
          "loans"
        )
        .select(`
          id,
          person_id,
          source_account_id,
          principal_amount,
          game_session_id,
          note,
          lent_at,
          due_date
        `),

      supabase
        .from(
          "loan_repayments"
        )
        .select(`
          id,
          loan_id,
          to_account_id,
          amount,
          note,
          repaid_at
        `),
    ]);

  const error =
    peopleResult.error ??
    accountsResult.error ??
    sessionsResult.error ??
    loansResult.error ??
    repaymentsResult.error;

  if (
    error
  ) {
    return csvError(
      error.message
    );
  }

  const peopleById =
    new Map(
      (
        peopleResult.data ??
        []
      ).map(
        (
          person
        ) => [
          person.id,
          person.name,
        ]
      )
    );

  const accountsById =
    new Map(
      (
        accountsResult.data ??
        []
      ).map(
        (
          account
        ) => [
          account.id,
          account.name,
        ]
      )
    );

  const sessionsById =
    new Map(
      (
        sessionsResult.data ??
        []
      ).map(
        (
          session
        ) => [
          session.id,
          session.game_type,
        ]
      )
    );

  const loans =
    loansResult.data ??
    [];

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

  const movements: {
    occurredAt:
      string;

    row: (
      | string
      | number
    )[];
  }[] = [];

  for (
    const loan
    of loans
  ) {
    if (
      getKathmanduMonthKey(
        loan.lent_at
      ) !==
      monthKey
    ) {
      continue;
    }

    movements.push({
      occurredAt:
        loan.lent_at,

      row: [
        formatKathmanduDate(
          loan.lent_at
        ),

        formatKathmanduTime(
          loan.lent_at
        ),

        "Loan",

        peopleById.get(
          loan.person_id
        ) ??
          "Unknown person",

        formatMoney(
          loan.principal_amount
        ),

        accountsById.get(
          loan.source_account_id
        ) ??
          "",

        loan.game_session_id
          ? sessionsById.get(
              loan.game_session_id
            ) ??
            ""
          : "",

        loan.due_date ??
          "",

        loan.note ??
          "",
      ],
    });
  }

  for (
    const repayment
    of repaymentsResult.data ??
    []
  ) {
    if (
      getKathmanduMonthKey(
        repayment.repaid_at
      ) !==
      monthKey
    ) {
      continue;
    }

    const loan =
      loansById.get(
        repayment.loan_id
      );

    movements.push({
      occurredAt:
        repayment.repaid_at,

      row: [
        formatKathmanduDate(
          repayment.repaid_at
        ),

        formatKathmanduTime(
          repayment.repaid_at
        ),

        "Repayment",

        loan
          ? peopleById.get(
              loan.person_id
            ) ??
              "Unknown person"
          : "Unknown person",

        formatMoney(
          repayment.amount
        ),

        accountsById.get(
          repayment.to_account_id
        ) ??
          "",

        loan
          ?.game_session_id
          ? sessionsById.get(
              loan.game_session_id
            ) ??
            ""
          : "",

        loan?.due_date ??
          "",

        repayment.note ??
          "",
      ],
    });
  }

  movements.sort(
    (
      a,
      b
    ) =>
      new Date(
        a.occurredAt
      ).getTime() -
      new Date(
        b.occurredAt
      ).getTime()
  );

  const csv =
    makeCsv(
      [
        "Date",
        "Time",
        "Type",
        "Person",
        "Amount NPR",
        "Account",
        "Related Session",
        "Due Date",
        "Note",
      ],

      movements.map(
        (
          movement
        ) =>
          movement.row
      )
    );

  return csvResponse(
    csv,
    `zenith-lending-${monthKey}.csv`
  );
}

function makeCsv(
  headers:
    string[],

  rows: (
    | string
    | number
  )[][]
) {
  return [
    headers,
    ...rows,
  ]
    .map(
      (
        row
      ) =>
        row
          .map(
            escapeCsvValue
          )
          .join(",")
    )
    .join("\r\n");
}

function escapeCsvValue(
  value:
    | string
    | number
) {
  const text =
    String(
      value
    );

  /*
    Prevent exported user text from
    becoming spreadsheet formulas.
  */
  const safeText =
    /^[=+\-@]/.test(
      text
    )
      ? `'${text}`
      : text;

  return `"${safeText.replace(
    /"/g,
    '""'
  )}"`;
}

function csvResponse(
  csv:
    string,

  filename:
    string
) {
  const body =
    `\uFEFF${csv}`;

  return new Response(
    body,
    {
      status:
        200,

      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "no-store",
      },
    }
  );
}

function csvError(
  message:
    string
) {
  return new Response(
    `Could not create export: ${message}`,
    {
      status:
        500,

      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
      },
    }
  );
}

function formatMoney(
  value:
    | string
    | number
) {
  return formatMoneyFromCents(
    moneyToCents(
      value
    )
  );
}

function formatKathmanduDate(
  value:
    string
) {
  return new Intl.DateTimeFormat(
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
  ).format(
    new Date(
      value
    )
  );
}

function formatKathmanduTime(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true,
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatKathmanduDateTime(
  value:
    string
) {
  return `${formatKathmanduDate(
    value
  )} ${formatKathmanduTime(
    value
  )}`;
}

function getKathmanduMonthKey(
  value:
    | string
    | Date
) {
  const date =
    typeof value ===
    "string"
      ? new Date(
          value
        )
      : value;

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
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

function getSafeMonthKey(
  requested:
    string,

  currentMonthKey:
    string
) {
  if (
    !/^\d{4}-\d{2}$/.test(
      requested
    )
  ) {
    return currentMonthKey;
  }

  const [
    year,
    month,
  ] =
    requested.split(
      "-"
    );

  const yearNumber =
    Number(
      year
    );

  const monthNumber =
    Number(
      month
    );

  if (
    !Number.isInteger(
      yearNumber
    ) ||
    !Number.isInteger(
      monthNumber
    ) ||
    monthNumber <
      1 ||
    monthNumber >
      12
  ) {
    return currentMonthKey;
  }

  if (
    requested >
    currentMonthKey
  ) {
    return currentMonthKey;
  }

  return requested;
}

function isExportType(
  value:
    string
): value is ExportType {
  return (
    value ===
      "transactions" ||
    value ===
      "games" ||
    value ===
      "lending"
  );
}