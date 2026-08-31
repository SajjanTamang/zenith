"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  HandCoins,
  Search,
} from "lucide-react";

import type {
  ActivityItem,
  ActivityKind,
} from "@/lib/activity";

import {
  formatMoneyFromCents,
} from "@/lib/money";

type ActivityFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer"
  | "game"
  | "lending";

type DateMode =
  | "day"
  | "all";

export function ActivityList({
  items,
  todayDateKey,
}: {
  items: ActivityItem[];
  todayDateKey: string;
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<ActivityFilter>(
      "all"
    );

  const [
    selectedDateKey,
    setSelectedDateKey,
  ] =
    useState(
      todayDateKey
    );

  const [
    dateMode,
    setDateMode,
  ] =
    useState<DateMode>(
      "day"
    );

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          const matchesDate =
            dateMode ===
              "all" ||
            kathmanduDateKey(
              item.occurredAt
            ) ===
              selectedDateKey;

          const matchesFilter =
            filter ===
              "all" ||
            (filter ===
              "lending"
              ? item.kind ===
                  "loan" ||
                item.kind ===
                  "repayment"
              : item.kind ===
                filter);

          const matchesSearch =
            !query ||
            item.searchText.includes(
              query
            );

          return (
            matchesDate &&
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      items,
      search,
      filter,
      dateMode,
      selectedDateKey,
    ]);

  const canGoForward =
    selectedDateKey <
    todayDateKey;

  function goToPreviousDay() {
    setDateMode(
      "day"
    );

    setSelectedDateKey(
      shiftDateKey(
        selectedDateKey,
        -1
      )
    );
  }

  function goToNextDay() {
    if (
      !canGoForward
    ) {
      return;
    }

    setDateMode(
      "day"
    );

    const nextDate =
      shiftDateKey(
        selectedDateKey,
        1
      );

    setSelectedDateKey(
      nextDate >
        todayDateKey
        ? todayDateKey
        : nextDate
    );
  }

  function goToToday() {
    setSelectedDateKey(
      todayDateKey
    );

    setDateMode(
      "day"
    );
  }

  function showAllHistory() {
    setDateMode(
      "all"
    );
  }

  function handleDateChange(
    value: string
  ) {
    if (
      !value
    ) {
      return;
    }

    if (
      value >
      todayDateKey
    ) {
      setSelectedDateKey(
        todayDateKey
      );
    } else {
      setSelectedDateKey(
        value
      );
    }

    setDateMode(
      "day"
    );
  }

  return (
    <>
      {/* Date navigator */}
      <section className="mt-7">
        <div
          className="overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <div className="flex items-center">
            <button
              type="button"
              onClick={
                goToPreviousDay
              }
              disabled={
                dateMode ===
                "all"
              }
              aria-label="Previous day"
              className="flex h-14 w-12 shrink-0 items-center justify-center transition disabled:opacity-30"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              <ChevronLeft
                size={18}
              />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-xs font-semibold">
                {dateMode ===
                "all"
                  ? "All history"
                  : formatDateNavigatorLabel(
                      selectedDateKey,
                      todayDateKey
                    )}
              </p>

              <button
                type="button"
                onClick={
                  dateMode ===
                  "all"
                    ? goToToday
                    : showAllHistory
                }
                className="mt-1 text-[10px] font-semibold transition"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                {dateMode ===
                "all"
                  ? "Back to today"
                  : "All history"}
              </button>
            </div>

            <button
              type="button"
              onClick={
                goToNextDay
              }
              disabled={
                dateMode ===
                  "all" ||
                !canGoForward
              }
              aria-label="Next day"
              className="flex h-14 w-12 shrink-0 items-center justify-center transition disabled:opacity-30"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              <ChevronRight
                size={18}
              />
            </button>

            <label
              className="relative flex h-14 w-12 shrink-0 cursor-pointer items-center justify-center"
              style={{
                borderLeft:
                  "1px solid var(--border)",

                color:
                  "var(--foreground-secondary)",
              }}
            >
              <CalendarDays
                size={16}
              />

              <input
                type="date"
                value={
                  selectedDateKey
                }
                max={
                  todayDateKey
                }
                onChange={(
                  event
                ) =>
                  handleDateChange(
                    event.target
                      .value
                  )
                }
                aria-label="Choose activity date"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative mt-5">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        />

        <input
          type="search"
          value={
            search
          }
          onChange={(
            event
          ) =>
            setSearch(
              event.target
                .value
            )
          }
          placeholder="Search activity..."
          className="h-11 w-full rounded-[var(--radius-md)] pl-11 pr-4 text-sm outline-none transition focus:border-[var(--primary)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",

            color:
              "var(--foreground)",
          }}
        />
      </div>

      {/* Filters */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <FilterButton
          label="All"
          active={
            filter ===
            "all"
          }
          onClick={() =>
            setFilter(
              "all"
            )
          }
        />

        <FilterButton
          label="Income"
          active={
            filter ===
            "income"
          }
          onClick={() =>
            setFilter(
              "income"
            )
          }
        />

        <FilterButton
          label="Expenses"
          active={
            filter ===
            "expense"
          }
          onClick={() =>
            setFilter(
              "expense"
            )
          }
        />

        <FilterButton
          label="Transfers"
          active={
            filter ===
            "transfer"
          }
          onClick={() =>
            setFilter(
              "transfer"
            )
          }
        />

        <FilterButton
          label="Games"
          active={
            filter ===
            "game"
          }
          onClick={() =>
            setFilter(
              "game"
            )
          }
        />

        <FilterButton
          label="Lending"
          active={
            filter ===
            "lending"
          }
          onClick={() =>
            setFilter(
              "lending"
            )
          }
        />
      </div>

      {/* Results */}
      {items.length ===
      0 ? (
        <EmptyActivity />
      ) : filteredItems.length ===
        0 ? (
        <NoResults
          dateMode={
            dateMode
          }
          hasSearchOrFilter={
            Boolean(
              search.trim()
            ) ||
            filter !==
              "all"
          }
          selectedDateKey={
            selectedDateKey
          }
          todayDateKey={
            todayDateKey
          }
        />
      ) : (
        <div className="mt-7 space-y-7">
          {groupItemsByDate(
            filteredItems
          ).map(
            (group) => (
              <section
                key={
                  group.dateKey
                }
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    {dateMode ===
                      "day"
                      ? formatGroupLabel(
                          group.dateKey,
                          todayDateKey
                        )
                      : group.label}
                  </p>

                  <span
                    className="text-[10px]"
                    style={{
                      color:
                        "var(--foreground-muted)",
                    }}
                  >
                    {
                      group.items
                        .length
                    }{" "}
                    {group.items
                      .length ===
                    1
                      ? "entry"
                      : "entries"}
                  </span>
                </div>

                <div
                  className="overflow-hidden rounded-[var(--radius-lg)]"
                  style={{
                    backgroundColor:
                      "var(--surface)",

                    border:
                      "1px solid var(--border)",
                  }}
                >
                  {group.items.map(
                    (
                      item,
                      index
                    ) => (
                      <ActivityRow
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        borderTop={
                          index >
                          0
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )
          )}
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
      onClick={
        onClick
      }
      className="w-full rounded-full px-3 py-2 text-[11px] font-medium transition"
      style={{
        backgroundColor:
          active
            ? "var(--foreground)"
            : "var(--surface)",

        color:
          active
            ? "var(--background)"
            : "var(--foreground-secondary)",

        border:
          "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

function ActivityRow({
  item,
  borderTop = false,
}: {
  item: ActivityItem;
  borderTop?: boolean;
}) {
  const amount =
    BigInt(
      item.amountCents
    );

  /*
    Blue = Lending.

    We keep both loans and repayments blue
    so they are never confused with
    expenses or income.
  */
  const amountColor =
    item.kind ===
      "loan" ||
    item.kind ===
      "repayment"
      ? "var(--primary)"
      : item.kind ===
          "transfer"
        ? "var(--foreground)"
        : amount >
            BigInt(0)
          ? "var(--positive)"
          : amount <
              BigInt(0)
            ? "var(--negative)"
            : "var(--foreground)";

  const amountText =
    formatActivityAmount(
      item.kind,
      amount
    );

  return (
    <article
      className="flex items-center gap-3 px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <ActivityIcon
        kind={
          item.kind
        }
        amount={
          amount
        }
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {item.title}
        </p>

        <p
          className="mt-1 line-clamp-2 text-[10px] leading-4"
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
          className="text-xs font-semibold tabular-nums"
          style={{
            color:
              amountColor,
          }}
        >
          {amountText}
        </p>

        <p
          className="mt-1 text-[10px]"
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
  let icon =
    <ArrowLeftRight
      size={16}
    />;

  let color =
    "var(--foreground-secondary)";

  /*
    Income
  */
  if (
    kind ===
    "income"
  ) {
    icon =
      <ArrowDownLeft
        size={16}
      />;

    color =
      "var(--positive)";
  }

  /*
    Expense
  */
  if (
    kind ===
    "expense"
  ) {
    icon =
      <ArrowUpRight
        size={16}
      />;

    color =
      "var(--negative)";
  }

  /*
    Game
  */
  if (
    kind ===
    "game"
  ) {
    icon =
      <Gamepad2
        size={16}
      />;

    color =
      amount >
      BigInt(0)
        ? "var(--positive)"
        : amount <
            BigInt(0)
          ? "var(--negative)"
          : "var(--foreground-secondary)";
  }

  /*
    Money lent:

    Hand + arrow pointing outward.
  */
  if (
    kind ===
    "loan"
  ) {
    icon = (
      <div className="relative">
        <HandCoins
          size={16}
        />

        <ArrowUpRight
          size={9}
          strokeWidth={2.5}
          className="absolute -right-2 -top-1"
        />
      </div>
    );

    color =
      "var(--primary)";
  }

  /*
    Repayment:

    Hand + arrow pointing inward.
  */
  if (
    kind ===
    "repayment"
  ) {
    icon = (
      <div className="relative">
        <HandCoins
          size={16}
        />

        <ArrowDownLeft
          size={9}
          strokeWidth={2.5}
          className="absolute -right-2 -top-1"
        />
      </div>
    );

    color =
      "var(--primary)";
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
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

function NoResults({
  dateMode,
  hasSearchOrFilter,
  selectedDateKey,
  todayDateKey,
}: {
  dateMode: DateMode;
  hasSearchOrFilter: boolean;
  selectedDateKey: string;
  todayDateKey: string;
}) {
  let title =
    "No matching activity";

  let description =
    "Try changing your search or filter.";

  if (
    dateMode ===
      "day" &&
    !hasSearchOrFilter
  ) {
    title =
      selectedDateKey ===
      todayDateKey
        ? "Nothing recorded today"
        : "No activity on this day";

    description =
      selectedDateKey ===
      todayDateKey
        ? "New transactions, games, and lending will appear here."
        : "Choose another date or view all history.";
  }

  return (
    <div
      className="mt-8 rounded-[var(--radius-lg)] px-5 py-10 text-center"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        {title}
      </p>

      <p
        className="mt-2 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {description}
      </p>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div
      className="mt-8 rounded-[var(--radius-lg)] px-5 py-12 text-center"
      style={{
        backgroundColor:
          "var(--surface)",

        border:
          "1px solid var(--border)",
      }}
    >
      <p className="text-sm font-semibold">
        No activity yet
      </p>

      <p
        className="mt-2 text-xs leading-5"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Your transactions,
        game results, and lending
        will appear here.
      </p>
    </div>
  );
}

function groupItemsByDate(
  items: ActivityItem[]
) {
  const groups =
    new Map<
      string,
      ActivityItem[]
    >();

  for (
    const item
    of items
  ) {
    const dateKey =
      kathmanduDateKey(
        item.occurredAt
      );

    const existing =
      groups.get(
        dateKey
      ) ?? [];

    existing.push(
      item
    );

    groups.set(
      dateKey,
      existing
    );
  }

  return Array.from(
    groups.entries()
  ).map(
    ([
      dateKey,
      groupedItems,
    ]) => ({
      dateKey,

      label:
        formatKathmanduDate(
          groupedItems[0]
            .occurredAt
        ),

      items:
        groupedItems,
    })
  );
}

function kathmanduDateKey(
  value: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kathmandu",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date(
        value
      )
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function formatKathmanduDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatKathmanduTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatDateNavigatorLabel(
  dateKey: string,
  todayDateKey: string
) {
  const label =
    formatDateKey(
      dateKey,
      {
        month:
          "short",

        day:
          "numeric",
      }
    );

  if (
    dateKey ===
    todayDateKey
  ) {
    return `Today • ${label}`;
  }

  const yesterday =
    shiftDateKey(
      todayDateKey,
      -1
    );

  if (
    dateKey ===
    yesterday
  ) {
    return `Yesterday • ${label}`;
  }

  return formatDateKey(
    dateKey,
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

function formatGroupLabel(
  dateKey: string,
  todayDateKey: string
) {
  if (
    dateKey ===
    todayDateKey
  ) {
    return "Today";
  }

  if (
    dateKey ===
    shiftDateKey(
      todayDateKey,
      -1
    )
  ) {
    return "Yesterday";
  }

  return formatDateKey(
    dateKey,
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

function formatDateKey(
  dateKey: string,
  options:
    Intl.DateTimeFormatOptions
) {
  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split("-")
      .map(Number);

  const value =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12
      )
    );

  return new Intl.DateTimeFormat(
    "en-US",
    options
  ).format(
    value
  );
}

function shiftDateKey(
  dateKey: string,
  days: number
) {
  const [
    year,
    month,
    day,
  ] =
    dateKey
      .split("-")
      .map(Number);

  const value =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  value.setUTCDate(
    value.getUTCDate() +
      days
  );

  const nextYear =
    value
      .getUTCFullYear()
      .toString();

  const nextMonth =
    String(
      value.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const nextDay =
    String(
      value.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatActivityAmount(
  kind: ActivityKind,
  value: bigint
) {
  const absolute =
    value <
    BigInt(0)
      ? -value
      : value;

  /*
    Transfers have no
    positive/negative meaning.
  */
  if (
    kind ===
    "transfer"
  ) {
    return `NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  /*
    Loan:
    cash left the account.
  */
  if (
    kind ===
    "loan"
  ) {
    return `-NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  /*
    Repayment:
    cash returned to the account.
  */
  if (
    kind ===
    "repayment"
  ) {
    return `+NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  if (
    value >
    BigInt(0)
  ) {
    return `+NPR ${formatMoneyFromCents(
      value
    )}`;
  }

  if (
    value <
    BigInt(0)
  ) {
    return `-NPR ${formatMoneyFromCents(
      absolute
    )}`;
  }

  return "NPR 0.00";
}