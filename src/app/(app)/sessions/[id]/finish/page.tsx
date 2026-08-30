import { notFound, redirect } from "next/navigation";

import { FinishSessionForm } from "@/components/sessions/finish-session-form";
import { createClient } from "@/lib/supabase/server";
import {
  formatMoneyFromCents,
  moneyToCents,
} from "@/lib/money";

export default async function FinishSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("game_sessions")
    .select(`
      id,
      playing_amount,
      game_type,
      status,
      started_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">
          End Session
        </h1>

        <p
          className="mt-4 text-sm"
          style={{
            color: "var(--negative)",
          }}
        >
          Could not load session: {error.message}
        </p>
      </div>
    );
  }

  if (!session) {
    notFound();
  }

  if (session.status !== "active") {
    redirect("/sessions");
  }

  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Game
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        End Session
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        Record today&apos;s final result.
      </p>

      <section
        className="mt-8 rounded-[var(--radius-lg)] p-5"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          {session.game_type}
        </p>

        <p
          className="mt-3 text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Playing amount
        </p>

        <p className="mt-1 text-xl font-semibold tabular-nums">
          NPR{" "}
          {formatMoneyFromCents(
            moneyToCents(session.playing_amount)
          )}
        </p>
      </section>

      <FinishSessionForm
        sessionId={session.id}
        playingAmount={session.playing_amount}
      />
    </div>
  );
}