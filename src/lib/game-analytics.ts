import { moneyToCents } from "@/lib/money";

export type AnalyticsGameSession = {
  id: string;

  status: "active" | "completed";

  playing_amount?: string | number;

  game_type?: string;

  note?: string | null;

  result_type: "win" | "loss" | "even" | null;

  result_amount: string | number | null;

  started_at: string;

  ended_at: string | null;
};

export type DailyGameResult = {
  dateKey: string;
  pnl: bigint;
  sessions: number;
};

export type CumulativePnLPoint = {
  dateKey: string;
  pnl: bigint;
  cumulativePnL: bigint;
};

export function getSessionPnL(
  session: AnalyticsGameSession
) {
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

export function buildDailyGameResults(
  sessions: AnalyticsGameSession[]
) {
  const dailyResults =
    new Map<string, DailyGameResult>();

  for (const session of sessions) {
    if (session.status !== "completed") {
      continue;
    }

    /*
      Group the session by the Kathmandu date
      on which it started.

      If a session ends after midnight, it still
      belongs to the day it started.
    */
    const dateKey =
      kathmanduDateKey(session.started_at);

    const existing =
      dailyResults.get(dateKey) ?? {
        dateKey,
        pnl: BigInt(0),
        sessions: 0,
      };

    existing.pnl += getSessionPnL(session);
    existing.sessions += 1;

    dailyResults.set(
      dateKey,
      existing
    );
  }

  return Array.from(
    dailyResults.values()
  ).sort(
    (a, b) =>
      b.dateKey.localeCompare(
        a.dateKey
      )
  );
}

export function calculateGameAnalytics(
  sessions: AnalyticsGameSession[]
) {
  const completedSessions =
    sessions.filter(
      (session) =>
        session.status === "completed"
    );

  const dailyResults =
    buildDailyGameResults(
      completedSessions
    );

  /*
    Session counts.
  */
  const winningSessions =
    completedSessions.filter(
      (session) =>
        session.result_type === "win"
    ).length;

  const losingSessions =
    completedSessions.filter(
      (session) =>
        session.result_type === "loss"
    ).length;

  const evenSessions =
    completedSessions.filter(
      (session) =>
        session.result_type === "even"
    ).length;

  /*
    Lifetime Game P&L.
  */
  const totalPnL =
    completedSessions.reduce(
      (total, session) =>
        total +
        getSessionPnL(session),
      BigInt(0)
    );

  /*
    Total amount the user chose to play with
    across completed sessions.

    Playing amount is informational only.
    It is NOT profit, loss, income, or expense.
  */
  const totalPlayingAmount =
    completedSessions.reduce(
      (total, session) => {
        if (
          session.playing_amount ===
          undefined
        ) {
          return total;
        }

        return (
          total +
          moneyToCents(
            session.playing_amount
          )
        );
      },
      BigInt(0)
    );

  const averagePlayingAmount =
    completedSessions.length > 0
      ? totalPlayingAmount /
        BigInt(
          completedSessions.length
        )
      : BigInt(0);

  /*
    Daily statistics.

    If multiple sessions were ever recorded on
    the same date, they are combined into one
    daily P&L result here.
  */
  const winningDays =
    dailyResults.filter(
      (day) =>
        day.pnl > BigInt(0)
    ).length;

  const losingDays =
    dailyResults.filter(
      (day) =>
        day.pnl < BigInt(0)
    ).length;

  const evenDays =
    dailyResults.filter(
      (day) =>
        day.pnl === BigInt(0)
    ).length;

  /*
    Best and worst daily P&L.
  */
  const bestDay =
    dailyResults.length > 0
      ? dailyResults.reduce(
          (best, day) =>
            day.pnl > best.pnl
              ? day
              : best
        )
      : null;

  const worstDay =
    dailyResults.length > 0
      ? dailyResults.reduce(
          (worst, day) =>
            day.pnl < worst.pnl
              ? day
              : worst
        )
      : null;

  /*
    Average P&L per completed session.
  */
  const averagePnL =
    completedSessions.length > 0
      ? totalPnL /
        BigInt(
          completedSessions.length
        )
      : BigInt(0);

  /*
    Session win rate.

    Even sessions are excluded from
    the win/loss denominator.
  */
  const decisiveSessions =
    winningSessions +
    losingSessions;

  const winRate =
    decisiveSessions > 0
      ? Math.round(
          (winningSessions /
            decisiveSessions) *
            100
        )
      : 0;

  return {
    totalPnL,

    totalSessions:
      completedSessions.length,

    totalDays:
      dailyResults.length,

    winningSessions,
    losingSessions,
    evenSessions,

    winningDays,
    losingDays,
    evenDays,

    winRate,

    averagePnL,

    totalPlayingAmount,
    averagePlayingAmount,

    bestDay,
    worstDay,

    dailyResults,
  };
}

export function getCurrentMonthGameAnalytics(
  sessions: AnalyticsGameSession[]
) {
  const currentMonth =
    kathmanduMonthKey(
      new Date()
    );

  const monthlySessions =
    sessions.filter(
      (session) => {
        if (
          session.status !==
          "completed"
        ) {
          return false;
        }

        return (
          kathmanduMonthKey(
            session.started_at
          ) === currentMonth
        );
      }
    );

  return calculateGameAnalytics(
    monthlySessions
  );
}

export function buildCumulativeGamePnL(
  sessions: AnalyticsGameSession[]
) {
  const completedSessions =
    sessions
      .filter(
        (session) =>
          session.status ===
          "completed"
      )
      .sort(
        (a, b) =>
          new Date(
            a.started_at
          ).getTime() -
          new Date(
            b.started_at
          ).getTime()
      );

  let cumulativePnL =
    BigInt(0);

  const points: CumulativePnLPoint[] =
    [];

  for (
    const session of
    completedSessions
  ) {
    const pnl =
      getSessionPnL(
        session
      );

    cumulativePnL += pnl;

    points.push({
      dateKey:
        kathmanduDateKey(
          session.started_at
        ),

      pnl,

      cumulativePnL,
    });
  }

  return points;
}

export function kathmanduDateKey(
  value: string | Date
) {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year: "numeric",

        month: "2-digit",

        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

export function kathmanduMonthKey(
  value: string | Date
) {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year: "numeric",

        month: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  return `${year}-${month}`;
}