import { TransactionForm } from "@/components/transactions/transaction-form";
import { createClient } from "@/lib/supabase/server";

export default async function QuickAddPage() {
  const supabase = await createClient();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select(`
      id,
      name,
      account_type
    `)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Quick Add
        </h1>

        <div
          className="mt-6 rounded-[var(--radius-md)] p-4 text-sm"
          style={{
            backgroundColor: "var(--negative-soft)",
            color: "var(--negative)",
          }}
        >
          Could not load accounts: {error.message}
        </div>
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
        New entry
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Quick Add
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        Record income, expenses, and transfers.
      </p>

      <TransactionForm accounts={accounts ?? []} />

      <div
        className="mt-8 border-t pt-6"
        style={{
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-xs"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Game sessions will be added separately after the
          transaction system is complete.
        </p>
      </div>
    </div>
  );
}