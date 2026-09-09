import type { Boat, CampaignSettings } from "./types";

export type HeaderImageHistoryEntry = {
  id: string;
  campaignName: string;
  campaignId?: string;
  imageUrl: string;
  imageWidth: number;
  usedAt: string;
};

export type DraftHistoryEntry = {
  id: string;
  campaignId?: string;
  campaignActivityId?: string;
  createdAt: string;
  sourceDraftId?: string;
  settings: CampaignSettings;
  selectedBoats: Boat[];
  updatedAt: string;
  version: 1;
};

export type DraftHistorySummary = Pick<
  DraftHistoryEntry,
  "campaignActivityId" | "campaignId" | "createdAt" | "id" | "sourceDraftId" | "updatedAt"
> & {
  boatCount: number;
  boatNames: string[];
  campaignName: string;
  subject: string;
};

export type ReconciledDraftHistoryEntry = DraftHistoryEntry & {
  inventorySource: "fallback" | "live";
  reconciliationWarning?: string;
  refreshedBoatCount: number;
  removedBoats: Array<{ id: string; name: string }>;
};
