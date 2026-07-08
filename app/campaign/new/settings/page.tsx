"use client";

import type { ReactNode } from "react";
import { ActionFooter, StepShell } from "../_components/StepShell";
import { TextField } from "../_components/FormControls";
import { useCampaignDraft } from "../_components/useCampaignDraft";

export default function CampaignSettingsPage() {
  const { resetSavedSettings, selectedBoats, settings, settingsStatus, updateSetting } =
    useCampaignDraft();
  const detailsReady = Boolean(settings.name.trim() && settings.subject.trim());
  const senderReady = Boolean(
    settings.fromName?.trim() && settings.fromEmail?.trim() && settings.replyToEmail?.trim()
  );

  return (
    <StepShell
      description="Set the campaign metadata and sender information before selecting boats."
      footer={
        <ActionFooter
          backHref="/"
          backLabel="Dashboard"
          nextDescription={
            detailsReady && senderReady
              ? "Settings look ready for boat selection."
              : "Complete campaign and sender details before creating a draft."
          }
          nextHref="/campaign/new/boats"
          nextLabel="Continue to Boats"
        />
      }
      selectedCount={selectedBoats.length}
      title="Campaign settings"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SettingsCard
            description="Settings are saved in this browser and load again when you reopen the app."
            title="Saved Settings"
          >
            <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <span>{settingsStatus}</span>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-red-300 hover:text-red-700"
                onClick={resetSavedSettings}
                type="button"
              >
                Reset saved settings
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            description="These are used by Constant Contact and help identify the campaign draft."
            title="Campaign Details"
          >
            <div className="grid gap-5">
              <TextField
                label="Campaign title"
                onChange={(value) => updateSetting("name", value)}
                placeholder="June Clearance Boats"
                value={settings.name}
              />
              <TextField
                label="Subject line"
                onChange={(value) => updateSetting("subject", value)}
                placeholder="Clearance boats ready for summer"
                value={settings.subject}
              />
              <TextField
                label="Preheader"
                onChange={(value) => updateSetting("preheader", value)}
                placeholder="Limited inventory with special pricing available now."
                value={settings.preheader ?? ""}
              />
            </div>
          </SettingsCard>

          <SettingsCard
            description="Use addresses that are verified and approved inside Constant Contact."
            title="Sender Info"
          >
            <div className="grid gap-5">
              <TextField
                label="From name"
                onChange={(value) => updateSetting("fromName", value)}
                placeholder="Winnisquam Marine"
                value={settings.fromName ?? ""}
              />
              <TextField
                label="From email"
                onChange={(value) => updateSetting("fromEmail", value)}
                placeholder="boatsales@winnisquammarine.com"
                type="email"
                value={settings.fromEmail ?? ""}
              />
              <TextField
                label="Reply-to email"
                onChange={(value) => updateSetting("replyToEmail", value)}
                placeholder="boatsales@winnisquammarine.com"
                type="email"
                value={settings.replyToEmail ?? ""}
              />
            </div>
          </SettingsCard>
        </div>

        <aside className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-[var(--surface-shadow)] lg:sticky lg:top-5">
          <h2 className="text-lg font-bold text-ink">Settings Status</h2>
          <p className="mt-1 text-sm text-slate-500">Required details for campaign creation.</p>
          <div className="mt-5 space-y-3">
            <StatusItem
              detail={settings.name || "Campaign title needed"}
              label="Campaign title"
              ready={Boolean(settings.name.trim())}
            />
            <StatusItem
              detail={settings.subject || "Subject line needed"}
              label="Subject line"
              ready={Boolean(settings.subject.trim())}
            />
            <StatusItem
              detail={senderReady ? settings.fromEmail ?? "Sender ready" : "Sender fields needed"}
              label="Sender details"
              ready={senderReady}
            />
          </div>
        </aside>
      </section>
    </StepShell>
  );
}

function SettingsCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-6 shadow-[var(--tight-shadow)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatusItem({
  detail,
  label,
  ready,
}: {
  detail: string;
  label: string;
  ready: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">{label}</p>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {ready ? "Ready" : "Needed"}
        </span>
      </div>
      <p className="mt-2 break-words text-sm text-slate-600">{detail}</p>
    </div>
  );
}
