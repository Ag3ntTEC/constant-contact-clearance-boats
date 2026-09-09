import { isHeaderImageHistoryEntry } from "./history-data";
import type { HeaderImageHistoryEntry } from "./history-types";

export type { HeaderImageHistoryEntry } from "./history-types";

const LEGACY_STORAGE_KEY = "clearanceHeaderImageHistory:v1";

export async function loadHeaderImageHistory(): Promise<HeaderImageHistoryEntry[]> {
  await migrateLegacyHeaderImageHistory();

  const response = await fetch("/api/history/images", { cache: "no-store" });
  const data = (await response.json()) as {
    entries?: HeaderImageHistoryEntry[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to load shared image history.");
  }

  return Array.isArray(data.entries) ? data.entries : [];
}

async function migrateLegacyHeaderImageHistory() {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const entries = Array.isArray(parsed) ? parsed.filter(isHeaderImageHistoryEntry) : [];

    if (!entries.length) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const response = await fetch("/api/history/images", {
      body: JSON.stringify({ entries: entries.slice(0, 200) }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (response.ok) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Keep the browser copy intact so a later visit can retry the migration.
  }
}
