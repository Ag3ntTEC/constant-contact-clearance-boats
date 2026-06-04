"use client";

import type { ReactNode } from "react";
import { StepShell } from "../_components/StepShell";
import { TextField } from "../_components/FormControls";
import { NextStepLink } from "../_components/NextStepLink";
import { useCampaignDraft } from "../_components/useCampaignDraft";

export default function CampaignSettingsPage() {
  const { resetSavedSettings, selectedBoats, settings, settingsStatus, updateSetting } =
    useCampaignDraft();

  return (
    <StepShell
      description="Set the campaign metadata and sender information before selecting boats."
      selectedCount={selectedBoats.length}
      title="Campaign settings"
    >
      <section className="space-y-6">
        <SettingsCard
          description="Settings are saved in this browser and load again when you reopen the app."
          title="Saved Settings"
        >
        <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>{settingsStatus}</span>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-red-300 hover:text-red-700"
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

        <div className="mt-6">
          <NextStepLink href="/campaign/new/boats" label="Continue to boats" />
        </div>
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
    <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
