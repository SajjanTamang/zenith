"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumnIncreasing,
  CirclePlus,
  House,
  List,
  Spade,
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: House,
  },
  {
    label: "Activity",
    href: "/activity",
    icon: List,
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: Spade,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: ChartNoAxesColumnIncreasing,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      <div className="relative mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navigationItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-16 flex-col items-center justify-center gap-1 text-[10px]"
              style={{
                color: active
                  ? "var(--primary)"
                  : "var(--foreground-muted)",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.7} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/quick-add"
          aria-label="Quick Add"
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          <CirclePlus size={23} />
        </Link>

        {navigationItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-16 flex-col items-center justify-center gap-1 text-[10px]"
              style={{
                color: active
                  ? "var(--primary)"
                  : "var(--foreground-muted)",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.7} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}