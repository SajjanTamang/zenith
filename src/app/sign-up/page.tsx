import { SignUpForm } from "@/components/auth/sign-up-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignUpPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-6 py-12"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Z
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>

          <p
            className="mt-3 text-sm"
            style={{
              color: "var(--foreground-secondary)",
            }}
          >
            Start your Zenith financial workspace.
          </p>
        </div>

        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <SignUpForm />
        </div>
      </div>
    </main>
  );
}