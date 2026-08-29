export default function SessionsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">
        Sessions
      </h1>

      <p
        className="mt-1 text-sm"
        style={{ color: "var(--foreground-muted)" }}
      >
        Track your game sessions and P&L.
      </p>

      <div className="py-20 text-center">
        <p
          className="text-sm"
          style={{ color: "var(--foreground-secondary)" }}
        >
          No sessions yet.
        </p>

        <p
          className="mt-1 text-xs"
          style={{ color: "var(--foreground-muted)" }}
        >
          Your completed sessions will appear here.
        </p>
      </div>
    </div>
  );
}