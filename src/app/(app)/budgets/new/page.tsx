import { AddBudgetForm } from "@/components/budgets/add-budget-form";

export default function NewBudgetPage() {
  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-[0.12em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Budgets
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Add budget
      </h1>

      <p
        className="mt-2 text-sm"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        Set a recurring
        monthly spending limit
        for one expense
        category.
      </p>

      <AddBudgetForm />
    </div>
  );
}