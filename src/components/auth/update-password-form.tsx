"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router =
    useRouter();

  const [
    password,
    setPassword,
  ] = useState("");

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

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    updated,
    setUpdated,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      password.length < 8
    ) {
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
      error: updateError,
    } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setError(
        updateError.message
      );

      setLoading(false);

      return;
    }

    setUpdated(true);
    setLoading(false);
  }

  async function continueToZenith() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    router.replace("/");

    router.refresh();
  }

  if (updated) {
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
            <Check
              size={17}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  "var(--positive)",
              }}
            >
              Password updated
            </p>

            <p
              className="mt-2 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              Your new password
              is ready. Sign in
              again to continue
              to Zenith.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            continueToZenith
          }
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold"
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          Back to sign in

          <ArrowRight
            size={15}
          />
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
    >
      <PasswordField
        id="new-password"
        label="New password"
        value={password}
        show={showPassword}
        disabled={loading}
        placeholder="Enter new password"
        autoComplete="new-password"
        onChange={
          setPassword
        }
        onToggle={() =>
          setShowPassword(
            (current) =>
              !current
          )
        }
      />

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
          autoComplete="new-password"
          onChange={
            setConfirmPassword
          }
          onToggle={() =>
            setShowConfirmPassword(
              (current) =>
                !current
            )
          }
        />
      </div>

      <p
        className="mt-3 text-[10px] leading-4"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Use at least 8
        characters.
      </p>

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
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

            Updating...
          </>
        ) : (
          <>
            Update password

            <ArrowRight
              size={16}
            />
          </>
        )}
      </button>
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
  autoComplete,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  disabled: boolean;
  placeholder: string;
  autoComplete: string;
  onChange: (
    value: string
  ) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
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
          <LockKeyhole
            size={17}
          />
        </div>

        <input
          id={id}
          type={
            show
              ? "text"
              : "password"
          }
          value={value}
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          autoComplete={
            autoComplete
          }
          required
          disabled={
            disabled
          }
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color:
              "var(--foreground)",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={
            disabled
          }
          aria-label={
            show
              ? "Hide password"
              : "Show password"
          }
          className="flex h-full w-12 shrink-0 items-center justify-center disabled:opacity-60"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {show ? (
            <EyeOff
              size={17}
            />
          ) : (
            <Eye
              size={17}
            />
          )}
        </button>
      </div>
    </div>
  );
}