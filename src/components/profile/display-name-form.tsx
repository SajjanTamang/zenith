"use client";

import {
  Check,
  LoaderCircle,
  UserRound,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export function DisplayNameForm({
  initialName,
}: {
  initialName: string;
}) {
  const [
    name,
    setName,
  ] =
    useState(
      initialName
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName =
      name.trim();

    if (!cleanName) {
      setError(
        "Enter a display name."
      );

      return;
    }

    if (
      cleanName.length >
      50
    ) {
      setError(
        "Display name must be 50 characters or fewer."
      );

      return;
    }

    setLoading(
      true
    );

    const supabase =
      createClient();

    const {
      error:
        updateError,
    } =
      await supabase.auth.updateUser({
        data: {
          display_name:
            cleanName,
        },
      });

    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      setLoading(
        false
      );

      return;
    }

    setName(
      cleanName
    );

    setSuccess(
      "Display name updated."
    );

    /*
      Tell the persistent AppHeader
      to update immediately without
      requiring a full page refresh.
    */
    window.dispatchEvent(
      new CustomEvent(
        "zenith-profile-updated",
        {
          detail: {
            displayName:
              cleanName,
          },
        }
      )
    );

    setLoading(
      false
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-4"
    >
      <div
        className="rounded-[var(--radius-lg)] p-4"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground-secondary)",
            }}
          >
            <UserRound
              size={15}
            />
          </div>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="display-name"
              className="text-sm font-medium"
            >
              Display name
            </label>

            <p
              className="mt-1 text-[10px] leading-4"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              This name appears in
              the Zenith header.
            </p>

            <input
              id="display-name"
              type="text"
              value={
                name
              }
              onChange={(
                event
              ) => {
                setName(
                  event.target.value
                );

                if (
                  error
                ) {
                  setError("");
                }

                if (
                  success
                ) {
                  setSuccess("");
                }
              }}
              placeholder="Your name"
              autoComplete="name"
              maxLength={50}
              disabled={
                loading
              }
              className="mt-4 h-11 w-full rounded-[var(--radius-md)] px-3 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor:
                  "var(--background)",

                border:
                  "1px solid var(--border)",

                color:
                  "var(--foreground)",
              }}
            />

            {error && (
              <div
                className="mt-3 rounded-[var(--radius-md)] px-3 py-2 text-[10px] leading-4"
                style={{
                  backgroundColor:
                    "var(--negative-soft)",

                  color:
                    "var(--negative)",

                  border:
                    "1px solid var(--negative)",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="mt-3 flex items-center gap-2 text-[10px] font-medium"
                style={{
                  color:
                    "var(--positive)",
                }}
              >
                <Check
                  size={13}
                />

                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-xs font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                color:
                  "var(--foreground)",
              }}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                "Save name"
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}