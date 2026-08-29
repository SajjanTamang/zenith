export default function QuickAddPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">
        Quick Add
      </h1>

      <p
        className="mt-1 text-sm"
        style={{ color: "var(--foreground-muted)" }}
      >
        Add money activity to Zenith.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {["Expense", "Income", "Transfer", "Session"].map(
          (type) => (
            <button
              key={type}
              type="button"
              className="h-20 rounded-[var(--radius-md)] text-sm font-medium"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {type}
            </button>
          )
        )}
      </div>
    </div>
  );
}