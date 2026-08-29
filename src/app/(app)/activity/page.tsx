export default function ActivityPage() {
  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">
          Activity
        </h1>

        <p
          className="mt-1 text-sm"
          style={{ color: "var(--foreground-muted)" }}
        >
          Your transactions and transfers.
        </p>
      </div>

      <div className="mt-8">
        <input
          type="search"
          placeholder="Search activity..."
          className="h-11 w-full rounded-[var(--radius-md)] px-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="py-20 text-center">
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
          Transactions you add will appear here.
        </p>
      </div>
    </div>
  );
}