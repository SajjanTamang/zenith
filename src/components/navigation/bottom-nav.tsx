"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CirclePlus,
  Dice5,
  LayoutDashboard,
  NotebookTabs,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon | "insights";
};

const leftItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Activity",
    href: "/activity",
    icon: NotebookTabs,
  },
];

const rightItems: NavigationItem[] = [
  {
    label: "Sessions",
    href: "/sessions",
    icon: Dice5,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: "insights",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const quickAddActive =
    pathname.startsWith("/quick-add");

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-3 left-0 right-0 z-50 px-3"
    >
      <div
        className="relative mx-auto flex h-[72px] max-w-md items-center rounded-[22px] px-2"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow:
            "0 12px 35px rgba(0, 0, 0, 0.28)",
        }}
      >
        {/* Left */}
        <div className="flex flex-1 items-center justify-around">
          {leftItems.map((item) => (
            <NavigationItemButton
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>

        {/* Add */}
        <div className="flex w-[72px] shrink-0 items-center justify-center">
          <Link
            href="/quick-add"
            aria-label="Quick Add"
            aria-current={
              quickAddActive
                ? "page"
                : undefined
            }
            className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow:
                "0 6px 18px rgba(0, 102, 255, 0.32)",
            }}
          >
            <CirclePlus
              size={26}
              strokeWidth={2}
            />
          </Link>
        </div>

        {/* Right */}
        <div className="flex flex-1 items-center justify-around">
          {rightItems.map((item) => (
            <NavigationItemButton
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavigationItemButton({
  item,
  active,
}: {
  item: NavigationItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className="relative flex min-w-[62px] flex-col items-center justify-center gap-1.5 py-3"
      style={{
        color: active
          ? "var(--primary)"
          : "var(--foreground-muted)",
      }}
    >
      {active && (
        <span
          className="absolute -top-[1px] h-[3px] w-8 rounded-full"
          style={{
            backgroundColor: "var(--primary)",
          }}
        />
      )}

      {item.icon === "insights" ? (
        <InsightsIcon />
      ) : (
        <item.icon
          size={20}
          strokeWidth={
            active
              ? 2.2
              : 1.7
          }
        />
      )}

      <span
        className={
          active
            ? "text-[10px] font-semibold"
            : "text-[10px] font-medium"
        }
      >
        {item.label}
      </span>
    </Link>
  );
}

function InsightsIcon() {
  return (
    <span className="relative block h-5 w-5">
      <TrendingUp
        size={19}
        className="absolute bottom-0 left-0"
        strokeWidth={1.9}
      />

      <Sparkles
        size={9}
        className="absolute -right-0.5 -top-1"
        strokeWidth={2}
      />
    </span>
  );
}