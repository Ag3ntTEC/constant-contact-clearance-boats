"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { StepShell } from "../_components/StepShell";
import { TextArea, TextField } from "../_components/FormControls";
import { NextStepLink } from "../_components/NextStepLink";
import { useCampaignDraft } from "../_components/useCampaignDraft";
import type { EmailAssets, HeaderSection } from "@/lib/types";

type ImportedImageField =
  | "topBannerImageDataUrl"
  | "footerImageDataUrl";

export default function CampaignEditorPage() {
  const {
    addHeaderSection,
    removeHeaderSection,
    resetSavedSettings,
    selectedBoats,
    settings,
    settingsStatus,
    updateAsset,
    updateHeaderSection,
  } = useCampaignDraft();

  function handleUpload(field: ImportedImageField, file?: File) {
    if (!file) {
      updateAsset(field, "");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateAsset(field, String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  return (
    <StepShell
      description="Add the reference-style campaign images, button links, and layout spacing."
      selectedCount={selectedBoats.length}
      title="Edit campaign assets"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <SettingsCard
            description="Your public image URLs and link settings are saved automatically."
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
            description="Imported files are saved for this browser preview. Use public URLs before creating the Constant Contact draft."
            title="Image Assets"
          >
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Uploaded images must be hosted at a public URL before sending through Constant Contact.
            Imported files are saved for the app preview, while public URL fields are used when the
            campaign is ready to send.
          </div>

          <div className="mt-5 grid gap-5">
            <ImageAssetField
              importedPreviewUrl={settings.assets.topBannerImageDataUrl}
              label="Top banner image"
              onChange={(value) => updateAsset("topBannerImageUrl", value)}
              onClearImport={() => updateAsset("topBannerImageDataUrl", "")}
              onWidthChange={(value) => updateAsset("topBannerImageWidth", value)}
              onUpload={(file) => handleUpload("topBannerImageDataUrl", file)}
              placeholder="https://example.com/top-banner.jpg"
              value={settings.assets.topBannerImageUrl}
              width={settings.assets.topBannerImageWidth}
            />
            <ImageAssetField
              importedPreviewUrl={settings.assets.footerImageDataUrl}
              label="Footer image"
              onChange={(value) => updateAsset("footerImageUrl", value)}
              onClearImport={() => updateAsset("footerImageDataUrl", "")}
              onWidthChange={undefined}
              onUpload={(file) => handleUpload("footerImageDataUrl", file)}
              placeholder="https://example.com/footer-marina.jpg"
              value={settings.assets.footerImageUrl}
            />
          </div>
          </SettingsCard>

          <SettingsCard
            description="Add or remove header image sections. Each section can include optional text under the image."
            title="Header Sections"
          >
            <HeaderSectionsEditor
              addHeaderSection={addHeaderSection}
              removeHeaderSection={removeHeaderSection}
              sections={settings.assets.headerSections}
              updateHeaderSection={updateHeaderSection}
            />
          </SettingsCard>

          <SettingsCard
            description="These control where the email buttons send customers."
            title="Button Links"
          >
          <div className="grid gap-5">
            <TextField
              label="New Inventory button URL"
              onChange={(value) => updateAsset("newInventoryUrl", value)}
              placeholder="https://winnisquammarine.com/new-inventory/"
              value={settings.assets.newInventoryUrl}
            />
            <TextField
              label="Pre-Owned Inventory button URL"
              onChange={(value) => updateAsset("preOwnedInventoryUrl", value)}
              placeholder="https://winnisquammarine.com/pre-owned-inventory/"
              value={settings.assets.preOwnedInventoryUrl}
            />
            <TextField
              label="Clearance Deals button URL"
              onChange={(value) => updateAsset("clearanceDealsUrl", value)}
              placeholder="https://winnisquammarine.com/clearance/"
              value={settings.assets.clearanceDealsUrl}
            />
            <TextField
              label="Contact button URL"
              onChange={(value) => updateAsset("contactUrl", value)}
              placeholder="https://winnisquammarine.com/contact/"
              value={settings.assets.contactUrl}
            />
          </div>
          </SettingsCard>

          <SettingsCard
            description="Adjust the spacing around the top row of email buttons."
            title="Top Button Spacing"
          >
          <div className="grid gap-5 md:grid-cols-2">
            <NumberField
              label="Top buttons space above"
              max={60}
              min={0}
              onChange={(value) => updateAsset("topButtonPaddingTop", value)}
              value={settings.assets.topButtonPaddingTop}
            />
            <NumberField
              label="Top buttons space below"
              max={60}
              min={0}
              onChange={(value) => updateAsset("topButtonPaddingBottom", value)}
              value={settings.assets.topButtonPaddingBottom}
            />
          </div>
          </SettingsCard>

          <NextStepLink href="/campaign/new/preview" label="Continue to preview" />
        </section>

        <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Selected boats</h2>
          <p className="mt-1 text-sm text-slate-500">
            The final email uses selected order and only title, price, LOA, Beam, Engine, and details link.
          </p>
          <div className="mt-4 space-y-3">
            {selectedBoats.length ? (
              selectedBoats.map((boat, index) => (
                <div className="rounded-md border border-slate-200 p-3" key={boat.id}>
                  <p className="text-xs font-semibold text-slate-400">#{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{boat.displayTitle ?? boat.title}</p>
                  <p className="mt-1 text-sm font-bold text-red-700">
                    {boat.priceLabel ?? "Call for clearance price"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No boats selected yet.{" "}
                <Link className="font-semibold text-harbor hover:underline" href="/campaign/new/boats">
                  Select boats
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </StepShell>
  );
}

function HeaderSectionsEditor({
  addHeaderSection,
  removeHeaderSection,
  sections,
  updateHeaderSection,
}: {
  addHeaderSection: () => void;
  removeHeaderSection: (sectionId: string) => void;
  sections: HeaderSection[];
  updateHeaderSection: <K extends keyof HeaderSection>(
    sectionId: string,
    field: K,
    value: HeaderSection[K]
  ) => void;
}) {
  function handleSectionUpload(sectionId: string, file?: File) {
    if (!file) {
      updateHeaderSection(sectionId, "imageDataUrl", "");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateHeaderSection(sectionId, "imageDataUrl", String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="rounded-md border border-harbor bg-white px-3 py-2 text-sm font-semibold text-harbor hover:bg-harbor hover:text-white"
          onClick={addHeaderSection}
          type="button"
        >
          + Add section
        </button>
      </div>

      {sections.map((section, index) => {
        return (
          <div className="rounded-md border border-slate-200 p-4" key={section.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-base font-semibold text-ink">Header section {index + 1}</h3>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  onClick={addHeaderSection}
                  type="button"
                >
                  +
                </button>
                <button
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
                  disabled={sections.length === 1}
                  onClick={() => removeHeaderSection(section.id)}
                  type="button"
                >
                  -
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <ImageAssetField
                importedPreviewUrl={section.imageDataUrl}
                label="Section image"
                onChange={(value) => updateHeaderSection(section.id, "imageUrl", value)}
                onClearImport={() => updateHeaderSection(section.id, "imageDataUrl", "")}
                onWidthChange={(value) => updateHeaderSection(section.id, "imageWidth", value)}
                onUpload={(file) => handleSectionUpload(section.id, file)}
                placeholder="https://example.com/header-section.jpg"
                value={section.imageUrl}
                width={section.imageWidth}
              />

              <TextArea
                label="Optional text below image"
                onChange={(value) => updateHeaderSection(section.id, "text", value)}
                value={section.text}
              />
            </div>
          </div>
        );
      })}
    </div>
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

function NumberField({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function ImageAssetField({
  importedPreviewUrl,
  label,
  onChange,
  onClearImport,
  onWidthChange,
  onUpload,
  placeholder,
  value,
  width,
}: {
  importedPreviewUrl?: string;
  label: string;
  onChange: (value: string) => void;
  onClearImport: () => void;
  onWidthChange?: (value: number) => void;
  onUpload: (file?: File) => void;
  placeholder: string;
  value: string;
  width?: number;
}) {
  const previewUrl = value || importedPreviewUrl;

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <TextField
        label={`${label} URL`}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
      {onWidthChange && width ? (
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_110px] md:items-end">
          <label>
            <span className="text-sm font-medium text-slate-700">Image width</span>
            <input
              className="mt-2 w-full accent-harbor"
              max={600}
              min={180}
              onChange={(event) => onWidthChange(Number(event.target.value))}
              step={10}
              type="range"
              value={width}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-700">Pixels</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
              max={600}
              min={180}
              onChange={(event) => onWidthChange(Number(event.target.value))}
              type="number"
              value={width}
            />
          </label>
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          accept="image/*"
          className="text-sm text-slate-600"
          onChange={(event) => onUpload(event.target.files?.[0])}
          type="file"
        />
        {importedPreviewUrl ? (
          <span className="text-xs font-semibold text-amber-700">
            Imported image is saved for preview. Use a public URL before sending.
          </span>
        ) : null}
        {importedPreviewUrl ? (
          <button
            className="text-xs font-semibold text-slate-600 underline"
            onClick={onClearImport}
            type="button"
          >
            Clear imported image
          </button>
        ) : null}
      </div>
      {previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={`${label} preview`} className="max-h-36 w-auto max-w-full" src={previewUrl} />
        </div>
      ) : null}
    </div>
  );
}
