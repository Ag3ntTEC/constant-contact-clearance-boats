import type { CampaignSettings } from "./types";

export const HEADER_IMAGE_HISTORY_STORAGE_KEY = "clearanceHeaderImageHistory:v1";
const MAX_HISTORY_ENTRIES = 200;

export type HeaderImageHistoryEntry = {
  id: string;
  campaignName: string;
  campaignId?: string;
  imageUrl: string;
  imageWidth: number;
  usedAt: string;
};

type DraftHistoryMetadata = {
  campaignId?: string;
};

export function loadHeaderImageHistory(): HeaderImageHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(HEADER_IMAGE_HISTORY_STORAGE_KEY) ?? "[]"
    ) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isHeaderImageHistoryEntry)
      .sort((left, right) => right.usedAt.localeCompare(left.usedAt))
      .slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function recordHeaderImageHistory(
  settings: CampaignSettings,
  metadata: DraftHistoryMetadata = {}
) {
  if (typeof window === "undefined") return;

  const uniqueImages = new Map<string, number>();
  for (const section of settings.assets.headerSections) {
    const imageUrl = normalizePublicImageUrl(section.imageUrl);
    if (imageUrl) uniqueImages.set(imageUrl, section.imageWidth);
  }

  if (!uniqueImages.size) return;

  const usedAt = new Date().toISOString();
  const newEntries = [...uniqueImages].map(([imageUrl, imageWidth]) => ({
    id: createHistoryId(),
    campaignName: settings.name.trim() || "Untitled campaign",
    campaignId: metadata.campaignId,
    imageUrl,
    imageWidth,
    usedAt,
  }));
  const existingEntries = loadHeaderImageHistory().filter(
    (entry) =>
      !newEntries.some(
        (newEntry) =>
          newEntry.campaignId &&
          newEntry.campaignId === entry.campaignId &&
          newEntry.imageUrl === entry.imageUrl
      )
  );

  window.localStorage.setItem(
    HEADER_IMAGE_HISTORY_STORAGE_KEY,
    JSON.stringify([...newEntries, ...existingEntries].slice(0, MAX_HISTORY_ENTRIES))
  );
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

function isHeaderImageHistoryEntry(value: unknown): value is HeaderImageHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HeaderImageHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.campaignName === "string" &&
    typeof entry.imageUrl === "string" &&
    typeof entry.imageWidth === "number" &&
    typeof entry.usedAt === "string"
  );
}
