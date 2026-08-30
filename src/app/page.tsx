import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen overflow-hidden px-6 py-10"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Subtle background atmosphere */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(0, 102, 255, 0.14), transparent 65%)",
        }}
      />

      {/* Theme */}
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex w-full max-w-sm flex-col justify-center">
        {/* Brand */}
        <header className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold shadow-lg"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow:
                "0 12px 30px rgba(0, 102, 255, 0.22)",
            }}
          >
            Z
          </div>

          <p
            className="mt-6 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            Zenith Finance
          </p>

          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em]">
            Welcome back
          </h1>

          <p
            className="mt-3 text-sm"
            style={{
              color: "var(--foreground-secondary)",
            }}
          >
            Your money. Your edge.
          </p>
        </header>

        {/* Login */}
        <section className="mt-10">
          <LoginForm />
        </section>

        {/* Footer */}
        <p
          className="mt-10 text-center text-[10px]"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Personal finance &amp; game P&amp;L tracking
        </p>
      </div>
    </main>
  );
}