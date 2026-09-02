import {
  BorrowingForm,
} from "@/components/borrowing/borrowing-form";

import {
  createClient,
} from "@/lib/supabase/server";

type BorrowAccount = {
  id: string;
  name: string;
  account_type: string;

  archived_at:
    | string
    | null;
};

export default async function BorrowPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "accounts"
      )
      .select(`
        id,
        name,
        account_type,
        archived_at,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  if (
    error
  ) {
    return (
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Money
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Borrow Money
        </h1>

        <p
          className="mt-4 text-sm"
          style={{
            color:
              "var(--negative)",
          }}
        >
          Could not load
          accounts:{" "}
          {error.message}
        </p>
      </div>
    );
  }

  const accounts =
    (data ??
      []) as BorrowAccount[];

  /*
    Borrowed money first enters a normal
    account.

    Game Bankroll remains a temporary
    session-only pot.
  */
  const activeAccounts =
    accounts
      .filter(
        (
          account
        ) =>
          account.archived_at ===
            null &&
          account.account_type !==
            "game_bankroll"
      )
      .map(
        (
          account
        ) => ({
          id:
            account.id,

          name:
            account.name,
        })
      );

  return (
    <div>
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{
          color:
            "var(--foreground-muted)",
        }}
      >
        Money I owe
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Borrow Money
      </h1>

      <p
        className="mt-2 text-sm leading-6"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        Record money received
        from someone that you
        need to pay back.
      </p>

      <BorrowingForm
        accounts={
          activeAccounts
        }
      />
    </div>
  );
}