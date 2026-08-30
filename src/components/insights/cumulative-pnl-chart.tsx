"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatMoneyFromCents,
} from "@/lib/money";

type ChartPoint = {
  dateKey: string;
  cumulativePnLCents: string;
};

type ChartDataPoint = {
  x: number;
  dateKey: string;
  dateLabel: string;
  value: number;
};

export function CumulativePnLChart({
  points,
}: {
  points: ChartPoint[];
}) {
  const chartData: ChartDataPoint[] =
    points.map(
      (
        point,
        index
      ) => ({
        x: index,
        dateKey:
          point.dateKey,

        dateLabel:
          formatShortDate(
            point.dateKey
          ),

        value:
          Number(
            BigInt(
              point.cumulativePnLCents
            )
          ) / 100,
      })
    );

  if (
    chartData.length === 0
  ) {
    return (
      <div
        className="flex h-56 items-center justify-center rounded-[var(--radius-lg)] px-6 text-center"
        style={{
          backgroundColor:
            "var(--surface)",
          border:
            "1px solid var(--border)",
        }}
      >
        <p
          className="text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Complete a game session
          to start your P&amp;L chart.
        </p>
      </div>
    );
  }

  const finalValue =
    BigInt(
      points[
        points.length - 1
      ].cumulativePnLCents
    );

  const chartColor =
    finalValue > BigInt(0)
      ? "var(--positive)"
      : finalValue < BigInt(0)
        ? "var(--negative)"
        : "var(--primary)";

  /*
    The chart still plots every completed session.

    For the X-axis, sessions that belong to the
    same Kathmandu calendar day are grouped into
    one date label.

    Example:

    Session 1 - Aug 30
    Session 2 - Aug 30
    Session 3 - Aug 30

    becomes one centered "Aug 30" label.
  */
  const dateTicks =
    buildDateTicks(
      chartData
    );

  const dateLabels =
    new Map<
      number,
      string
    >(
      dateTicks.map(
        (tick) => [
          tick.position,
          tick.label,
        ]
      )
    );

  const maxX =
    Math.max(
      chartData.length - 1,
      1
    );

  return (
    <div
      className="h-60 rounded-[var(--radius-lg)] px-2 pb-2 pt-4"
      style={{
        backgroundColor:
          "var(--surface)",
        border:
          "1px solid var(--border)",
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <AreaChart
          data={chartData}
          margin={{
            top: 8,
            right: 8,
            left: -18,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient
              id="zenithPnlGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={
                  chartColor
                }
                stopOpacity={
                  0.22
                }
              />

              <stop
                offset="100%"
                stopColor={
                  chartColor
                }
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeOpacity={0.3}
          />

          <XAxis
            dataKey="x"
            type="number"
            domain={[
              0,
              maxX,
            ]}
            ticks={dateTicks.map(
              (tick) =>
                tick.position
            )}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            allowDecimals
            tick={{
              fontSize: 9,
              fill:
                "var(--foreground-muted)",
            }}
            tickFormatter={(
              value
            ) =>
              dateLabels.get(
                Number(value)
              ) ?? ""
            }
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{
              fontSize: 9,
              fill:
                "var(--foreground-muted)",
            }}
            tickFormatter={(
              value
            ) =>
              formatCompactNumber(
                Number(value)
              )
            }
          />

          <Tooltip
            cursor={{
              stroke:
                "var(--border-strong)",
              strokeDasharray:
                "3 3",
            }}
            content={
              <ChartTooltip />
            }
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2.2}
            fill="url(#zenithPnlGradient)"
            dot={{
              r: 3,
              fill:
                "var(--surface)",
              stroke:
                chartColor,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 4,
              fill:
                "var(--surface)",
              stroke:
                chartColor,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;

  payload?: Array<{
    value?:
      | number
      | string;

    payload?: ChartDataPoint;
  }>;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const point =
    payload[0]?.payload;

  const rawValue =
    payload[0]?.value;

  const value =
    typeof rawValue ===
    "number"
      ? rawValue
      : Number(
          rawValue ?? 0
        );

  const cents =
    BigInt(
      Math.round(
        value * 100
      )
    );

  const positive =
    cents > BigInt(0);

  const negative =
    cents < BigInt(0);

  const absolute =
    negative
      ? -cents
      : cents;

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
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 shadow-lg"
      style={{
        backgroundColor:
          "var(--surface-elevated)",
        border:
          "1px solid var(--border)",
      }}
    >
      <p
        className="text-[9px]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {point?.dateLabel ??
          ""}
      </p>

      <p
        className="mt-1 text-xs font-semibold tabular-nums"
        style={{
          color,
        }}
      >
        {prefix}NPR{" "}
        {formatMoneyFromCents(
          absolute
        )}
      </p>
    </div>
  );
}

function buildDateTicks(
  data: ChartDataPoint[]
) {
  const groups: Array<{
    dateKey: string;
    label: string;
    start: number;
    end: number;
  }> = [];

  for (
    let index = 0;
    index < data.length;
    index++
  ) {
    const point =
      data[index];

    const currentGroup =
      groups[
        groups.length - 1
      ];

    if (
      currentGroup &&
      currentGroup.dateKey ===
        point.dateKey
    ) {
      currentGroup.end =
        index;

      continue;
    }

    groups.push({
      dateKey:
        point.dateKey,

      label:
        point.dateLabel,

      start: index,
      end: index,
    });
  }

  return groups.map(
    (group) => ({
      label:
        group.label,

      position:
        (group.start +
          group.end) /
        2,
    })
  );
}

function formatShortDate(
  dateKey: string
) {
  const [
    year,
    month,
    day,
  ] = dateKey.split("-");

  const date =
    new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day)
      )
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

function formatCompactNumber(
  value: number
) {
  const absolute =
    Math.abs(value);

  if (
    absolute >= 1000000
  ) {
    return `${stripTrailingZero(
      value / 1000000
    )}m`;
  }

  if (
    absolute >= 1000
  ) {
    return `${stripTrailingZero(
      value / 1000
    )}k`;
  }

  return String(
    Math.round(value)
  );
}

function stripTrailingZero(
  value: number
) {
  return Number.isInteger(
    value
  )
    ? value.toFixed(0)
    : value.toFixed(1);
}