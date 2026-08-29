export default function DashboardPage() {
  return (
    <div>
      <section>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "var(--foreground-muted)" }}
        >
          Total Balance
        </p>

        <p className="mt-2 text-4xl font-semibold tracking-tight">
          NPR
          <br />
          0.00
        </p>

        <p
          className="mt-2 text-xs"
          style={{ color: "var(--foreground-muted)" }}
        >
          Your balance will update when you add accounts.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6">
        <DashboardMetric label="Income" value="NPR 0.00" />
        <DashboardMetric label="Expenses" value="NPR 0.00" />
        <DashboardMetric
          label="Game P&L"
          value="NPR 0.00"
          positive
        />
        <DashboardMetric label="Bankroll" value="NPR 0.00" />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium">This Month</h2>

            <p
              className="mt-1 text-xs"
              style={{ color: "var(--foreground-muted)" }}
            >
              No sessions yet
            </p>
          </div>
        </div>

        <div
          className="mt-4 rounded-[var(--radius-md)] border p-5 text-center"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--foreground-secondary)" }}
          >
            Your P&L calendar will appear here.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">
          Recent Activity
        </h2>

        <div className="py-10 text-center">
          <p
            className="text-sm"
            style={{ color: "var(--foreground-secondary)" }}
          >
            No activity yet.
          </p>

          <p
            className="mt-1 text-xs"
            style={{ color: "var(--foreground-muted)" }}
          >
            Add an account or transaction to get started.
          </p>
        </div>
      </section>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: "var(--foreground-muted)" }}
      >
        {label}
      </p>

      <p
        className="mt-1 text-sm font-medium"
        style={{
          color: positive
            ? "var(--positive)"
            : "var(--foreground)",
        }}
      >
        {value}
      </p>
    </div>
  );
}