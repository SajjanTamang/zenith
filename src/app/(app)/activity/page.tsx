import {
  ActivityList,
} from "@/components/transactions/activity-list";

import {
  buildActivityItems,
} from "@/lib/activity";

import {
  createClient,
} from "@/lib/supabase/server";

export default async function ActivityPage() {
  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
    gameSessionsResult,
    loanPeopleResult,
    loansResult,
    repaymentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name
        `),

      supabase
        .from(
          "transactions"
        )
        .select(`
          id,
          transaction_type,
          amount,
          category,
          note,
          occurred_at,
          from_account_id,
          to_account_id
        `),

      supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          game_type,
          playing_amount,
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
        `),

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
    accountsResult.error ??
    transactionsResult.error ??
    gameSessionsResult.error ??
    loanPeopleResult.error ??
    loansResult.error ??
    repaymentsResult.error;

  if (
    error
  ) {
    return (
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          History
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Activity
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor:
              "var(--negative-soft)",

            color:
              "var(--negative)",
          }}
        >
          Could not load
          activity:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const items =
    buildActivityItems(
      accountsResult.data ??
        [],

      transactionsResult.data ??
        [],

      gameSessionsResult.data ??
        [],

      loanPeopleResult.data ??
        [],

      loansResult.data ??
        [],

      repaymentsResult.data ??
        []
    );

  const todayDateKey =
    getKathmanduDateKey(
      new Date()
    );

  return (
    <div>
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        History
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Activity
      </h1>

      <p
        className="mt-3 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Transactions, game
        results, corrections,
        and lending in one
        place.
      </p>

      <ActivityList
        items={
          items
        }
        todayDateKey={
          todayDateKey
        }
      />
    </div>
  );
}

function getKathmanduDateKey(
  value:
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
      value
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