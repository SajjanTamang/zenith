import Link from "next/link";

import {
  CumulativePnLChart,
} from "@/components/insights/cumulative-pnl-chart";

import {
  RecentSessions,
} from "@/components/insights/recent-sessions";

import {
  buildCumulativeGamePnL,
  calculateGameAnalytics,
  getCurrentMonthGameAnalytics,
  isVoidedGameSession,
  type AnalyticsGameSession,
} from "@/lib/game-analytics";

import {
  formatMoneyFromCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type InsightsGameSession =
  AnalyticsGameSession & {
    voided_at:
      | string
      | null;

    void_reason:
      | string
      | null;

    voided_original_result_type:
      | "win"
      | "loss"
      | "even"
      | null;

    voided_original_result_amount:
      | string
      | number
      | null;
  };

export default async function InsightsPage() {
  const supabase =
    await createClient();

  const {
    data:
      sessions,
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
            false,
        }
      );

  if (
    error
  ) {
    return (
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Performance
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Insights
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
          insights:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const typedSessions =
    (sessions ??
      []) as InsightsGameSession[];

  /*
    Shared analytics functions automatically
    ignore voided sessions.
  */
  const lifetime =
    calculateGameAnalytics(
      typedSessions
    );

  const thisMonth =
    getCurrentMonthGameAnalytics(
      typedSessions
    );

  /*
    The cumulative graph also excludes
    voided sessions inside the shared helper.
  */
  const cumulativePoints =
    buildCumulativeGamePnL(
      typedSessions
    ).map(
      (
        point
      ) => ({
        dateKey:
          point.dateKey,

        cumulativePnLCents:
          point.cumulativePnL.toString(),
      })
    );

  /*
    Insights is a performance screen,
    not an audit-history screen.

    Therefore voided sessions should not
    appear under Recent Sessions here.

    They remain visible in /sessions.
  */
  const recentSessions =
    typedSessions.filter(
      (
        session
      ) =>
        !isVoidedGameSession(
          session
        )
    );

  return (
    <div>
      {/* Header */}
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.15em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Performance
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Insights
        </h1>
      </section>

      {/* Lifetime Hero */}
      <section className="mt-8">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Lifetime P&amp;L
        </p>

        <MoneyValue
          value={
            lifetime.totalPnL
          }
          hero
        />

        <p
          className="mt-2 text-[10px]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {
            lifetime.totalSessions
          }{" "}
          {lifetime.totalSessions ===
          1
            ? "session"
            : "sessions"}
          {" • "}
          {
            lifetime.totalDays
          }{" "}
          {lifetime.totalDays ===
          1
            ? "playing day"
            : "playing days"}
        </p>

        <div className="mt-5">
          <CumulativePnLChart
            points={
              cumulativePoints
            }
          />
        </div>
      </section>

      {/* Monthly Overview */}
      <section
        className="mt-9 border-t pt-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
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

          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6">
            <CardMetric
              label="P&L"
              value={
                <MoneyValue
                  value={
                    thisMonth.totalPnL
                  }
                />
              }
            />

            <CardMetric
              label="Played"
              value={
                <NeutralMoney
                  value={
                    thisMonth.totalPlayingAmount
                  }
                />
              }
            />

            <CardMetric
              label="Sessions"
              value={
                String(
                  thisMonth.totalSessions
                )
              }
            />

            <CardMetric
              label="Win rate"
              value={`${thisMonth.winRate}%`}
            />
          </div>
        </div>
      </section>

      {/* Performance Statistics */}
      <section className="mt-8">
        <SectionLabel>
          Performance
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
            Performance statistics
          </p>

          <div className="mt-5 grid grid-cols-2 gap-x-8">
            <CardMetric
              label="Wins"
              value={
                String(
                  lifetime.winningSessions
                )
              }
            />

            <CardMetric
              label="Losses"
              value={
                String(
                  lifetime.losingSessions
                )
              }
            />
          </div>

          <div
            className="my-5 border-t"
            style={{
              borderColor:
                "var(--border)",
            }}
          />

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <CardMetric
              label="Average P&L"
              value={
                <MoneyValue
                  value={
                    lifetime.averagePnL
                  }
                />
              }
            />

            <CardMetric
              label="Avg played"
              value={
                <NeutralMoney
                  value={
                    lifetime.averagePlayingAmount
                  }
                />
              }
            />

            <CardMetric
              label="Best day"
              value={
                lifetime.bestDay ? (
                  <MoneyValue
                    value={
                      lifetime.bestDay.pnl
                    }
                  />
                ) : (
                  <EmptyValue />
                )
              }
            />

            <CardMetric
              label="Worst day"
              value={
                lifetime.worstDay ? (
                  <MoneyValue
                    value={
                      lifetime.worstDay.pnl
                    }
                  />
                ) : (
                  <EmptyValue />
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Playing Days */}
      <section
        className="mt-8 border-t pt-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <SectionLabel>
          Playing days
        </SectionLabel>

        <div
          className="mt-4 grid grid-cols-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <DayStat
            label="Winning"
            value={
              lifetime.winningDays
            }
            tone="positive"
          />

          <DayStat
            label="Losing"
            value={
              lifetime.losingDays
            }
            tone="negative"
            borderLeft
          />

          <DayStat
            label="Even"
            value={
              lifetime.evenDays
            }
            borderLeft
          />
        </div>
      </section>

      {/* Recent Sessions */}
      <section
        className="mt-8 border-t pt-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <SectionLabel>
            Recent sessions
          </SectionLabel>

          <Link
            href="/sessions"
            className="text-[10px] font-medium"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            View all
          </Link>
        </div>

        <div className="mt-4">
          <RecentSessions
            sessions={
              recentSessions
            }
          />
        </div>
      </section>
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

function CardMetric({
  label,
  value,
}: {
  label: string;

  value:
    React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-[9px] uppercase tracking-[0.11em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <div className="mt-2 text-sm font-semibold">
        {value}
      </div>
    </div>
  );
}

function DayStat({
  label,
  value,
  tone,
  borderLeft = false,
}: {
  label: string;
  value: number;

  tone?:
    | "positive"
    | "negative";

  borderLeft?:
    boolean;
}) {
  const color =
    tone ===
    "positive"
      ? "var(--positive)"
      : tone ===
          "negative"
        ? "var(--negative)"
        : "var(--foreground)";

  return (
    <div
      className="py-4 text-center"
      style={{
        borderLeft:
          borderLeft
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <p
        className="text-base font-semibold tabular-nums"
        style={{
          color,
        }}
      >
        {value}
      </p>

      <p
        className="mt-1 text-[8px] uppercase tracking-[0.1em]"
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

function MoneyValue({
  value,
  hero = false,
}: {
  value:
    bigint;

  hero?:
    boolean;
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
      className={
        hero
          ? "mt-2 block text-[34px] font-semibold leading-none tracking-[-0.045em] tabular-nums"
          : "tabular-nums"
      }
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

function NeutralMoney({
  value,
}: {
  value:
    bigint;
}) {
  const absolute =
    value <
    BigInt(0)
      ? -value
      : value;

  return (
    <span className="tabular-nums">
      NPR{" "}
      {formatMoneyFromCents(
        absolute
      )}
    </span>
  );
}

function EmptyValue() {
  return (
    <span
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      —
    </span>
  );
}