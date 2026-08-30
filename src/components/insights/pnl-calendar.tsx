import { formatMoneyFromCents } from "@/lib/money";

type DailyResult = {
  dateKey: string;
  pnl: bigint;
  sessions: number;
};

export function PnLCalendar({
  dailyResults,
}: {
  dailyResults: DailyResult[];
}) {
  const now = new Date();

  const {
    year,
    month,
    monthLabel,
  } = getKathmanduMonthInfo(now);

  const resultsByDay = new Map(
    dailyResults.map((result) => [
      Number(result.dateKey.split("-")[2]),
      result,
    ])
  );

  const daysInMonth = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  const firstWeekday = new Date(
    Date.UTC(year, month - 1, 1)
  ).getUTCDay();

  const cells: Array<number | null> = [];

  /*
    Add empty cells before day 1.
  */
  for (
    let index = 0;
    index < firstWeekday;
    index++
  ) {
    cells.push(null);
  }

  /*
    Add every actual day in the month.
  */
  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    cells.push(day);
  }

  /*
    Complete the final calendar row.
  */
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const monthlyPnL =
    dailyResults.reduce(
      (total, result) =>
        total + result.pnl,
      BigInt(0)
    );

  const monthlySessions =
    dailyResults.reduce(
      (total, result) =>
        total + result.sessions,
      0
    );

  return (
    <section>
      <div>
        <h2 className="text-sm font-semibold">
          {monthLabel}
        </h2>

        <div className="mt-1 flex items-center gap-1 text-xs">
          <SignedMoney value={monthlyPnL} />

          <span
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            • {monthlySessions}{" "}
            {monthlySessions === 1
              ? "session"
              : "sessions"}
          </span>
        </div>
      </div>

      <div
        className="mt-4 rounded-[var(--radius-lg)] p-4"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
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
          ].map((label, index) => (
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
          ))}

          {cells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square"
                />
              );
            }

            return (
              <CalendarDay
                key={day}
                day={day}
                result={resultsByDay.get(day)}
              />
            );
          })}
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
    result?.pnl ?? BigInt(0);

  const positive =
    pnl > BigInt(0);

  const negative =
    pnl < BigInt(0);

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
          {compactPnL(pnl)}
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
    value > BigInt(0)
      ? "var(--positive)"
      : value < BigInt(0)
        ? "var(--negative)"
        : "var(--foreground-muted)";

  return (
    <span
      className="font-medium"
      style={{ color }}
    >
      {formatSignedMoney(value)}
    </span>
  );
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

function compactPnL(
  value: bigint
) {
  const absolute =
    value < BigInt(0)
      ? -value
      : value;

  const rupees =
    absolute / BigInt(100);

  const prefix =
    value > BigInt(0)
      ? "+"
      : value < BigInt(0)
        ? "-"
        : "";

  if (rupees >= BigInt(1000)) {
    const thousands =
      Number(rupees) / 1000;

    const digits =
      thousands % 1 === 0
        ? 0
        : 1;

    return `${prefix}${thousands.toFixed(
      digits
    )}k`;
  }

  return `${prefix}${rupees}`;
}

function getKathmanduMonthInfo(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
      }
    ).formatToParts(date);

  const year = Number(
    parts.find(
      (part) => part.type === "year"
    )?.value
  );

  const month = Number(
    parts.find(
      (part) => part.type === "month"
    )?.value
  );

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Kathmandu",
        month: "long",
        year: "numeric",
      }
    ).format(date);

  return {
    year,
    month,
    monthLabel,
  };
}