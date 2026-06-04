import type { CampaignSettings, EmailAssets } from "./types";

export const SETTINGS_STORAGE_KEY = "clearanceBoatCampaignSettings";

type SavedSettingsSnapshot = Partial<Omit<CampaignSettings, "assets">> & {
  assets?: Partial<EmailAssets>;
};

export function loadSavedCampaignSettings(defaults: CampaignSettings): CampaignSettings {
  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as SavedSettingsSnapshot;

    return {
      ...defaults,
      ...parsed,
      assets: {
        ...defaults.assets,
        ...(parsed.assets ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

export function saveCampaignSettings(settings: CampaignSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const publicAssets: Partial<EmailAssets> = { ...settings.assets };

  delete publicAssets.topBannerImageDataUrl;
  delete publicAssets.heroImageDataUrl;
  delete publicAssets.footerImageDataUrl;

  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...settings,
      assets: publicAssets,
    })
  );
}

export function clearSavedCampaignSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
}

export function hasSavedCampaignSettings(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
}
