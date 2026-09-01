import {
  moneyToCents,
} from "@/lib/money";

export type AnalyticsGameSession = {
  id: string;

  status:
    | "active"
    | "completed";

  playing_amount?:
    | string
    | number;

  game_type?: string;

  note?:
    | string
    | null;

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

  ended_at:
    | string
    | null;

  /*
    A voided session remains status=completed
    for database compatibility.

    voided_at is what tells Zenith that the
    session must no longer count financially
    or statistically.
  */
  voided_at?:
    | string
    | null;

  void_reason?:
    | string
    | null;

  voided_original_result_type?:
    | "win"
    | "loss"
    | "even"
    | null;

  voided_original_result_amount?:
    | string
    | number
    | null;
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

/*
  Central helper.

  Use this anywhere Zenith needs to know
  whether a completed session should count
  in real analytics.
*/
export function isCountedCompletedGameSession(
  session:
    AnalyticsGameSession
) {
  return (
    session.status ===
      "completed" &&
    !session.voided_at
  );
}

export function isVoidedGameSession(
  session:
    AnalyticsGameSession
) {
  return Boolean(
    session.voided_at
  );
}

export function getSessionPnL(
  session:
    AnalyticsGameSession
) {
  /*
    Active sessions do not have final P&L.

    Voided completed sessions also have
    zero current financial effect.
  */
  if (
    !isCountedCompletedGameSession(
      session
    ) ||
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

export function buildDailyGameResults(
  sessions:
    AnalyticsGameSession[]
) {
  const dailyResults =
    new Map<
      string,
      DailyGameResult
    >();

  for (
    const session
    of sessions
  ) {
    /*
      Voided sessions do not create a
      statistical playing day.
    */
    if (
      !isCountedCompletedGameSession(
        session
      )
    ) {
      continue;
    }

    /*
      Group by Kathmandu date on which
      the session started.

      If the session finishes after midnight,
      it still belongs to its starting day.
    */
    const dateKey =
      kathmanduDateKey(
        session.started_at
      );

    const existing =
      dailyResults.get(
        dateKey
      ) ?? {
        dateKey,
        pnl:
          BigInt(0),
        sessions:
          0,
      };

    existing.pnl +=
      getSessionPnL(
        session
      );

    existing.sessions +=
      1;

    dailyResults.set(
      dateKey,
      existing
    );
  }

  return Array.from(
    dailyResults.values()
  ).sort(
    (
      a,
      b
    ) =>
      b.dateKey.localeCompare(
        a.dateKey
      )
  );
}

export function calculateGameAnalytics(
  sessions:
    AnalyticsGameSession[]
) {
  /*
    Only real, non-voided completed sessions
    participate in game statistics.
  */
  const completedSessions =
    sessions.filter(
      (
        session
      ) =>
        isCountedCompletedGameSession(
          session
        )
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
      (
        session
      ) =>
        session.result_type ===
        "win"
    ).length;

  const losingSessions =
    completedSessions.filter(
      (
        session
      ) =>
        session.result_type ===
        "loss"
    ).length;

  const evenSessions =
    completedSessions.filter(
      (
        session
      ) =>
        session.result_type ===
        "even"
    ).length;

  /*
    Lifetime Game P&L.
  */
  const totalPnL =
    completedSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        getSessionPnL(
          session
        ),
      BigInt(0)
    );

  /*
    Playing amount is informational only.

    It is not:
      income
      expense
      profit
      loss
  */
  const totalPlayingAmount =
    completedSessions.reduce(
      (
        total,
        session
      ) => {
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
    completedSessions.length >
    0
      ? totalPlayingAmount /
        BigInt(
          completedSessions.length
        )
      : BigInt(0);

  /*
    Daily statistics.
  */
  const winningDays =
    dailyResults.filter(
      (
        day
      ) =>
        day.pnl >
        BigInt(0)
    ).length;

  const losingDays =
    dailyResults.filter(
      (
        day
      ) =>
        day.pnl <
        BigInt(0)
    ).length;

  const evenDays =
    dailyResults.filter(
      (
        day
      ) =>
        day.pnl ===
        BigInt(0)
    ).length;

  /*
    Best / worst days.
  */
  const bestDay =
    dailyResults.length >
    0
      ? dailyResults.reduce(
          (
            best,
            day
          ) =>
            day.pnl >
            best.pnl
              ? day
              : best
        )
      : null;

  const worstDay =
    dailyResults.length >
    0
      ? dailyResults.reduce(
          (
            worst,
            day
          ) =>
            day.pnl <
            worst.pnl
              ? day
              : worst
        )
      : null;

  /*
    Average P&L per counted completed session.
  */
  const averagePnL =
    completedSessions.length >
    0
      ? totalPnL /
        BigInt(
          completedSessions.length
        )
      : BigInt(0);

  /*
    Even sessions are excluded from the
    win/loss denominator.

    Voided sessions were already excluded.
  */
  const decisiveSessions =
    winningSessions +
    losingSessions;

  const winRate =
    decisiveSessions >
    0
      ? Math.round(
          (
            winningSessions /
            decisiveSessions
          ) *
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
  sessions:
    AnalyticsGameSession[]
) {
  const currentMonth =
    kathmanduMonthKey(
      new Date()
    );

  const monthlySessions =
    sessions.filter(
      (
        session
      ) => {
        if (
          !isCountedCompletedGameSession(
            session
          )
        ) {
          return false;
        }

        return (
          kathmanduMonthKey(
            session.started_at
          ) ===
          currentMonth
        );
      }
    );

  return calculateGameAnalytics(
    monthlySessions
  );
}

export function buildCumulativeGamePnL(
  sessions:
    AnalyticsGameSession[]
) {
  const completedSessions =
    sessions
      .filter(
        (
          session
        ) =>
          isCountedCompletedGameSession(
            session
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.started_at
          ).getTime() -
          new Date(
            b.started_at
          ).getTime()
      );

  let cumulativePnL =
    BigInt(0);

  const points:
    CumulativePnLPoint[] =
      [];

  for (
    const session
    of completedSessions
  ) {
    const pnl =
      getSessionPnL(
        session
      );

    cumulativePnL +=
      pnl;

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

export function kathmanduMonthKey(
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
      "en-CA",
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