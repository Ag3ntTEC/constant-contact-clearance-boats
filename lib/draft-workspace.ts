import { saveCampaignSettings } from "./saved-settings";
import type { Boat, CampaignSettings } from "./types";

export const DRAFT_WORKSPACE_STORAGE_KEY = "constant-contact-clearance-boats:draft";
export const DRAFT_RESTORE_NOTICE_KEY = "constant-contact-clearance-boats:draft-restore-notice";

export type StoredDraftWorkspace = {
  selectedBoats?: Boat[];
  settings?: Partial<CampaignSettings>;
  sourceDraftId?: string;
};

export function loadDraftWorkspace(): StoredDraftWorkspace | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DRAFT_WORKSPACE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredDraftWorkspace;
  } catch {
    window.localStorage.removeItem(DRAFT_WORKSPACE_STORAGE_KEY);
    return null;
  }
}

export function saveDraftWorkspace(workspace: StoredDraftWorkspace) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

export function replaceDraftWorkspaceFromHistory({
  notice,
  selectedBoats,
  settings,
  sourceDraftId,
}: {
  notice: string;
  selectedBoats: Boat[];
  settings: CampaignSettings;
  sourceDraftId: string;
}) {
  if (typeof window === "undefined") return;

  saveCampaignSettings(settings);
  saveDraftWorkspace({ selectedBoats, settings, sourceDraftId });
  window.sessionStorage.setItem(DRAFT_RESTORE_NOTICE_KEY, notice);
}

export function consumeDraftRestoreNotice() {
  if (typeof window === "undefined") return null;
  const notice = window.sessionStorage.getItem(DRAFT_RESTORE_NOTICE_KEY);
  window.sessionStorage.removeItem(DRAFT_RESTORE_NOTICE_KEY);
  return notice;
}
