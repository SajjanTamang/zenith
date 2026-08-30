"use client";

import Link from "next/link";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase =
      createClient();

    const {
      error: signInError,
    } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setError(
        signInError.message
      );

      setLoading(false);

      return;
    }

    router.replace(
      "/dashboard"
    );

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Email
        </label>

        <div
          className="mt-2 flex h-13 items-center rounded-[var(--radius-lg)] transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.10)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <div
            className="flex h-full w-12 shrink-0 items-center justify-center"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            <Mail size={17} />
          </div>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={loading}
            className="h-full min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              color:
                "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Password
          </label>

          <Link
            href="/forgot-password"
            className="text-[10px] font-medium transition"
            style={{
              color:
                "var(--primary)",
            }}
          >
            Forgot password?
          </Link>
        </div>

        <div
          className="mt-2 flex h-13 items-center rounded-[var(--radius-lg)] transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.10)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <div
            className="flex h-full w-12 shrink-0 items-center justify-center"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            <LockKeyhole
              size={17}
            />
          </div>

          <input
            id="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              color:
                "var(--foreground)",
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current
              )
            }
            disabled={loading}
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            className="flex h-full w-12 shrink-0 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {showPassword ? (
              <EyeOff size={17} />
            ) : (
              <Eye size={17} />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-xs leading-5"
          style={{
            backgroundColor:
              "var(--negative-soft)",
            border:
              "1px solid var(--negative)",
            color:
              "var(--negative)",
          }}
        >
          {error}
        </div>
      )}

      {/* Sign in */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor:
            "var(--primary)",
          color:
            "var(--primary-foreground)",
          boxShadow:
            "0 8px 24px rgba(0, 102, 255, 0.18)",
        }}
      >
        {loading ? (
          <>
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
            Signing in...
          </>
        ) : (
          <>
            Sign In
            <ArrowRight size={16} />
          </>
        )}
      </button>

      {/* Sign up */}
      <div
        className="mt-7 border-t pt-6 text-center"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          New to Zenith?
        </p>

        <Link
          href="/sign-up"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"
          style={{
            color:
              "var(--foreground)",
          }}
        >
          Create account
          <ArrowRight size={14} />
        </Link>
      </div>
    </form>
  );
}