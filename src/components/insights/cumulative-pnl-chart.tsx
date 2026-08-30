"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoneyFromCents } from "@/lib/money";

type ChartPoint = {
  dateKey: string;
  cumulativePnLCents: string;
};

export function CumulativePnLChart({
  points,
}: {
  points: ChartPoint[];
}) {
  const chartData = points.map(
    (point) => ({
      date: formatShortDate(
        point.dateKey
      ),
      value: Number(
        BigInt(
          point.cumulativePnLCents
        )
      ) / 100,
    })
  );

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-52 items-center justify-center rounded-[var(--radius-lg)]"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Complete a game session to start
          your P&amp;L chart.
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-52 rounded-[var(--radius-lg)] p-3"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <AreaChart
          data={chartData}
          margin={{
            top: 12,
            right: 8,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient
              id="pnlGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="currentColor"
                stopOpacity={0.2}
              />

              <stop
                offset="100%"
                stopColor="currentColor"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: "var(--foreground-muted)",
            }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            width={55}
            tick={{
              fontSize: 10,
              fill: "var(--foreground-muted)",
            }}
            tickFormatter={(value) =>
              formatCompactNumber(value)
            }
          />

          <Tooltip
            content={<ChartTooltip />}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#pnlGradient)"
            dot={false}
            activeDot={{
              r: 4,
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
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
  }>;
  label?: string;
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const rawValue =
    payload[0]?.value;

  const value =
    typeof rawValue === "number"
      ? rawValue
      : Number(rawValue ?? 0);

  const cents =
    BigInt(Math.round(value * 100));

  const positive =
    cents > BigInt(0);

  const negative =
    cents < BigInt(0);

  const absolute =
    negative ? -cents : cents;

  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor:
          "var(--surface-elevated)",
        border:
          "1px solid var(--border)",
      }}
    >
      <p
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-1 font-semibold"
        style={{
          color: positive
            ? "var(--positive)"
            : negative
              ? "var(--negative)"
              : "var(--foreground)",
        }}
      >
        {positive
          ? "+"
          : negative
            ? "-"
            : ""}
        NPR{" "}
        {formatMoneyFromCents(
          absolute
        )}
      </p>
    </div>
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

  return `${Number(month)}/${Number(
    day
  )}`;
}

function formatCompactNumber(
  value: number
) {
  const absolute =
    Math.abs(value);

  if (absolute >= 1000000) {
    return `${(
      value / 1000000
    ).toFixed(1)}m`;
  }

  if (absolute >= 1000) {
    return `${(
      value / 1000
    ).toFixed(1)}k`;
  }

  return String(
    Math.round(value)
  );
}