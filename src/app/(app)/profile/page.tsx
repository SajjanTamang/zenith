import Link from "next/link";

import {
  ChevronRight,
  Clock3,
  Coins,
  FileDown,
  Mail,
  WalletCards,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase =
    await createClient();

  const { data } =
    await supabase.auth.getClaims();

  const email =
    typeof data?.claims?.email ===
    "string"
      ? data.claims.email
      : "Unknown";

  return (
    <div>
      {/* Header */}
      <div>
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Settings
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Profile
        </h1>

        <p
          className="mt-3 text-xs leading-5"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          Manage your Zenith
          account and preferences.
        </p>
      </div>

      {/* Account */}
      <section className="mt-8">
        <SectionLabel>
          Account
        </SectionLabel>

        <div
          className="mt-3 rounded-[var(--radius-lg)] p-4"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
                color:
                  "var(--foreground)",
              }}
            >
              {getEmailInitial(
                email
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Zenith Account
              </p>

              <p
                className="mt-1 truncate text-xs"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                {email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Money */}
      <section className="mt-8">
        <SectionLabel>
          Money
        </SectionLabel>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <ProfileLink
            href="/accounts"
            icon={
              <WalletCards
                size={16}
              />
            }
            label="Accounts"
            description="Manage cash, bank, wallet, and bankroll accounts."
          />

          <ProfileValue
            borderTop
            icon={
              <Coins
                size={16}
              />
            }
            label="Currency"
            value="NPR"
          />

          <ProfileValue
            borderTop
            icon={
              <Clock3
                size={16}
              />
            }
            label="Timezone"
            value="Asia/Kathmandu"
          />
        </div>
      </section>

      {/* Account details */}
      <section className="mt-8">
        <SectionLabel>
          Account details
        </SectionLabel>

        <div
          className="mt-3 overflow-hidden rounded-[var(--radius-lg)]"
          style={{
            backgroundColor:
              "var(--surface)",
            border:
              "1px solid var(--border)",
          }}
        >
          <ProfileValue
            icon={
              <Mail size={16} />
            }
            label="Email"
            value={email}
          />

          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <ProfileIcon>
              <FileDown
                size={16}
              />
            </ProfileIcon>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                Reports & Export
              </p>

              <p
                className="mt-1 text-[10px]"
                style={{
                  color:
                    "var(--foreground-muted)",
                }}
              >
                Coming later
              </p>
            </div>

            <span
              className="text-[10px] font-medium"
              style={{
                color:
                  "var(--foreground-muted)",
              }}
            >
              Soon
            </span>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section className="mt-10">
        <SignOutButton />
      </section>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2
      className="text-[10px] font-medium uppercase tracking-[0.14em]"
      style={{
        color:
          "var(--foreground-muted)",
      }}
    >
      {children}
    </h2>
  );
}

function ProfileLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-4 transition"
    >
      <ProfileIcon>
        {icon}
      </ProfileIcon>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {label}
        </p>

        <p
          className="mt-1 text-[10px] leading-4"
          style={{
            color:
              "var(--foreground-muted)",
          }}
        >
          {description}
        </p>
      </div>

      <ChevronRight
        size={16}
        style={{
          color:
            "var(--foreground-muted)",
        }}
      />
    </Link>
  );
}

function ProfileValue({
  icon,
  label,
  value,
  borderTop = false,
}: {
  icon: React.ReactNode;
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
      <ProfileIcon>
        {icon}
      </ProfileIcon>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {label}
        </p>
      </div>

      <p
        className="max-w-[55%] truncate text-right text-xs"
        style={{
          color:
            "var(--foreground-secondary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ProfileIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        color:
          "var(--foreground-secondary)",
      }}
    >
      {children}
    </div>
  );
}

function getEmailInitial(
  email: string
) {
  if (
    !email ||
    email === "Unknown"
  ) {
    return "Z";
  }

  return email
    .charAt(0)
    .toUpperCase();
}