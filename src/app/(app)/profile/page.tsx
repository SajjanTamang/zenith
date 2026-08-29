import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const email =
    typeof data?.claims?.email === "string"
      ? data.claims.email
      : "Unknown";

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold">
          Profile
        </h1>

        <p
          className="mt-1 text-sm"
          style={{
            color: "var(--foreground-muted)",
          }}
        >
          Manage your Zenith account and preferences.
        </p>
      </div>

      <section className="mt-10">
        <ProfileRow
          label="Email"
          value={email}
        />

        <ProfileRow
          label="Currency"
          value="NPR"
        />

        <ProfileRow
          label="Timezone"
          value="Asia/Kathmandu"
        />
      </section>

      <div className="mt-12">
        <SignOutButton />
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center justify-between border-b py-4"
      style={{
        borderColor: "var(--border)",
      }}
    >
      <span
        className="text-sm"
        style={{
          color: "var(--foreground-secondary)",
        }}
      >
        {label}
      </span>

      <span className="text-sm font-medium">
        {value}
      </span>
    </div>
  );
}