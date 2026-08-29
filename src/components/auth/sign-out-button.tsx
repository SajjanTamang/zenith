"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="h-11 w-full rounded-[var(--radius-md)] text-sm font-medium"
      style={{
        border: "1px solid var(--negative)",
        color: "var(--negative)",
      }}
    >
      Sign Out
    </button>
  );
}