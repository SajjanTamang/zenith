import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UpdatePasswordPage() {
  return (
    <main
      className="relative flex min-h-screen overflow-hidden px-6 py-10"
      style={{
        backgroundColor:
          "var(--background)",
        color:
          "var(--foreground)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(0, 102, 255, 0.14), transparent 65%)",
        }}
      />

      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex w-full max-w-sm flex-col justify-center">
        <header className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold"
            style={{
              backgroundColor:
                "var(--primary)",
              color:
                "var(--primary-foreground)",
              boxShadow:
                "0 12px 30px rgba(0, 102, 255, 0.22)",
            }}
          >
            Z
          </div>

          <p
            className="mt-6 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Zenith Finance
          </p>

          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em]">
            New password
          </h1>

          <p
            className="mx-auto mt-3 max-w-xs text-sm leading-6"
            style={{
              color:
                "var(--foreground-secondary)",
            }}
          >
            Choose a secure new
            password for your
            Zenith account.
          </p>
        </header>

        <section className="mt-10">
          <UpdatePasswordForm />
        </section>
      </div>
    </main>
  );
}