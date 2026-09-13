"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Boat,
  FeaturedListingSettings,
  HeaderContentBlock,
  HeaderSection,
} from "@/lib/types";
import { normalizeHistoryImageUrl } from "@/lib/history-data";
import { HeaderImageHistoryModal } from "./HeaderImageHistoryModal";
import { RichTextEditor, TextField } from "./FormControls";
import type { useCampaignDraft } from "./useCampaignDraft";

type DraftControls = ReturnType<typeof useCampaignDraft>;
type ImageHistoryTarget = { kind: "main" | "gallery"; sectionId: string };

export function CampaignContentEditor({ draft }: { draft: DraftControls }) {
  const [imageHistoryTarget, setImageHistoryTarget] = useState<ImageHistoryTarget | null>(null);
  const { assets } = draft.settings;

  return (
    <aside className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[var(--surface-shadow)]">
      <div className="border-b border-slate-200 bg-ink px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Editor tools</p>
        <h2 className="mt-1 text-xl font-bold">Campaign content</h2>
        <p className="mt-1 text-sm text-slate-300">
          Configure the header and below-boats blocks, then format text in the preview.
        </p>
      </div>

      <div className="max-h-[calc(100vh-235px)] space-y-4 overflow-y-auto p-4">
        <EditorGroup summary="Header" open>
          <ImageUrlField
            label="Top banner"
            onChange={(value) => draft.updateAsset("topBannerImageUrl", value)}
            value={assets.topBannerImageUrl}
          />

          <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
            <ModeButton
              active={!assets.featuredListing.enabled}
              label="Default header"
              onClick={() => draft.updateFeaturedListing("enabled", false)}
            />
            <ModeButton
              active={assets.featuredListing.enabled}
              label="Featured listing"
              onClick={() => draft.updateFeaturedListing("enabled", true)}
            />
          </div>

          {assets.featuredListing.enabled ? (
            <FeaturedEditor
              listing={assets.featuredListing}
              selectedBoats={draft.selectedBoats}
              update={draft.updateFeaturedListing}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">Stack one or more header sections.</p>
                <SmallButton onClick={draft.addHeaderSection}>+ Section</SmallButton>
              </div>
              {assets.headerSections.map((section, index) => (
                <DefaultHeaderSection
                  addBlock={draft.addHeaderBlock}
                  canRemove={assets.headerSections.length > 1}
                  index={index}
                  key={section.id}
                  moveBlock={draft.moveHeaderBlock}
                  onGalleryHistory={() => setImageHistoryTarget({ kind: "gallery", sectionId: section.id })}
                  onMainImageHistory={() => setImageHistoryTarget({ kind: "main", sectionId: section.id })}
                  removeBlock={draft.removeHeaderBlock}
                  removeSection={draft.removeHeaderSection}
                  section={section}
                  updateBlock={draft.updateHeaderBlock}
                  updateSection={draft.updateHeaderSection}
                />
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            <p className="mb-3 text-sm font-semibold text-ink">Header navigation links</p>
            <div className="space-y-3">
              <TextField label="New Inventory URL" onChange={(value) => draft.updateAsset("newInventoryUrl", value)} placeholder="https://..." value={assets.newInventoryUrl} />
              <TextField label="Pre-Owned Inventory URL" onChange={(value) => draft.updateAsset("preOwnedInventoryUrl", value)} placeholder="https://..." value={assets.preOwnedInventoryUrl} />
              <TextField label="Clearance Deals URL" onChange={(value) => draft.updateAsset("clearanceDealsUrl", value)} placeholder="https://..." value={assets.clearanceDealsUrl} />
            </div>
          </div>
        </EditorGroup>

        <EditorGroup summary="Below-boats content" open>
          <p className="text-sm text-slate-600">
            These blocks appear immediately below the selected boats, before the standard footer.
          </p>
          <ContentBlocksEditor
            addBlock={draft.addFooterBlock}
            blocks={assets.footerBlocks}
            moveBlock={draft.moveFooterBlock}
            removeBlock={draft.removeFooterBlock}
            updateBlock={draft.updateFooterBlock}
          />
        </EditorGroup>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>{draft.settingsStatus}</p>
          <button className="mt-3 font-semibold text-red-700 hover:underline" onClick={draft.resetSavedSettings} type="button">
            Reset saved settings
          </button>
        </div>
      </div>

      {imageHistoryTarget ? (
        <HeaderImageHistoryModal
          onClose={() => setImageHistoryTarget(null)}
          onSelect={(entry) => {
            if (imageHistoryTarget.kind === "gallery") {
              const section = assets.headerSections.find((item) => item.id === imageHistoryTarget.sectionId);
              draft.updateHeaderSection(
                imageHistoryTarget.sectionId,
                "galleryImageUrls",
                dedupeImageUrls([...(section?.galleryImageUrls ?? []), entry.imageUrl]),
              );
            } else {
              draft.updateHeaderSection(imageHistoryTarget.sectionId, "imageUrl", entry.imageUrl);
              draft.updateHeaderSection(imageHistoryTarget.sectionId, "imageDataUrl", "");
              draft.updateHeaderSection(imageHistoryTarget.sectionId, "imageWidth", entry.imageWidth);
            }
            setImageHistoryTarget(null);
          }}
        />
      ) : null}
    </aside>
  );
}

function EditorGroup({ children, open, summary }: { children: ReactNode; open?: boolean; summary: string }) {
  return (
    <details className="group rounded-md border border-slate-200 bg-white" open={open}>
      <summary className="cursor-pointer list-none px-4 py-3 text-base font-bold text-ink marker:hidden">
        <span className="flex items-center justify-between">
          {summary}
          <span className="text-harbor transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-200 p-4">{children}</div>
    </details>
  );
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={`rounded px-3 py-2 text-sm font-semibold ${active ? "bg-white text-ink shadow-sm" : "text-slate-600"}`} onClick={onClick} type="button">{label}</button>;
}

function SmallButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="rounded border border-harbor bg-white px-2.5 py-1.5 text-xs font-semibold text-harbor hover:bg-harbor hover:text-white" onClick={onClick} type="button">{children}</button>;
}

function ImageUrlField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <div>
      <TextField label={`${label} image URL`} onChange={onChange} placeholder="https://example.com/image.jpg" value={value} />
      {value ? <img alt={`${label} preview`} className="mt-2 max-h-28 w-auto max-w-full rounded border border-slate-200 object-cover" src={value} /> : null}
    </div>
  );
}

function DefaultHeaderSection({
  addBlock, canRemove, index, moveBlock, onGalleryHistory, onMainImageHistory, removeBlock,
  removeSection, section, updateBlock, updateSection,
}: {
  addBlock: DraftControls["addHeaderBlock"];
  canRemove: boolean;
  index: number;
  moveBlock: DraftControls["moveHeaderBlock"];
  onGalleryHistory: () => void;
  onMainImageHistory: () => void;
  removeBlock: DraftControls["removeHeaderBlock"];
  removeSection: DraftControls["removeHeaderSection"];
  section: HeaderSection;
  updateBlock: DraftControls["updateHeaderBlock"];
  updateSection: DraftControls["updateHeaderSection"];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">Header section {index + 1}</p>
        <div className="flex gap-2">
          <SmallButton onClick={onMainImageHistory}>History</SmallButton>
          <button className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-40" disabled={!canRemove} onClick={() => removeSection(section.id)} type="button">Remove</button>
        </div>
      </div>
      <ImageUrlField label="Main" onChange={(value) => updateSection(section.id, "imageUrl", value)} value={section.imageUrl} />
      <label className="mt-3 block text-sm font-medium text-slate-700">
        Image width: {section.imageWidth}px
        <input className="mt-2 w-full accent-harbor" max={600} min={180} onChange={(event) => updateSection(section.id, "imageWidth", Number(event.target.value))} step={10} type="range" value={section.imageWidth} />
      </label>
      <GalleryPicker
        label="Optional header gallery"
        onChange={(urls) => updateSection(section.id, "galleryImageUrls", dedupeImageUrls(urls))}
        onOpenHistory={onGalleryHistory}
        selected={section.galleryImageUrls}
      />
      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="mb-3 text-sm font-semibold text-ink">Content below image</p>
        <ContentBlocksEditor
          addBlock={(type) => addBlock(section.id, type)}
          blocks={section.blocks}
          moveBlock={(blockId, direction) => moveBlock(section.id, blockId, direction)}
          removeBlock={(blockId) => removeBlock(section.id, blockId)}
          updateBlock={(blockId, updates) => updateBlock(section.id, blockId, updates)}
        />
      </div>
    </div>
  );
}

function FeaturedEditor({ listing, selectedBoats, update }: {
  listing: FeaturedListingSettings;
  selectedBoats: Boat[];
  update: DraftControls["updateFeaturedListing"];
}) {
  const boat = selectedBoats.find((item) => item.id === listing.boatId) ?? selectedBoats[0] ?? null;
  const images = useMemo(() => getBoatImages(boat), [boat]);

  function selectBoat(boatId: string) {
    update("boatId", boatId);
    update("galleryImageUrls", []);
    const selected = selectedBoats.find((item) => item.id === boatId);
    if (!selected) return;
    update("imageUrl", selected.primaryImageUrl || selected.imageUrl || "");
    update("title", selected.displayTitle || selected.title);
    update("specs", buildSpecs(selected));
    update("fullListingUrl", selected.webLink || selected.detailUrl || "");
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">Featured boat
        <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => selectBoat(event.target.value)} value={listing.boatId}>
          <option value="">Use first selected boat</option>
          {selectedBoats.map((item) => <option key={item.id} value={item.id}>{item.displayTitle ?? item.title}</option>)}
        </select>
      </label>
      <ImageUrlField label="Featured" onChange={(value) => update("imageUrl", value)} value={listing.imageUrl} />
      <GalleryPicker imageOptions={images} label="Featured boat gallery" onChange={(urls) => update("galleryImageUrls", urls)} selected={listing.galleryImageUrls} />
      <RichTextEditor compact label="Featured label" onChange={(value) => update("label", value)} value={listing.label} />
      <RichTextEditor compact label="Headline" onChange={(value) => update("headline", value)} value={listing.headline} />
      <RichTextEditor compact label="Title" onChange={(value) => update("title", value)} value={listing.title} />
      <RichTextEditor label="Description" onChange={(value) => update("body", value)} value={listing.body} />
      <RichTextEditor compact label="Specs" onChange={(value) => update("specs", value)} value={listing.specs} />
      <TextField label="Full listing URL" onChange={(value) => update("fullListingUrl", value)} placeholder="https://..." value={listing.fullListingUrl} />
      <TextField label="Budget boats URL" onChange={(value) => update("budgetBoatsUrl", value)} placeholder="https://..." value={listing.budgetBoatsUrl} />
      <TextField label="Schedule viewing URL" onChange={(value) => update("scheduleViewingUrl", value)} placeholder="https://..." value={listing.scheduleViewingUrl} />
    </div>
  );
}

function GalleryPicker({ imageOptions = [], label, onChange, onOpenHistory, selected }: {
  imageOptions?: string[];
  label: string;
  onChange: (urls: string[]) => void;
  onOpenHistory?: () => void;
  selected: string[];
}) {
  const [customUrl, setCustomUrl] = useState("");
  const options = dedupeImageUrls([...selected, ...imageOptions]);

  function toggle(url: string) {
    const normalized = normalizeHistoryImageUrl(url);
    if (!normalized) return;
    const isSelected = selected.some((item) => normalizeHistoryImageUrl(item) === normalized);
    onChange(isSelected
      ? selected.filter((item) => normalizeHistoryImageUrl(item) !== normalized)
      : dedupeImageUrls([...selected, normalized]));
  }

  function addCustom() {
    const value = normalizeHistoryImageUrl(customUrl);
    if (!value) return;
    onChange(dedupeImageUrls([...selected, value]));
    setCustomUrl("");
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className="text-xs text-slate-500">{selected.length} selected</span>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs" onChange={(event) => setCustomUrl(event.target.value)} placeholder="Add image URL" value={customUrl} />
        <SmallButton onClick={addCustom}>Add</SmallButton>
        {onOpenHistory ? <SmallButton onClick={onOpenHistory}>Image history</SmallButton> : null}
      </div>
      {options.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {options.map((url, index) => (
            <label className={`cursor-pointer rounded border p-1 ${selected.some((item) => normalizeHistoryImageUrl(item) === url) ? "border-harbor ring-2 ring-harbor/20" : "border-slate-200"}`} key={url}>
              <input checked={selected.some((item) => normalizeHistoryImageUrl(item) === url)} className="sr-only" onChange={() => toggle(url)} type="checkbox" />
              <img alt={`Gallery option ${index + 1}`} className="aspect-square w-full rounded object-cover" src={url} />
            </label>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">{onOpenHistory ? "Add an image URL or choose one from image history." : "Select a featured boat with pictures."}</p>}
    </div>
  );
}

function ContentBlocksEditor({ addBlock, blocks, moveBlock, removeBlock, updateBlock }: {
  addBlock: (type: HeaderContentBlock["type"]) => void;
  blocks: HeaderContentBlock[];
  moveBlock: (blockId: string, direction: "up" | "down") => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<HeaderContentBlock>) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2"><SmallButton onClick={() => addBlock("text")}>+ Text</SmallButton><SmallButton onClick={() => addBlock("button")}>+ Button</SmallButton></div>
      <div className="mt-3 space-y-3">
        {blocks.map((block, index) => (
          <div className="rounded border border-slate-200 bg-slate-50 p-3" key={block.id}>
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase text-slate-500">{block.type} {index + 1}</span><div className="flex gap-1">
              <button disabled={index === 0} onClick={() => moveBlock(block.id, "up")} type="button">↑</button>
              <button disabled={index === blocks.length - 1} onClick={() => moveBlock(block.id, "down")} type="button">↓</button>
              <button className="text-red-700" onClick={() => removeBlock(block.id)} type="button">×</button>
            </div></div>
            {block.type === "text" ? <RichTextEditor compact label="Text" onChange={(content) => updateBlock(block.id, { content })} value={block.content} /> : <div className="space-y-2"><TextField label="Button text" onChange={(label) => updateBlock(block.id, { label })} placeholder="Shop now" value={block.label} /><TextField label="Button URL" onChange={(href) => updateBlock(block.id, { href })} placeholder="https://..." value={block.href} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function getBoatImages(boat: Boat | null): string[] {
  return boat ? Array.from(new Set([boat.primaryImageUrl, boat.imageUrl, ...(boat.pictures ?? [])].filter(Boolean))) as string[] : [];
}

function dedupeImageUrls(urls: string[]): string[] {
  return Array.from(new Set(urls.map(normalizeHistoryImageUrl).filter((url): url is string => Boolean(url))));
}

function buildSpecs(boat: Boat): string {
  return [boat.formattedLoa ? `LOA ${boat.formattedLoa}` : undefined, boat.formattedBeam ? `Beam ${boat.formattedBeam}` : undefined, boat.engineDisplay ? `Power ${boat.engineDisplay}` : boat.engine].filter(Boolean).join(" | ");
}
