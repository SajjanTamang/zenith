import { SessionForm } from "@/components/sessions/session-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewSessionPage() {
  const supabase = await createClient();

  const { data: bankrollAccounts, error } =
    await supabase
      .from("accounts")
      .select(`
        id,
        name
      `)
      .eq("account_type", "game_bankroll")
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">
          Start Session
        </h1>

        <p
          className="mt-4 text-sm"
          style={{
            color: "var(--negative)",
          }}
        >
          Could not load bankroll accounts:{" "}
          {error.message}
        </p>
      </div>
    );
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
        Start Session
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        Start today&apos;s game session.
      </p>

      <SessionForm
        bankrollAccounts={bankrollAccounts ?? []}
      />
    </div>
  );
}