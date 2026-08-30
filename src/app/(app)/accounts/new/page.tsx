import { AddAccountForm } from "@/components/accounts/add-account-form";

export default function NewAccountPage() {
  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color: "var(--foreground-muted)",
        }}
      >
        Accounts
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Add account
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        Add an account and its current starting balance.
      </p>

      <AddAccountForm />
    </div>
  );
}