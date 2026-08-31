import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  formatMoneyFromCents,
} from "@/lib/money";

type DailyResult = {
  dateKey: string;
  pnl: bigint;
  sessions: number;
};

export function PnLCalendar({
  dailyResults,
  monthKey,
  currentMonthKey,
}: {
  dailyResults: DailyResult[];
  monthKey: string;
  currentMonthKey: string;
}) {
  const {
    year,
    month,
    monthLabel,
  } =
    getMonthInfoFromKey(
      monthKey
    );

  const previousMonthKey =
    shiftMonthKey(
      monthKey,
      -1
    );

  const nextMonthKey =
    shiftMonthKey(
      monthKey,
      1
    );

  /*
    We allow unlimited browsing
    into previous months.

    Future months are disabled.
  */
  const canGoNext =
    nextMonthKey <=
    currentMonthKey;

  const resultsByDay =
    new Map(
      dailyResults.map(
        (result) => [
          Number(
            result.dateKey.split(
              "-"
            )[2]
          ),
          result,
        ]
      )
    );

  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  const firstWeekday =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    ).getUTCDay();

  const cells:
    Array<
      number | null
    > = [];

  /*
    Empty cells before day 1.
  */
  for (
    let index = 0;
    index <
    firstWeekday;
    index++
  ) {
    cells.push(
      null
    );
  }

  /*
    Every actual day.
  */
  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    cells.push(
      day
    );
  }

  /*
    Complete the final week.
  */
  while (
    cells.length % 7 !==
    0
  ) {
    cells.push(
      null
    );
  }

  const monthlyPnL =
    dailyResults.reduce(
      (
        total,
        result
      ) =>
        total +
        result.pnl,
      BigInt(0)
    );

  const monthlySessions =
    dailyResults.reduce(
      (
        total,
        result
      ) =>
        total +
        result.sessions,
      0
    );

  return (
    <section>
      {/*
        Same calendar header as before.

        The only addition is the
        previous / next navigation.
      */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">
            {monthLabel}
          </h2>

          <div className="mt-1 flex items-center gap-1 text-xs">
            <SignedMoney
              value={
                monthlyPnL
              }
            />

            <span
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              •{" "}
              {
                monthlySessions
              }{" "}
              {monthlySessions ===
              1
                ? "session"
                : "sessions"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard?pnlMonth=${previousMonthKey}`}
            aria-label="Previous P&L month"
            className="flex h-8 w-8 items-center justify-center rounded-full transition"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",

              color:
                "var(--foreground-secondary)",
            }}
          >
            <ChevronLeft
              size={15}
            />
          </Link>

          {canGoNext ? (
            <Link
              href={`/dashboard?pnlMonth=${nextMonthKey}`}
              aria-label="Next P&L month"
              className="flex h-8 w-8 items-center justify-center rounded-full transition"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",

                color:
                  "var(--foreground-secondary)",
              }}
            >
              <ChevronRight
                size={15}
              />
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className="flex h-8 w-8 items-center justify-center rounded-full opacity-30"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",

                color:
                  "var(--foreground-muted)",
              }}
            >
              <ChevronRight
                size={15}
              />
            </div>
          )}
        </div>
      </div>

      {/*
        Calendar card itself is unchanged.
      */}
      <div
        className="mt-4 rounded-[var(--radius-lg)] p-4"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <div className="grid grid-cols-7 gap-1">
          {[
            "S",
            "M",
            "T",
            "W",
            "T",
            "F",
            "S",
          ].map(
            (
              label,
              index
            ) => (
              <div
                key={`${label}-${index}`}
                className="flex h-7 items-center justify-center text-[10px] font-medium"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {label}
              </div>
            )
          )}

          {cells.map(
            (
              day,
              index
            ) => {
              if (
                day ===
                null
              ) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square"
                  />
                );
              }

              return (
                <CalendarDay
                  key={
                    day
                  }
                  day={
                    day
                  }
                  result={
                    resultsByDay.get(
                      day
                    )
                  }
                />
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}

function CalendarDay({
  day,
  result,
}: {
  day: number;
  result?: DailyResult;
}) {
  const pnl =
    result?.pnl ??
    BigInt(0);

  const positive =
    pnl >
    BigInt(0);

  const negative =
    pnl <
    BigInt(0);

  /*
    Keep the current Zenith calendar
    styling exactly as before.
  */
  const backgroundColor =
    positive
      ? "var(--positive-soft)"
      : negative
        ? "var(--negative-soft)"
        : "transparent";

  const color =
    positive
      ? "var(--positive)"
      : negative
        ? "var(--negative)"
        : "var(--foreground-secondary)";

  return (
    <div
      className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor,
        color,
      }}
      title={
        result
          ? `${result.dateKey}: ${formatSignedMoney(
              pnl
            )}`
          : undefined
      }
    >
      <span className="text-xs font-medium">
        {day}
      </span>

      {result && (
        <span className="mt-0.5 text-[8px] font-semibold leading-none">
          {compactPnL(
            pnl
          )}
        </span>
      )}
    </div>
  );
}

function SignedMoney({
  value,
}: {
  value: bigint;
}) {
  const color =
    value >
    BigInt(0)
      ? "var(--positive)"
      : value <
          BigInt(0)
        ? "var(--negative)"
        : "var(--foreground-muted)";

  return (
    <span
      className="font-medium"
      style={{
        color,
      }}
    >
      {formatSignedMoney(
        value
      )}
    </span>
  );
}

function formatSignedMoney(
  value: bigint
) {
  if (
    value >
    BigInt(0)
  ) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      -value
    )}`;
  }

  return "NPR 0.00";
}

function compactPnL(
  value: bigint
) {
  const absolute =
    value <
    BigInt(0)
      ? -value
      : value;

  const rupees =
    absolute /
    BigInt(100);

  const prefix =
    value >
    BigInt(0)
      ? "+"
      : value <
          BigInt(0)
        ? "-"
        : "";

  if (
    rupees >=
    BigInt(1000)
  ) {
    const thousands =
      Number(
        rupees
      ) / 1000;

    const digits =
      thousands %
        1 ===
      0
        ? 0
        : 1;

    return `${prefix}${thousands.toFixed(
      digits
    )}k`;
  }

  return `${prefix}${rupees}`;
}

function getMonthInfoFromKey(
  monthKey: string
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  /*
    UTC is intentional here.

    We already have the exact
    Kathmandu year/month key and only
    need to create its calendar layout.
  */
  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        15
      )
    );

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "UTC",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      date
    );

  return {
    year,
    month,
    monthLabel,
  };
}

function shiftMonthKey(
  monthKey: string,
  difference: number
) {
  const [
    year,
    month,
  ] =
    monthKey
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1 +
          difference,
        1
      )
    );

  const shiftedYear =
    date
      .getUTCFullYear()
      .toString();

  const shiftedMonth =
    (
      date.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0"
      );

  return `${shiftedYear}-${shiftedMonth}`;
}