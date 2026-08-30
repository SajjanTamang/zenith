import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

type GameSession = {
  id: string;
  playing_amount: string | number;
  game_type: string;
  note: string | null;

  status: "active" | "completed";

  result_type: "win" | "loss" | "even" | null;
  result_amount: string | number | null;

  started_at: string;
  ended_at: string | null;
};

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
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
          Sessions
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor: "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load sessions: {error.message}
        </div>
      </div>
    );
  }

  const sessions = (data ?? []) as GameSession[];

  const activeSession =
    sessions.find(
      (session) => session.status === "active"
    ) ?? null;

  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  );

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Game
      </p>

      <div className="mt-1 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sessions
        </h1>

        {!activeSession && (
          <Link
            href="/sessions/new"
            className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Plus size={16} />
            Start
          </Link>
        )}
      </div>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        Track your daily game results and P&amp;L.
      </p>

      {activeSession && (
        <ActiveSessionCard session={activeSession} />
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Session history
          </h2>

          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            {completedSessions.length}{" "}
            {completedSessions.length === 1
              ? "session"
              : "sessions"}
          </p>
        </div>

        {completedSessions.length === 0 ? (
          <EmptyHistory
            hasActiveSession={Boolean(activeSession)}
          />
        ) : (
          <div className="mt-4 space-y-3">
            {completedSessions.map((session) => (
              <CompletedSessionCard
                key={session.id}
                session={session}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ActiveSessionCard({
  session,
}: {
  session: GameSession;
}) {
  return (
    <section
      className="mt-8 rounded-[var(--radius-lg)] p-5"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-[0.12em]"
            style={{
              color: "var(--positive)",
            }}
          >
            Active Session
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            {session.game_type}
          </h2>
        </div>

        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--positive-soft)",
            color: "var(--positive)",
          }}
        >
          Active
        </span>
      </div>

      <div
        className="mt-5 border-t pt-5"
        style={{
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Playing amount
        </p>

        <p className="mt-1 text-2xl font-semibold tabular-nums">
          NPR{" "}
          {formatMoneyFromCents(
            moneyToCents(session.playing_amount)
          )}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Started
          </p>

          <p className="mt-1 text-sm font-medium">
            {formatKathmanduTime(session.started_at)}
          </p>
        </div>

        <div>
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Date
          </p>

          <p className="mt-1 text-sm font-medium">
            {formatKathmanduDate(session.started_at)}
          </p>
        </div>
      </div>

      {session.note && (
        <div
          className="mt-5 border-t pt-4"
          style={{
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Note
          </p>

          <p className="mt-1 text-sm leading-6">
            {session.note}
          </p>
        </div>
      )}

      <Link
        href={`/sessions/${session.id}/finish`}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] text-sm font-semibold"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        End Session
      </Link>
    </section>
  );
}

function CompletedSessionCard({
  session,
}: {
  session: GameSession;
}) {
  const pnl = getSessionPnL(session);

  const pnlColor =
    pnl > BigInt(0)
      ? "var(--positive)"
      : pnl < BigInt(0)
        ? "var(--negative)"
        : "var(--foreground)";

  const resultLabel =
    session.result_type === "win"
      ? "Win"
      : session.result_type === "loss"
        ? "Loss"
        : "Even";

  return (
    <article
      className="rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {session.game_type}
          </p>

          <p
            className="mt-1 text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            {formatKathmanduDate(session.started_at)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className="text-sm font-semibold tabular-nums"
            style={{
              color: pnlColor,
            }}
          >
            {pnl > BigInt(0) ? "+" : ""}
            NPR {formatMoneyFromCents(pnl)}
          </p>

          <p
            className="mt-1 text-xs"
            style={{
              color: pnlColor,
            }}
          >
            {resultLabel}
          </p>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-4 border-t pt-4"
        style={{
          borderColor: "var(--border)",
        }}
      >
        <div>
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Playing amount
          </p>

          <p className="mt-1 text-sm font-medium tabular-nums">
            NPR{" "}
            {formatMoneyFromCents(
              moneyToCents(session.playing_amount)
            )}
          </p>
        </div>

        <div>
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Result
          </p>

          <p className="mt-1 text-sm font-medium tabular-nums">
            {session.result_type === "even"
              ? "NPR 0.00"
              : `NPR ${formatMoneyFromCents(
                  moneyToCents(
                    session.result_amount ?? 0
                  )
                )}`}
          </p>
        </div>
      </div>

      {session.note && (
        <div
          className="mt-4 border-t pt-4"
          style={{
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-xs"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Note
          </p>

          <p className="mt-1 text-sm leading-6">
            {session.note}
          </p>
        </div>
      )}

      {session.ended_at && (
        <p
          className="mt-4 text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          {formatKathmanduTime(session.started_at)}
          {" → "}
          {formatKathmanduTime(session.ended_at)}
        </p>
      )}
    </article>
  );
}

function EmptyHistory({
  hasActiveSession,
}: {
  hasActiveSession: boolean;
}) {
  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] px-5 py-10 text-center"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        No completed sessions yet
      </p>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        {hasActiveSession
          ? "Finish your active session and it will appear here."
          : "Your finished game days will appear here."}
      </p>
    </div>
  );
}

function getSessionPnL(session: GameSession) {
  if (
    session.status !== "completed" ||
    session.result_type === null ||
    session.result_amount === null
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

function formatKathmanduTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatKathmanduDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}