"use client";

import Link from "next/link";

import {
  Moon,
  Sun,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useTheme,
} from "next-themes";

import {
  createClient,
} from "@/lib/supabase/client";

export function AppHeader() {
  const {
    resolvedTheme,
    setTheme,
  } =
    useTheme();

  const [
    displayName,
    setDisplayName,
  ] =
    useState(
      "Zenith Finance"
    );

  useEffect(
    () => {
      let active =
        true;

      const supabase =
        createClient();

      function applyUser(
        user:
          | {
              email?:
                string;

              user_metadata?:
                Record<
                  string,
                  unknown
                >;
            }
          | null
          | undefined
      ) {
        if (
          !user ||
          !active
        ) {
          return;
        }

        const metadataName =
          typeof user
            .user_metadata
            ?.display_name ===
          "string"
            ? user.user_metadata.display_name.trim()
            : "";

        if (
          metadataName
        ) {
          setDisplayName(
            metadataName
          );

          return;
        }

        const fallbackName =
          getNameFromEmail(
            user.email
          );

        if (
          fallbackName
        ) {
          setDisplayName(
            fallbackName
          );
        }
      }

      async function loadUser() {
        const {
          data,
        } =
          await supabase.auth.getUser();

        applyUser(
          data.user
        );
      }

      void loadUser();

      /*
        Also react to Supabase Auth
        user updates.
      */
      const {
        data:
          authListener,
      } =
        supabase.auth.onAuthStateChange(
          (
            _event,
            session
          ) => {
            applyUser(
              session?.user
            );
          }
        );

      /*
        Profile form sends this event
        after display name changes.
      */
      function handleProfileUpdate(
        event:
          Event
      ) {
        const customEvent =
          event as CustomEvent<{
            displayName?:
              string;
          }>;

        const newName =
          customEvent.detail
            ?.displayName
            ?.trim();

        if (
          newName
        ) {
          setDisplayName(
            newName
          );
        }
      }

      window.addEventListener(
        "zenith-profile-updated",
        handleProfileUpdate
      );

      return () => {
        active =
          false;

        authListener
          .subscription
          .unsubscribe();

        window.removeEventListener(
          "zenith-profile-updated",
          handleProfileUpdate
        );
      };
    },
    []
  );

  function toggleTheme() {
    setTheme(
      resolvedTheme ===
        "dark"
        ? "light"
        : "dark"
    );
  }

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        backgroundColor:
          "var(--background)",

        borderColor:
          "var(--border)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link
          href="/profile"
          aria-label="Open profile"
          className="flex min-w-0 items-center gap-2"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor:
                "var(--surface-secondary)",

              color:
                "var(--foreground)",
            }}
          >
            Z
          </div>

          <span className="truncate text-sm font-semibold">
            {displayName}
          </span>
        </Link>

        <button
          type="button"
          aria-label="Toggle color theme"
          onClick={
            toggleTheme
          }
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition"
          style={{
            color:
              "var(--foreground-secondary)",
          }}
        >
          <Moon
            size={17}
            className="block dark:hidden"
            aria-hidden="true"
          />

          <Sun
            size={17}
            className="hidden dark:block"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}

function getNameFromEmail(
  email:
    string
    | undefined
) {
  if (
    !email
  ) {
    return "";
  }

  const localPart =
    email
      .split("@")[0]
      ?.trim();

  if (
    !localPart
  ) {
    return "";
  }

  const firstPart =
    localPart
      .split(
        /[._-]+/
      )
      .find(
        Boolean
      );

  if (
    !firstPart
  ) {
    return "";
  }

  return (
    firstPart
      .charAt(0)
      .toUpperCase() +
    firstPart.slice(1)
  );
}