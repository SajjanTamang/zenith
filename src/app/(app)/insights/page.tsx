export default function InsightsPage() {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--foreground-muted)" }}
      >
        Performance
      </p>

      <h1 className="mt-2 text-4xl font-semibold">
        NPR 0.00
      </h1>

      <p
        className="mt-1 text-xs"
        style={{ color: "var(--foreground-muted)" }}
      >
        Lifetime cumulative P&L
      </p>

      <div
        className="mt-8 flex h-48 items-center justify-center rounded-[var(--radius-md)] border"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--foreground-muted)" }}
        >
          Your P&L chart will appear here.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <InsightMetric label="Current Bankroll" value="NPR 0.00" />
        <InsightMetric label="Starting Bankroll" value="NPR 0.00" />
        <InsightMetric label="Win Rate" value="0%" />
        <InsightMetric label="Total Time" value="0h 0m" />
      </div>
    </div>
  );
}

function InsightMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--foreground-muted)" }}
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}