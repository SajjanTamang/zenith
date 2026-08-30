import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

type Session = {
  id: string;
  playing_amount?: string | number;
  game_type?: string;
  note?: string | null;

  status: "active" | "completed";

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
  ended_at: string | null;
};

export function RecentSessions({
  sessions,
}: {
  sessions: Session[];
}) {
  const completedSessions = sessions
    .filter(
      (session) =>
        session.status === "completed"
    )
    .slice(0, 4);

  if (completedSessions.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] px-5 py-10 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          No completed sessions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {completedSessions.map((session) => {
        const pnl = getSessionPnL(session);

        const pnlColor =
          pnl > BigInt(0)
            ? "var(--positive)"
            : pnl < BigInt(0)
              ? "var(--negative)"
              : "var(--foreground)";

        return (
          <div
            key={session.id}
            className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] px-4 py-3"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {session.game_type ||
                  "Game Session"}
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {formatSessionDate(
                  session.started_at
                )}
              </p>

              {session.playing_amount !==
                undefined && (
                <p
                  className="mt-1 text-xs"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Played NPR{" "}
                  {formatMoneyFromCents(
                    moneyToCents(
                      session.playing_amount
                    )
                  )}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p
                className="text-sm font-semibold tabular-nums"
                style={{
                  color: pnlColor,
                }}
              >
                {formatSignedMoney(pnl)}
              </p>

              <p
                className="mt-1 text-xs capitalize"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {session.result_type}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSessionPnL(
  session: Session
) {
  if (
    session.result_amount === null ||
    session.result_type === null
  ) {
    return BigInt(0);
  }

  const amount = moneyToCents(
    session.result_amount
  );

  if (session.result_type === "win") {
    return amount;
  }

  if (session.result_type === "loss") {
    return -amount;
  }

  return BigInt(0);
}

function formatSignedMoney(
  value: bigint
) {
  if (value > BigInt(0)) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (value < BigInt(0)) {
    return `-NPR ${formatMoneyFromCents(
      -value
    )}`;
  }

  return "NPR 0.00";
}

function formatSessionDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(value));
}