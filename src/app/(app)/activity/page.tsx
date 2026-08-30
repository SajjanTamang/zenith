import { ActivityList } from "@/components/transactions/activity-list";
import { buildActivityItems } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export default async function ActivityPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    {
      data: transactions,
      error: transactionsError,
    },
    {
      data: gameSessions,
      error: gameSessionsError,
    },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select(`
        id,
        name
      `),

    supabase
      .from("transactions")
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
      .from("game_sessions")
      .select(`
        id,
        game_type,
        playing_amount,
        note,
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
        <h1 className="text-2xl font-semibold">
          Activity
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor:
              "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load activity:{" "}
          {accountsError?.message ??
            transactionsError?.message ??
            gameSessionsError?.message}
        </div>
      </div>
    );
  }

  const items = buildActivityItems(
    accounts ?? [],
    transactions ?? [],
    gameSessions ?? []
  );

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
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
        className="mt-2 text-sm"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        Your complete financial and game
        history.
      </p>

      <ActivityList items={items} />
    </div>
  );
}