"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogoutButton } from "./_components/LogoutButton";
import { StartNewCampaignButton } from "./_components/StartNewCampaignButton";
import { useCampaignDraft } from "./campaign/new/_components/useCampaignDraft";

const workflowCards = [
  {
    description: "Confirm title, subject, and sender details.",
    href: "/campaign/new/settings",
    label: "Settings",
  },
  {
    description: "Search inventory and set the email order.",
    href: "/campaign/new/boats",
    label: "Boats",
  },
  {
    description: "Adjust images, copy, buttons, and layout.",
    href: "/campaign/new/editor",
    label: "Editor",
  },
  {
    description: "Review the final email and create the draft.",
    href: "/campaign/new/preview",
    label: "Preview",
  },
];

export default function Dashboard() {
  const { selectedBoats, settings } = useCampaignDraft();
  const [hasRefreshToken, setHasRefreshToken] = useState<boolean | null>(null);
  const selectedCount = selectedBoats.length;
  const senderReady = Boolean(
    settings.fromName?.trim() && settings.fromEmail?.trim() && settings.replyToEmail?.trim()
  );
  const campaignReady = Boolean(settings.name.trim() && settings.subject.trim());
  const continueHref = selectedCount > 0 ? "/campaign/new/preview" : "/campaign/new/boats";

  useEffect(() => {
    async function loadConnectionStatus() {
      try {
        const response = await fetch("/api/constant-contact/status");
        const data = (await response.json()) as { hasRefreshToken?: boolean };
        setHasRefreshToken(Boolean(data.hasRefreshToken));
      } catch {
        setHasRefreshToken(false);
      }
    }

    loadConnectionStatus();
  }, []);

  const readiness = useMemo(
    () => [
      {
        detail: campaignReady ? settings.name : "Add campaign title and subject.",
        label: "Campaign details",
        ready: campaignReady,
      },
      {
        detail: senderReady ? settings.fromEmail ?? "Sender ready" : "Add sender information.",
        label: "Sender info",
        ready: senderReady,
      },
      {
        detail: selectedCount
          ? `${selectedCount} boat${selectedCount === 1 ? "" : "s"} selected`
          : "Choose at least one boat.",
        label: "Boat selection",
        ready: selectedCount > 0,
      },
      {
        detail:
          hasRefreshToken === null
            ? "Checking connection"
            : hasRefreshToken
              ? "Connected"
              : "Connect before drafting.",
        label: "Constant Contact",
        ready: Boolean(hasRefreshToken),
      },
    ],
    [campaignReady, hasRefreshToken, selectedCount, senderReady, settings.fromEmail, settings.name]
  );

  return (
    <main className="min-h-screen bg-foam">
      <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex rounded-md bg-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-tide">
              Internal Campaign Studio
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-normal text-ink">
              Clearance Boat Campaign Builder
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              A guided workspace for building polished Constant Contact clearance emails from live
              boat inventory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <StartNewCampaignButton />
            <Link
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor"
              href={continueHref}
            >
              Continue Draft
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="grid gap-6 py-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-6">
            <div className="rounded-md border border-slate-200 bg-white p-6 shadow-[var(--surface-shadow)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-harbor">
                    Current Draft
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">{settings.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Subject: {settings.subject || "No subject yet"}
                  </p>
                </div>
                <div className="rounded-md border border-harbor/20 bg-mist px-4 py-3 text-sm font-bold text-tide">
                  {selectedCount} selected
                </div>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {workflowCards.map((card, index) => (
                  <Link
                    className="group rounded-md border border-slate-200 bg-slate-50 p-4 hover:border-harbor hover:bg-white hover:shadow-[var(--tight-shadow)]"
                    href={card.href}
                    key={card.href}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Step {index + 1}
                    </span>
                    <span className="mt-2 block text-base font-bold text-ink group-hover:text-harbor">
                      {card.label}
                    </span>
                    <span className="mt-2 block text-sm leading-5 text-slate-600">
                      {card.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <MetricCard label="Selected Boats" value={String(selectedCount)} />
              <MetricCard
                label="Sender"
                value={senderReady ? "Ready" : "Needs Info"}
                tone={senderReady ? "success" : "warning"}
              />
              <MetricCard
                label="Constant Contact"
                value={hasRefreshToken ? "Connected" : "Not Connected"}
                tone={hasRefreshToken ? "success" : "warning"}
              />
            </div>
          </section>

          <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-[var(--surface-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Readiness</h2>
                <p className="mt-1 text-sm text-slate-500">What is ready for the next draft.</p>
              </div>
              <Link
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
                href="/campaign/new/preview"
              >
                Preview
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {readiness.map((item) => (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-ink">{item.label}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        item.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.ready ? "Ready" : "Needs attention"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-spruce"
      : tone === "warning"
        ? "text-amber-700"
        : "text-ink";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
