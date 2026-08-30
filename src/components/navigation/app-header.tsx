"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function AppHeader() {
  const {
    resolvedTheme,
    setTheme,
  } = useTheme();

  function toggleTheme() {
    setTheme(
      resolvedTheme === "dark"
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
          className="flex items-center gap-2"
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor:
                "var(--surface-secondary)",
              color:
                "var(--foreground)",
            }}
          >
            Z
          </div>

          <span className="text-sm font-semibold">
            Zenith Finance
          </span>
        </Link>

        <button
          type="button"
          aria-label="Toggle color theme"
          onClick={toggleTheme}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition"
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