import Link from "next/link";

import { CumulativePnLChart } from "@/components/insights/cumulative-pnl-chart";
import { RecentSessions } from "@/components/insights/recent-sessions";

import {
  buildCumulativeGamePnL,
  calculateGameAnalytics,
  getCurrentMonthGameAnalytics,
  type AnalyticsGameSession,
} from "@/lib/game-analytics";

import { formatMoneyFromCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const supabase = await createClient();

  const {
    data: sessions,
    error,
  } = await supabase
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
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">
          Insights
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor:
              "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load insights:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  const typedSessions =
    (sessions ?? []) as AnalyticsGameSession[];

  const lifetime =
    calculateGameAnalytics(
      typedSessions
    );

  const thisMonth =
    getCurrentMonthGameAnalytics(
      typedSessions
    );

  const cumulativePoints =
    buildCumulativeGamePnL(
      typedSessions
    ).map((point) => ({
      dateKey: point.dateKey,
      cumulativePnLCents:
        point.cumulativePnL.toString(),
    }));

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Performance
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Insights
      </h1>

      <section className="mt-8">
        <p
          className="text-xs font-medium uppercase tracking-[0.12em]"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Lifetime cumulative P&amp;L
        </p>

        <MoneyValue
          value={lifetime.totalPnL}
          large
        />

        <p
          className="mt-2 text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          {lifetime.totalSessions}{" "}
          {lifetime.totalSessions === 1
            ? "completed session"
            : "completed sessions"}
        </p>
      </section>

      <section className="mt-6">
        <CumulativePnLChart
          points={cumulativePoints}
        />
      </section>

      <section className="mt-8">
        <SectionLabel>
          Current month
        </SectionLabel>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricCard
            label="Game P&L"
            value={
              <MoneyValue
                value={thisMonth.totalPnL}
              />
            }
          />

          <MetricCard
            label="Played"
            value={
              <NeutralMoney
                value={
                  thisMonth.totalPlayingAmount
                }
              />
            }
          />

          <MetricCard
            label="Sessions"
            value={String(
              thisMonth.totalSessions
            )}
          />

          <MetricCard
            label="Win rate"
            value={`${thisMonth.winRate}%`}
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel>
          Performance summary
        </SectionLabel>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricCard
            label="Wins"
            value={String(
              lifetime.winningSessions
            )}
          />

          <MetricCard
            label="Losses"
            value={String(
              lifetime.losingSessions
            )}
          />

          <MetricCard
            label="Average P&L"
            value={
              <MoneyValue
                value={lifetime.averagePnL}
              />
            }
          />

          <MetricCard
            label="Avg playing amount"
            value={
              <NeutralMoney
                value={
                  lifetime.averagePlayingAmount
                }
              />
            }
          />

          <MetricCard
            label="Best day"
            value={
              lifetime.bestDay ? (
                <MoneyValue
                  value={
                    lifetime.bestDay.pnl
                  }
                />
              ) : (
                "—"
              )
            }
          />

          <MetricCard
            label="Worst day"
            value={
              lifetime.worstDay ? (
                <MoneyValue
                  value={
                    lifetime.worstDay.pnl
                  }
                />
              ) : (
                "—"
              )
            }
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <SectionLabel>
            Recent sessions
          </SectionLabel>

          <Link
            href="/sessions"
            className="text-xs font-medium"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            View all
          </Link>
        </div>

        <div className="mt-3">
          <RecentSessions
            sessions={typedSessions}
          />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2
      className="text-xs font-medium uppercase tracking-[0.12em]"
      style={{
        color: "var(--foreground-muted)",
      }}
    >
      {children}
    </h2>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <div className="mt-2 text-base font-semibold">
        {value}
      </div>
    </div>
  );
}

function MoneyValue({
  value,
  large = false,
}: {
  value: bigint;
  large?: boolean;
}) {
  const positive =
    value > BigInt(0);

  const negative =
    value < BigInt(0);

  const color =
    positive
      ? "var(--positive)"
      : negative
        ? "var(--negative)"
        : "var(--foreground)";

  const absolute =
    negative ? -value : value;

  const prefix =
    positive
      ? "+"
      : negative
        ? "-"
        : "";

  return (
    <span
      className={
        large
          ? "mt-2 block text-3xl font-semibold tracking-tight tabular-nums"
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
  value: bigint;
}) {
  const absolute =
    value < BigInt(0)
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