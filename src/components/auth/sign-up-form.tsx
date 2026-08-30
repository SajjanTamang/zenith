"use client";

import Link from "next/link";

import {
  ArrowRight,
  Check,
  CheckCircle2,
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

export function SignUpForm() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const passwordLongEnough =
    password.length >= 8;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Enter your email address."
      );

      return;
    }

    if (!passwordLongEnough) {
      setError(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const {
      data,
      error: signUpError,
    } =
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

    if (signUpError) {
      setError(
        friendlyAuthError(
          signUpError.message
        )
      );

      setLoading(false);

      return;
    }

    /*
      If email confirmation is disabled,
      Supabase may return a session immediately.
    */
    if (data.session) {
      router.replace(
        "/dashboard"
      );

      router.refresh();

      return;
    }

    /*
      Otherwise the user must confirm
      the email before signing in.
    */
    setMessage(
      "Account created. Check your email to confirm your account, then sign in."
    );

    setLoading(false);
  }

  if (message) {
    return (
      <div>
        <div
          className="rounded-[var(--radius-lg)] p-5"
          style={{
            backgroundColor:
              "var(--positive-soft)",
            border:
              "1px solid var(--positive)",
          }}
        >
          <div className="flex items-start gap-3">
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

            <div className="min-w-0">
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
                We sent a confirmation link to{" "}
                <strong>
                  {email.trim()}
                </strong>
                . Confirm your email,
                then sign in to Zenith.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          Back to sign in
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Email */}
      <AuthFieldLabel
        htmlFor="signup-email"
      >
        Email
      </AuthFieldLabel>

      <div
        className="mt-2 flex h-[52px] items-center rounded-[var(--radius-lg)] transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.10)]"
        style={{
          backgroundColor:
            "var(--surface)",
          border:
            "1px solid var(--border)",
        }}
      >
        <FieldIcon>
          <Mail size={17} />
        </FieldIcon>

        <input
          id="signup-email"
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

      {/* Password */}
      <div className="mt-5">
        <PasswordField
          id="signup-password"
          label="Password"
          value={password}
          show={showPassword}
          disabled={loading}
          placeholder="Create a password"
          onChange={(value) => {
            setPassword(value);

            if (error) {
              setError("");
            }
          }}
          onToggle={() =>
            setShowPassword(
              (current) =>
                !current
            )
          }
        />
      </div>

      {/* Confirm */}
      <div className="mt-5">
        <PasswordField
          id="confirm-password"
          label="Confirm password"
          value={
            confirmPassword
          }
          show={
            showConfirmPassword
          }
          disabled={loading}
          placeholder="Enter password again"
          onChange={(value) => {
            setConfirmPassword(
              value
            );

            if (error) {
              setError("");
            }
          }}
          onToggle={() =>
            setShowConfirmPassword(
              (current) =>
                !current
            )
          }
        />
      </div>

      {/* Password feedback */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <Requirement
          satisfied={
            passwordLongEnough
          }
        >
          8+ characters
        </Requirement>

        <Requirement
          satisfied={
            passwordsMatch
          }
        >
          Passwords match
        </Requirement>
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

      {/* Submit */}
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

            Creating account...
          </>
        ) : (
          <>
            Create account

            <ArrowRight
              size={16}
            />
          </>
        )}
      </button>

      {/* Sign in */}
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
          Already have an account?
        </p>

        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"
          style={{
            color:
              "var(--foreground)",
          }}
        >
          Sign in
          <ArrowRight size={14} />
        </Link>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  disabled,
  placeholder,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  disabled: boolean;
  placeholder: string;
  onChange: (
    value: string
  ) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <AuthFieldLabel
        htmlFor={id}
      >
        {label}
      </AuthFieldLabel>

      <div
        className="mt-2 flex h-[52px] items-center rounded-[var(--radius-lg)] transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_rgba(0,102,255,0.10)]"
        style={{
          backgroundColor:
            "var(--surface)",
          border:
            "1px solid var(--border)",
        }}
      >
        <FieldIcon>
          <LockKeyhole
            size={17}
          />
        </FieldIcon>

        <input
          id={id}
          type={
            show
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          autoComplete="new-password"
          required
          disabled={disabled}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color:
              "var(--foreground)",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={
            show
              ? "Hide password"
              : "Show password"
          }
          className="flex h-full w-12 shrink-0 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {show ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </div>
  );
}

function AuthFieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-medium uppercase tracking-[0.14em]"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </label>
  );
}

function FieldIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-full w-12 shrink-0 items-center justify-center"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </div>
  );
}

function Requirement({
  satisfied,
  children,
}: {
  satisfied: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1.5 text-[10px]"
      style={{
        color: satisfied
          ? "var(--positive)"
          : "var(--foreground-muted)",
      }}
    >
      <CheckCircle2
        size={12}
      />

      {children}
    </div>
  );
}

function friendlyAuthError(
  message: string
) {
  if (
    message
      .toLowerCase()
      .includes(
        "rate limit"
      )
  ) {
    return "Too many authentication emails were requested. Please wait a little and try again.";
  }

  return message;
}