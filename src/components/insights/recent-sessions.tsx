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
  const completedSessions =
    sessions
      .filter(
        (session) =>
          session.status === "completed"
      )
      .slice(0, 4);

  if (
    completedSessions.length === 0
  ) {
    return (
      <div
        className="py-8 text-center"
        style={{
          borderTop:
            "1px solid var(--border)",
          borderBottom:
            "1px solid var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          No completed sessions yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        borderTop:
          "1px solid var(--border)",
      }}
    >
      {completedSessions.map(
        (
          session,
          index
        ) => {
          const pnl =
            getSessionPnL(
              session
            );

          const pnlColor =
            pnl > BigInt(0)
              ? "var(--positive)"
              : pnl < BigInt(0)
                ? "var(--negative)"
                : "var(--foreground)";

          return (
            <div
              key={
                session.id
              }
              className="flex items-center justify-between gap-4 py-4"
              style={{
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {session.game_type ||
                    "Game Session"}
                </p>

                <p
                  className="mt-1 text-[10px]"
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
                    className="mt-1 text-[9px]"
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
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color:
                      pnlColor,
                  }}
                >
                  {formatSignedMoney(
                    pnl
                  )}
                </p>

                <p
                  className="mt-1 text-[9px] capitalize"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  {
                    session.result_type
                  }
                </p>
              </div>
            </div>
          );
        }
      )}
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

  const amount =
    moneyToCents(
      session.result_amount
    );

  if (
    session.result_type === "win"
  ) {
    return amount;
  }

  if (
    session.result_type === "loss"
  ) {
    return -amount;
  }

  return BigInt(0);
}

function formatSignedMoney(
  value: bigint
) {
  if (
    value > BigInt(0)
  ) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (
    value < BigInt(0)
  ) {
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
      timeZone:
        "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}