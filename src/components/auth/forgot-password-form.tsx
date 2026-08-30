"use client";

import {
  ArrowRight,
  Check,
  LoaderCircle,
  Mail,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Enter your email address."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    /*
      Supabase sends the recovery email.

      After the user clicks the email link:
      1. /auth/callback verifies the recovery code
      2. The callback redirects to /auth/update-password
      3. The user chooses a new password
    */
    const redirectTo =
      `${window.location.origin}/auth/callback?next=/auth/update-password`;

    const {
      error: resetError,
    } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

    if (resetError) {
      setError(
        friendlyResetError(
          resetError.message
        )
      );

      setLoading(false);

      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div
        className="rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor:
            "var(--positive-soft)",
          border:
            "1px solid var(--positive)",
        }}
      >
        <div className="flex gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "var(--surface)",
              color:
                "var(--positive)",
            }}
          >
            <Check size={17} />
          </div>

          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  "var(--positive)",
              }}
            >
              Check your email
            </p>

            <p
              className="mt-2 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              If an account exists
              for{" "}
              <strong>
                {email.trim()}
              </strong>
              , a secure password
              reset link has been
              sent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
    >
      <label
        htmlFor="recovery-email"
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
          id="recovery-email"
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

            Sending...
          </>
        ) : (
          <>
            Send reset link

            <ArrowRight
              size={16}
            />
          </>
        )}
      </button>
    </form>
  );
}

function friendlyResetError(
  message: string
) {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "rate limit"
    )
  ) {
    return "Too many reset emails were requested. Please wait a little and try again.";
  }

  return message;
}