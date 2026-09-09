import type { Boat, CampaignSettings, EmailAssets } from "./types";
import type {
  DraftHistoryEntry,
  DraftHistorySummary,
  HeaderImageHistoryEntry,
} from "./history-types";

export function createDraftHistoryEntry({
  campaignActivityId,
  campaignId,
  id,
  selectedBoats,
  settings,
  sourceDraftId,
}: {
  campaignActivityId?: string;
  campaignId?: string;
  id: string;
  selectedBoats: Boat[];
  settings: CampaignSettings;
  sourceDraftId?: string;
}): DraftHistoryEntry {
  const timestamp = new Date().toISOString();

  return {
    id,
    campaignActivityId,
    campaignId,
    createdAt: timestamp,
    sourceDraftId,
    settings: sanitizeCampaignSettings(settings),
    selectedBoats: selectedBoats.map(sanitizeBoat),
    updatedAt: timestamp,
    version: 1,
  };
}

export function createHeaderImageHistoryEntries(
  settings: CampaignSettings,
  metadata: { campaignId?: string; usedAt?: string } = {}
): HeaderImageHistoryEntry[] {
  const uniqueImages = new Map<string, number>();

  for (const section of settings.assets.headerSections) {
    const imageUrl = normalizePublicImageUrl(section.imageUrl);
    if (imageUrl) uniqueImages.set(imageUrl, section.imageWidth);
  }

  const usedAt = metadata.usedAt ?? new Date().toISOString();

  return [...uniqueImages].map(([imageUrl, imageWidth]) => ({
    id: createHistoryId(),
    campaignName: settings.name.trim() || "Untitled campaign",
    campaignId: metadata.campaignId,
    imageUrl,
    imageWidth,
    usedAt,
  }));
}

export function summarizeDraft(entry: DraftHistoryEntry): DraftHistorySummary {
  return {
    id: entry.id,
    boatCount: entry.selectedBoats.length,
    boatNames: entry.selectedBoats.map((boat) => boat.displayTitle ?? boat.title),
    campaignActivityId: entry.campaignActivityId,
    campaignId: entry.campaignId,
    campaignName: entry.settings.name,
    createdAt: entry.createdAt,
    sourceDraftId: entry.sourceDraftId,
    subject: entry.settings.subject,
    updatedAt: entry.updatedAt,
  };
}

export function sanitizeCampaignSettings(settings: CampaignSettings): CampaignSettings {
  const assets: EmailAssets = {
    ...settings.assets,
    topBannerImageDataUrl: undefined,
    heroImageDataUrl: undefined,
    footerImageDataUrl: undefined,
    headerSections: settings.assets.headerSections.map((section) => ({
      ...section,
      imageDataUrl: undefined,
      blocks: section.blocks.map((block) => ({ ...block })),
    })),
    featuredListing: {
      ...settings.assets.featuredListing,
      imageDataUrl: undefined,
      galleryImageUrls: [...settings.assets.featuredListing.galleryImageUrls],
    },
  };

  return {
    ...settings,
    assets,
  };
}

export function sanitizeBoat(boat: Boat): Boat {
  const { rawFields: _rawFields, ...publicBoat } = boat;

  return {
    ...publicBoat,
    pictures: [...(boat.pictures ?? [])],
  };
}

export function isDraftHistoryEntry(value: unknown): value is DraftHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<DraftHistoryEntry>;

  return (
    entry.version === 1 &&
    typeof entry.id === "string" &&
    isValidHistoryId(entry.id) &&
    typeof entry.createdAt === "string" &&
    Number.isFinite(Date.parse(entry.createdAt)) &&
    typeof entry.updatedAt === "string" &&
    Number.isFinite(Date.parse(entry.updatedAt)) &&
    Boolean(entry.settings && typeof entry.settings === "object") &&
    Array.isArray(entry.selectedBoats)
  );
}

export function isHeaderImageHistoryEntry(value: unknown): value is HeaderImageHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HeaderImageHistoryEntry>;

  return (
    typeof entry.id === "string" &&
    isValidHistoryId(entry.id) &&
    typeof entry.campaignName === "string" &&
    typeof entry.imageUrl === "string" &&
    typeof entry.imageWidth === "number" &&
    Number.isFinite(entry.imageWidth) &&
    typeof entry.usedAt === "string" &&
    Number.isFinite(Date.parse(entry.usedAt)) &&
    Boolean(normalizePublicImageUrl(entry.imageUrl))
  );
}

export function isValidHistoryId(value: string) {
  return /^[a-zA-Z0-9-]{1,128}$/.test(value);
}

function normalizePublicImageUrl(value: string): string | null {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function createHistoryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `header-image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
