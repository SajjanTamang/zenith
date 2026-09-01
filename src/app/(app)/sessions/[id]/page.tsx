import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleDot,
  Clock3,
  Gamepad2,
  HandCoins,
  Landmark,
  StickyNote,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  loanOutstandingBalance,
  type FinanceLoan,
  type FinanceLoanRepayment,
} from "@/lib/finance";

import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

import {
  createClient,
} from "@/lib/supabase/server";

type GameSession = {
  id: string;

  bankroll_account_id:
    | string
    | null;

  funding_account_id:
    | string
    | null;

  playing_amount:
    | string
    | number;

  game_type: string;

  note:
    | string
    | null;

  status:
    | "active"
    | "completed";

  result_type:
    | "win"
    | "loss"
    | "even"
    | null;

  result_amount:
    | string
    | number
    | null;

  started_at: string;

  ended_at:
    | string
    | null;
};

type Account = {
  id: string;
  name: string;

  archived_at:
    | string
    | null;
};

type Loan =
  FinanceLoan & {
    lent_at: string;
  };

type LoanPerson = {
  id: string;
  name: string;
};

export default async function SessionDetailPage({
  params,
}: {
  params:
    Promise<{
      id: string;
    }>;
}) {
  const {
    id,
  } =
    await params;

  const supabase =
    await createClient();

  const [
    sessionResult,
    accountsResult,
    loansResult,
    peopleResult,
    repaymentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "game_sessions"
        )
        .select(`
          id,
          bankroll_account_id,
          funding_account_id,
          playing_amount,
          game_type,
          note,
          status,
          result_type,
          result_amount,
          started_at,
          ended_at
        `)
        .eq(
          "id",
          id
        )
        .maybeSingle(),

      supabase
        .from(
          "accounts"
        )
        .select(`
          id,
          name,
          archived_at
        `),

      supabase
        .from(
          "loans"
        )
        .select(`
          id,
          person_id,
          source_account_id,
          principal_amount,
          game_session_id,
          note,
          lent_at,
          due_date
        `)
        .eq(
          "game_session_id",
          id
        )
        .order(
          "lent_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "loan_people"
        )
        .select(`
          id,
          name
        `),

      supabase
        .from(
          "loan_repayments"
        )
        .select(`
          id,
          loan_id,
          to_account_id,
          amount,
          note,
          repaid_at
        `),
    ]);

  const error =
    sessionResult.error ??
    accountsResult.error ??
    loansResult.error ??
    peopleResult.error ??
    repaymentsResult.error;

  if (
    error
  ) {
    return (
      <div>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          <ArrowLeft
            size={14}
          />

          Sessions
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Session
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor:
              "var(--negative-soft)",

            color:
              "var(--negative)",
          }}
        >
          Could not load
          session:{" "}
          {error.message}
        </div>
      </div>
    );
  }

  if (
    !sessionResult.data
  ) {
    notFound();
  }

  const session =
    sessionResult.data as GameSession;

  const accounts =
    (accountsResult.data ??
      []) as Account[];

  const loans =
    (loansResult.data ??
      []) as Loan[];

  const people =
    (peopleResult.data ??
      []) as LoanPerson[];

  const repayments =
    (repaymentsResult.data ??
      []) as FinanceLoanRepayment[];

  const accountNames =
    new Map(
      accounts.map(
        (
          account
        ) => [
          account.id,
          account.name,
        ]
      )
    );

  const peopleNames =
    new Map(
      people.map(
        (
          person
        ) => [
          person.id,
          person.name,
        ]
      )
    );

  const playingAmount =
    moneyToCents(
      session.playing_amount
    );

  const pnl =
    getSessionPnL(
      session
    );

  const isActive =
    session.status ===
    "active";

  const bankrollName =
    session.bankroll_account_id
      ? accountNames.get(
          session.bankroll_account_id
        ) ??
        "Unknown account"
      : "Unknown account";

  const fundingName =
    session.funding_account_id
      ? accountNames.get(
          session.funding_account_id
        ) ??
        "Unknown account"
      : "Unknown account";

  const totalLent =
    loans.reduce(
      (
        total,
        loan
      ) =>
        total +
        moneyToCents(
          loan.principal_amount
        ),
      BigInt(0)
    );

  const totalOutstanding =
    loans.reduce(
      (
        total,
        loan
      ) =>
        total +
        loanOutstandingBalance(
          loan,
          repayments
        ),
      BigInt(0)
    );

  return (
    <div className="pb-24">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-2 text-xs font-medium"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        <ArrowLeft
          size={14}
        />

        Sessions
      </Link>

      {/* Header */}
      <div className="mt-5 flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor:
              "var(--surface-secondary)",

            color:
              "var(--primary)",
          }}
        >
          <Gamepad2
            size={19}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Game session
            </p>

            <StatusBadge
              status={
                session.status
              }
            />
          </div>

          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {session.game_type}
          </h1>

          <p
            className="mt-1 text-xs"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Started{" "}
            {formatKathmanduDateTime(
              session.started_at
            )}
          </p>
        </div>
      </div>

      {/* Result hero */}
      <section
        className="mt-7 rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor:
            "var(--surface)",

          border:
            "1px solid var(--border)",
        }}
      >
        {isActive ? (
          <>
            <div className="flex items-center gap-2">
              <CircleDot
                size={15}
                style={{
                  color:
                    "var(--positive)",
                }}
              />

              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color:
                    "var(--positive)",
                }}
              >
                Session in progress
              </p>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              NPR{" "}
              {formatMoneyFromCents(
                playingAmount
              )}
            </p>

            <p
              className="mt-2 text-[10px]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Starting playing
              amount
            </p>
          </>
        ) : (
          <>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Final P&amp;L
            </p>

            <p
              className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{
                color:
                  pnl >
                  BigInt(0)
                    ? "var(--positive)"
                    : pnl <
                        BigInt(0)
                      ? "var(--negative)"
                      : "var(--foreground)",
              }}
            >
              {formatSignedMoney(
                pnl
              )}
            </p>

            <div className="mt-3">
              <ResultBadge
                result={
                  session.result_type
                }
              />
            </div>
          </>
        )}
      </section>

      {/* Details */}
      <section className="mt-7">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Session details
        </p>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",

            border:
              "1px solid var(--border)",
          }}
        >
          <DetailRow
            icon={
              <WalletCards
                size={15}
              />
            }
            label="Playing amount"
            value={`NPR ${formatMoneyFromCents(
              playingAmount
            )}`}
          />

          <DetailRow
            icon={
              <Landmark
                size={15}
              />
            }
            label="Funded from"
            value={
              fundingName
            }
            borderTop
          />

          <DetailRow
            icon={
              <Gamepad2
                size={15}
              />
            }
            label="Game bankroll"
            value={
              bankrollName
            }
            borderTop
          />

          <DetailRow
            icon={
              <CalendarDays
                size={15}
              />
            }
            label="Started"
            value={
              formatKathmanduDateTime(
                session.started_at
              )
            }
            borderTop
          />

          <DetailRow
            icon={
              <Clock3
                size={15}
              />
            }
            label={
              isActive
                ? "Duration"
                : "Finished"
            }
            value={
              isActive
                ? formatActiveDuration(
                    session.started_at
                  )
                : session.ended_at
                  ? formatKathmanduDateTime(
                      session.ended_at
                    )
                  : "Not recorded"
            }
            borderTop
          />

          {!isActive && (
            <DetailRow
              icon={
                <CircleDot
                  size={15}
                />
              }
              label="Session length"
              value={
                session.ended_at
                  ? formatDuration(
                      session.started_at,
                      session.ended_at
                    )
                  : "Not recorded"
              }
              borderTop
            />
          )}
        </div>
      </section>

      {/* Note */}
      {session.note && (
        <section className="mt-7">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Note
          </p>

          <div
            className="mt-3 flex gap-3 rounded-[var(--radius-lg)] p-4"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",

                color:
                  "var(--foreground-muted)",
              }}
            >
              <StickyNote
                size={15}
              />
            </div>

            <p
              className="pt-1 text-xs leading-5"
              style={{
                color:
                  "var(--foreground-secondary)",
              }}
            >
              {session.note}
            </p>
          </div>
        </section>
      )}

      {/* Lending */}
      <section className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Related lending
          </p>

          <span
            className="text-[10px]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            {
              loans.length
            }{" "}
            {loans.length ===
            1
              ? "loan"
              : "loans"}
          </span>
        </div>

        {loans.length ===
        0 ? (
          <div
            className="mt-3 rounded-[var(--radius-lg)] px-4 py-5"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--foreground-muted)",
                }}
              >
                <HandCoins
                  size={16}
                />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  No lending
                  attached
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Loans linked
                  to this session
                  will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className="mt-3 grid grid-cols-2 gap-4 rounded-[var(--radius-lg)] p-4"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",
              }}
            >
              <MiniMetric
                label="Total lent"
                value={`NPR ${formatMoneyFromCents(
                  totalLent
                )}`}
              />

              <MiniMetric
                label="Still owed"
                value={`NPR ${formatMoneyFromCents(
                  totalOutstanding
                )}`}
                highlight={
                  totalOutstanding >
                  BigInt(0)
                }
              />
            </div>

            <div
              className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
              style={{
                backgroundColor:
                  "var(--surface)",

                border:
                  "1px solid var(--border)",
              }}
            >
              {loans.map(
                (
                  loan,
                  index
                ) => {
                  const principal =
                    moneyToCents(
                      loan.principal_amount
                    );

                  const outstanding =
                    loanOutstandingBalance(
                      loan,
                      repayments
                    );

                  return (
                    <Link
                      key={
                        loan.id
                      }
                      href={
                        `/lending/${loan.id}`
                      }
                      className="flex items-center gap-3 px-4 py-4 transition hover:brightness-[0.98]"
                      style={{
                        borderTop:
                          index >
                          0
                            ? "1px solid var(--border)"
                            : undefined,
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                        style={{
                          backgroundColor:
                            "var(--surface-secondary)",

                          color:
                            "var(--primary)",
                        }}
                      >
                        <HandCoins
                          size={16}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {peopleNames.get(
                            loan.person_id
                          ) ??
                            "Unknown person"}
                        </p>

                        <p
                          className="mt-1 text-[10px]"
                          style={{
                            color:
                              "var(--foreground-muted)",
                          }}
                        >
                          Lent NPR{" "}
                          {formatMoneyFromCents(
                            principal
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold tabular-nums">
                          NPR{" "}
                          {formatMoneyFromCents(
                            outstanding
                          )}
                        </p>

                        <p
                          className="mt-1 text-[9px]"
                          style={{
                            color:
                              outstanding >
                              BigInt(0)
                                ? "var(--primary)"
                                : "var(--positive)",
                          }}
                        >
                          {outstanding >
                          BigInt(0)
                            ? "outstanding"
                            : "paid"}
                        </p>
                      </div>

                      <ArrowRight
                        size={14}
                        style={{
                          color:
                            "var(--foreground-muted)",
                        }}
                      />
                    </Link>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* Active actions */}
      {isActive && (
        <section className="mt-7">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              color:
                "var(--foreground-muted)",
            }}
          >
            Session actions
          </p>

          <div
            className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              backgroundColor:
                "var(--surface)",

              border:
                "1px solid var(--border)",
            }}
          >
            <Link
              href={
                `/quick-add?type=lend&session=${encodeURIComponent(
                  session.id
                )}`
              }
              className="flex items-center gap-3 px-4 py-4 transition hover:brightness-[0.98]"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--primary)",
                }}
              >
                <HandCoins
                  size={16}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Lend money
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Attach lending
                  to this active
                  session.
                </p>
              </div>

              <ArrowRight
                size={15}
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              />
            </Link>

            <Link
              href={
                `/sessions/${session.id}/finish`
              }
              className="flex items-center gap-3 px-4 py-4 transition hover:brightness-[0.98]"
              style={{
                borderTop:
                  "1px solid var(--border)",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",

                  color:
                    "var(--primary)",
                }}
              >
                <Gamepad2
                  size={16}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Finish session
                </p>

                <p
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      "var(--foreground-muted)",
                  }}
                >
                  Record the final
                  win, loss, or even
                  result.
                </p>
              </div>

              <ArrowRight
                size={15}
                style={{
                  color:
                    "var(--primary)",
                }}
              />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  borderTop = false,
}: {
  icon:
    React.ReactNode;

  label: string;
  value: string;
  borderTop?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4"
      style={{
        borderTop:
          borderTop
            ? "1px solid var(--border)"
            : undefined,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
        style={{
          backgroundColor:
            "var(--surface-secondary)",

          color:
            "var(--foreground-muted)",
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-[9px] font-medium uppercase tracking-[0.11em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[9px] font-medium uppercase tracking-[0.11em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="mt-2 text-sm font-semibold tabular-nums"
        style={{
          color:
            highlight
              ? "var(--primary)"
              : "var(--foreground)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    GameSession["status"];
}) {
  const active =
    status ===
    "active";

  return (
    <span
      className="rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]"
      style={{
        backgroundColor:
          active
            ? "var(--positive-soft)"
            : "var(--surface-secondary)",

        color:
          active
            ? "var(--positive)"
            : "var(--foreground-muted)",
      }}
    >
      {active
        ? "Active"
        : "Completed"}
    </span>
  );
}

function ResultBadge({
  result,
}: {
  result:
    | "win"
    | "loss"
    | "even"
    | null;
}) {
  if (
    !result
  ) {
    return null;
  }

  const background =
    result ===
    "win"
      ? "var(--positive-soft)"
      : result ===
          "loss"
        ? "var(--negative-soft)"
        : "var(--surface-secondary)";

  const color =
    result ===
    "win"
      ? "var(--positive)"
      : result ===
          "loss"
        ? "var(--negative)"
        : "var(--foreground-muted)";

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]"
      style={{
        backgroundColor:
          background,

        color,
      }}
    >
      {result}
    </span>
  );
}

function getSessionPnL(
  session: GameSession
) {
  if (
    session.status !==
      "completed" ||
    session.result_type ===
      null ||
    session.result_amount ===
      null
  ) {
    return BigInt(0);
  }

  const amount =
    moneyToCents(
      session.result_amount
    );

  if (
    session.result_type ===
    "win"
  ) {
    return amount;
  }

  if (
    session.result_type ===
    "loss"
  ) {
    return -amount;
  }

  return BigInt(0);
}

function formatSignedMoney(
  value: bigint
) {
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
      -value
    )}`;
  }

  return "NPR 0.00";
}

function formatKathmanduDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone:
        "Asia/Kathmandu",

      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

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

function formatDuration(
  start:
    string,

  end:
    string
) {
  const startTime =
    new Date(
      start
    ).getTime();

  const endTime =
    new Date(
      end
    ).getTime();

  const difference =
    Math.max(
      0,
      endTime -
        startTime
    );

  return formatDurationMilliseconds(
    difference
  );
}

function formatActiveDuration(
  start:
    string
) {
  const startTime =
    new Date(
      start
    ).getTime();

  const difference =
    Math.max(
      0,
      Date.now() -
        startTime
    );

  return formatDurationMilliseconds(
    difference
  );
}

function formatDurationMilliseconds(
  milliseconds:
    number
) {
  const totalMinutes =
    Math.floor(
      milliseconds /
        60000
    );

  const hours =
    Math.floor(
      totalMinutes /
        60
    );

  const minutes =
    totalMinutes %
    60;

  if (
    hours === 0
  ) {
    return `${minutes} min`;
  }

  if (
    minutes === 0
  ) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}