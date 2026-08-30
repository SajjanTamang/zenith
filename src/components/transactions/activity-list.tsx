"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Gamepad2,
  Search,
} from "lucide-react";

import type {
  ActivityItem,
  ActivityKind,
} from "@/lib/activity";

import { formatMoneyFromCents } from "@/lib/money";

type ActivityFilter =
  | "all"
  | ActivityKind;

export function ActivityList({
  items,
}: {
  items: ActivityItem[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<ActivityFilter>("all");

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.kind === filter;

      const matchesSearch =
        !query ||
        item.searchText.includes(query);

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [items, search, filter]);

  return (
    <>
      <div className="relative mt-6">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{
            color: "var(--foreground-muted)",
          }}
        />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search activity..."
          className="h-11 w-full rounded-[var(--radius-md)] pl-11 pr-4 text-sm outline-none"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterButton
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />

        <FilterButton
          label="Income"
          active={filter === "income"}
          onClick={() =>
            setFilter("income")
          }
        />

        <FilterButton
          label="Expenses"
          active={filter === "expense"}
          onClick={() =>
            setFilter("expense")
          }
        />

        <FilterButton
          label="Transfers"
          active={filter === "transfer"}
          onClick={() =>
            setFilter("transfer")
          }
        />

        <FilterButton
          label="Games"
          active={filter === "game"}
          onClick={() =>
            setFilter("game")
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyActivity />
      ) : filteredItems.length === 0 ? (
        <div
          className="mt-8 rounded-[var(--radius-lg)] px-5 py-10 text-center"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm"
            style={{
              color: "var(--foreground-muted)",
            }}
          >
            No activity matches your search
            or filter.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groupItemsByDate(
            filteredItems
          ).map((group) => (
            <section key={group.dateKey}>
              <p
                className="mb-3 text-xs font-medium uppercase tracking-[0.1em]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {group.label}
              </p>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2 text-xs font-medium"
      style={{
        backgroundColor: active
          ? "var(--foreground)"
          : "var(--surface)",
        color: active
          ? "var(--background)"
          : "var(--foreground-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

function ActivityRow({
  item,
}: {
  item: ActivityItem;
}) {
  const amount =
    BigInt(item.amountCents);

  const amountColor =
    item.kind === "transfer"
      ? "var(--foreground)"
      : amount > BigInt(0)
        ? "var(--positive)"
        : amount < BigInt(0)
          ? "var(--negative)"
          : "var(--foreground)";

let amountText = "";

if (item.kind === "transfer") {
  amountText = `NPR ${formatMoneyFromCents(
    absoluteMoney(amount)
  )}`;
} else if (amount > BigInt(0)) {
  amountText = `+NPR ${formatMoneyFromCents(
    amount
  )}`;
} else if (amount < BigInt(0)) {
  amountText = `-NPR ${formatMoneyFromCents(
    absoluteMoney(amount)
  )}`;
} else {
  amountText = "NPR 0.00";
}
  return (
    <article
      className="flex items-center gap-3 rounded-[var(--radius-lg)] p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <ActivityIcon
        kind={item.kind}
        amount={amount}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {item.title}
            </p>

            <p
              className="mt-1 line-clamp-2 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {item.description}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className="text-sm font-semibold tabular-nums"
              style={{
                color: amountColor,
              }}
            >
              {amountText}
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              {formatKathmanduTime(
                item.occurredAt
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ActivityIcon({
  kind,
  amount,
}: {
  kind: ActivityKind;
  amount: bigint;
}) {
  let icon = (
    <ArrowLeftRight size={18} />
  );

  let color =
    "var(--foreground-secondary)";

  if (kind === "income") {
    icon = <ArrowDownLeft size={18} />;
    color = "var(--positive)";
  }

  if (kind === "expense") {
    icon = <ArrowUpRight size={18} />;
    color = "var(--negative)";
  }

  if (kind === "game") {
    icon = <Gamepad2 size={18} />;

    color =
      amount > BigInt(0)
        ? "var(--positive)"
        : amount < BigInt(0)
          ? "var(--negative)"
          : "var(--foreground-secondary)";
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        color,
      }}
    >
      {icon}
    </div>
  );
}

function EmptyActivity() {
  return (
    <div
      className="mt-8 rounded-[var(--radius-lg)] px-5 py-12 text-center"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        No activity yet
      </p>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Your transactions and game
        results will appear here.
      </p>
    </div>
  );
}

function groupItemsByDate(
  items: ActivityItem[]
) {
  const groups = new Map<
    string,
    ActivityItem[]
  >();

  for (const item of items) {
    const dateKey =
      kathmanduDateKey(item.occurredAt);

    const existing =
      groups.get(dateKey) ?? [];

    existing.push(item);
    groups.set(dateKey, existing);
  }

  return Array.from(groups.entries()).map(
    ([dateKey, groupedItems]) => ({
      dateKey,
      label: formatKathmanduDate(
        groupedItems[0].occurredAt
      ),
      items: groupedItems,
    })
  );
}

function kathmanduDateKey(
  value: string
) {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function formatKathmanduDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Kathmandu",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(value));
}

function formatKathmanduTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Kathmandu",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function absoluteMoney(
  value: bigint
) {
  return value < BigInt(0)
    ? -value
    : value;
}