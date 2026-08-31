import Link from "next/link";

import {
  ArrowRight,
  CircleDot,
  Gamepad2,
  HandCoins,
} from "lucide-react";

import {
  getCurrentMonthGameAnalytics,
  kathmanduDateKey,
  type AnalyticsGameSession,
} from "@/lib/game-analytics";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type GameSession =
  AnalyticsGameSession & {
    playing_amount:
      | string
      | number;

    game_type: string;

    note:
      | string
      | null;
  };

type SessionGroup = {
  dateKey: string;
  label: string;
  sessions: GameSession[];
};

export default async function SessionsPage() {
  const supabase =
    await createClient();

  const {
    data: sessions,
    error,
  } =
    await supabase
      .from("game_sessions")
      .select(`
        id,
        playing_amount,
        game_type,
        note,
        status,
        result_type,
        result_amount,
        started_at,
        ended_at
      `)
      .order(
        "started_at",
        {
          ascending: false,
        }
      );

  if (error) {
    return (
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Game tracking
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Sessions
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
          Could not load sessions:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const typedSessions =
    (sessions ??
      []) as GameSession[];

  const activeSession =
    typedSessions.find(
      (session) =>
        session.status ===
        "active"
    );

  const completedSessions =
    typedSessions.filter(
      (session) =>
        session.status ===
        "completed"
    );

  const thisMonth =
    getCurrentMonthGameAnalytics(
      typedSessions
    );

  const historyGroups =
    groupSessionsByDate(
      completedSessions
    );

  return (
    <div className="pb-24">
      {/* Header */}
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Game tracking
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Sessions
        </h1>

        <p
          className="mt-3 text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Track each playing day
          from start to final result.
        </p>
      </section>

      {/* This month */}
      <section className="mt-8">
        <SectionLabel>
          This month
        </SectionLabel>

        <div
          className="mt-4 rounded-[var(--radius-lg)] p-5"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <p
            className="text-[9px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Monthly overview
          </p>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <SummaryMetric
              label="P&L"
              value={
                <SignedMoney
                  value={
                    thisMonth.totalPnL
                  }
                />
              }
            />

            <SummaryMetric
              label="Sessions"
              value={String(
                thisMonth.totalSessions
              )}
            />

            <SummaryMetric
              label="Win rate"
              value={`${thisMonth.winRate}%`}
            />
          </div>
        </div>
      </section>

      {/* Active Session */}
      <section className="mt-8">
        <SectionLabel>
          Active session
        </SectionLabel>

        {activeSession ? (
          <ActiveSessionCard
            session={
              activeSession
            }
          />
        ) : (
          <EmptyActiveSession />
        )}
      </section>

      {/* History */}
      <section className="mt-9">
        <div className="flex items-center justify-between">
          <SectionLabel>
            Session history
          </SectionLabel>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {completedSessions.length}{" "}
            {completedSessions.length ===
            1
              ? "session"
              : "sessions"}
          </span>
        </div>

        {completedSessions.length ===
        0 ? (
          <div
            className="mt-4 rounded-[var(--radius-lg)] px-5 py-10 text-center"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
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
        ) : (
          <div className="mt-5 space-y-7">
            {historyGroups.map(
              (group) => (
                <SessionHistoryGroup
                  key={
                    group.dateKey
                  }
                  group={
                    group
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyActiveSession() {
  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] p-5"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "var(--surface-secondary)",

            color:
              "var(--foreground-muted)",
          }}
        >
          <CircleDot
            size={16}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            No active session
          </p>

          <p
            className="mt-1 text-xs leading-5"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Ready when you start
            playing again.
          </p>
        </div>
      </div>

      <div
        className="mt-5 border-t pt-4"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <Link
          href="/sessions/new"
          className="flex items-center justify-end gap-2 text-sm font-semibold"
          style={{
            color:
              "var(--primary)",
          }}
        >
          Start Session

          <ArrowRight
            size={15}
          />
        </Link>
      </div>
    </div>
  );
}

function ActiveSessionCard({
  session,
}: {
  session: GameSession;
}) {
  const lendHref =
    `/quick-add?type=lend&session=${encodeURIComponent(
      session.id
    )}`;

  return (
    <div
      className="mt-4 overflow-hidden rounded-[var(--radius-lg)]"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                "var(--positive)",
            }}
          />

          <span
            className="text-[9px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--positive)",
            }}
          >
            Active
          </span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gamepad2
                size={16}
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              />

              <h2 className="truncate text-base font-semibold">
                {
                  session.game_type
                }
              </h2>
            </div>

            <p
              className="mt-2 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Started{" "}
              {formatSessionDateTime(
                session.started_at
              )}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className="text-[9px] uppercase tracking-[0.12em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Playing
            </p>

            <p className="mt-2 text-sm font-semibold tabular-nums">
              NPR{" "}
              {formatMoneyFromCents(
                moneyToCents(
                  session.playing_amount
                )
              )}
            </p>
          </div>
        </div>

        {session.note && (
          <p
            className="mt-4 text-[10px] leading-4"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {session.note}
          </p>
        )}
      </div>

      {/* Active session actions */}
      <div
        className="grid grid-cols-2 border-t"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <Link
          href={
            lendHref
          }
          className="flex h-12 items-center justify-center gap-2 text-xs font-semibold"
          style={{
            color:
              "var(--primary)",
          }}
        >
          <HandCoins
            size={15}
          />

          Lend Money
        </Link>

        <Link
          href={`/sessions/${session.id}/finish`}
          className="flex h-12 items-center justify-center gap-2 border-l text-xs font-semibold"
          style={{
            borderColor:
              "var(--border)",

            color:
              "var(--primary)",
          }}
        >
          Finish Session

          <ArrowRight
            size={14}
          />
        </Link>
      </div>
    </div>
  );
}

function SessionHistoryGroup({
  group,
}: {
  group: SessionGroup;
}) {
  return (
    <div>
      <p
        className="mb-3 text-[9px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {group.label}
      </p>

      <div
        className="overflow-hidden rounded-[var(--radius-lg)]"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        {group.sessions.map(
          (
            session,
            index
          ) => (
            <SessionHistoryRow
              key={
                session.id
              }
              session={
                session
              }
              borderTop={
                index >
                0
              }
            />
          )
        )}
      </div>
    </div>
  );
}

function SessionHistoryRow({
  session,
  borderTop = false,
}: {
  session: GameSession;
  borderTop?: boolean;
}) {
  const pnl =
    getSessionPnL(
      session
    );

  return (
    <div
      className="px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {
              session.game_type
            }
          </p>

          <p
            className="mt-1 text-[10px]"
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
        </div>

        <div className="shrink-0 text-right">
          <SignedMoney
            value={
              pnl
            }
          />

          <div className="mt-2 flex justify-end">
            <ResultBadge
              result={
                session.result_type
              }
            />
          </div>
        </div>
      </div>

      {session.note && (
        <p
          className="mt-3 text-[10px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {session.note}
        </p>
      )}
    </div>
  );
}

function ResultBadge({
  result,
}: {
  result:
    | "win"
    | "loss"
    | "even"
    | null;
}) {
  if (
    !result
  ) {
    return null;
  }

  const background =
    result ===
    "win"
      ? "var(--positive-soft)"
      : result ===
          "loss"
        ? "var(--negative-soft)"
        : "var(--surface-secondary)";

  const color =
    result ===
    "win"
      ? "var(--positive)"
      : result ===
          "loss"
        ? "var(--negative)"
        : "var(--foreground-muted)";

  return (
    <span
      className="rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]"
      style={{
        backgroundColor:
          background,

        color,
      }}
    >
      {result}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">
        {value}
      </div>

      <p
        className="mt-2 text-[8px] uppercase tracking-[0.1em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <h2
      className="text-[10px] font-medium uppercase tracking-[0.15em]"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </h2>
  );
}

function SignedMoney({
  value,
}: {
  value: bigint;
}) {
  const positive =
    value >
    BigInt(0);

  const negative =
    value <
    BigInt(0);

  const absolute =
    negative
      ? -value
      : value;

  const prefix =
    positive
      ? "+"
      : negative
        ? "-"
        : "";

  const color =
    positive
      ? "var(--positive)"
      : negative
        ? "var(--negative)"
        : "var(--foreground)";

  return (
    <span
      className="text-sm font-semibold tabular-nums"
      style={{
        color,
      }}
    >
      {prefix}NPR{" "}
      {formatMoneyFromCents(
        absolute
      )}
    </span>
  );
}

function getSessionPnL(
  session:
    GameSession
) {
  if (
    session.status !==
      "completed" ||
    session.result_type ===
      null ||
    session.result_amount ===
      null
  ) {
    return BigInt(0);
  }

  const amount =
    moneyToCents(
      session.result_amount
    );

  if (
    session.result_type ===
    "win"
  ) {
    return amount;
  }

  if (
    session.result_type ===
    "loss"
  ) {
    return -amount;
  }

  return BigInt(0);
}

function groupSessionsByDate(
  sessions:
    GameSession[]
) {
  const groups =
    new Map<
      string,
      GameSession[]
    >();

  for (
    const session
    of sessions
  ) {
    const dateKey =
      kathmanduDateKey(
        session.started_at
      );

    const existing =
      groups.get(
        dateKey
      ) ?? [];

    existing.push(
      session
    );

    groups.set(
      dateKey,
      existing
    );
  }

  return Array.from(
    groups.entries()
  ).map(
    ([
      dateKey,
      groupedSessions,
    ]) => ({
      dateKey,

      label:
        formatSessionGroupDate(
          groupedSessions[0]
            .started_at
        ),

      sessions:
        groupedSessions,
    })
  );
}

function formatSessionGroupDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatSessionDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}