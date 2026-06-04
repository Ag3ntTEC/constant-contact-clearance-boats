"use client";

import { StepShell } from "../_components/StepShell";
import { TextField } from "../_components/FormControls";
import { NextStepLink } from "../_components/NextStepLink";
import { useCampaignDraft } from "../_components/useCampaignDraft";

export default function CampaignSettingsPage() {
  const { selectedBoats, settings, updateSetting } = useCampaignDraft();

  return (
    <StepShell
      description="Set the campaign metadata and sender information before selecting boats."
      selectedCount={selectedBoats.length}
      title="Campaign settings"
    >
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
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
        <div className="mt-6">
          <NextStepLink href="/campaign/new/boats" label="Continue to boats" />
        </div>
      </section>
    </StepShell>
  );
}
