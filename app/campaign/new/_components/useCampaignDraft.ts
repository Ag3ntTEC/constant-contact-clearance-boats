"use client";

import { useEffect, useMemo, useState } from "react";
import type { Boat, CampaignSettings, EmailAssets } from "@/lib/types";
import {
  clearSavedCampaignSettings,
  hasSavedCampaignSettings,
  loadSavedCampaignSettings,
  saveCampaignSettings,
} from "@/lib/saved-settings";

export const storageKey = "constant-contact-clearance-boats:draft";

export const minimumBoats = 7;
export const maximumBoats = 10;

export const defaultEmailAssets: EmailAssets = {
  topBannerImageUrl: "",
  topBannerImageDataUrl: "",
  topBannerImageWidth: 520,
  heroImageUrl: "",
  heroImageDataUrl: "",
  heroImageWidth: 520,
  footerImageUrl: "",
  footerImageDataUrl: "",
  newInventoryUrl: "https://winnisquammarine.com/new-inventory/",
  preOwnedInventoryUrl: "https://winnisquammarine.com/pre-owned-inventory/",
  clearanceDealsUrl: "https://winnisquammarine.com/clearance/",
  topButtonPaddingTop: 12,
  topButtonPaddingBottom: 12,
  contactUrl: "https://winnisquammarine.com/contact/",
  footerHeading: "Visit Your Boating Team",
  footerBusinessName: "Winnisquam Marine",
  footerSubtext: "Call/Text 603-524-8380",
  contactButtonLabel: "Contact",
  clearanceHeadingText: "CLEARANCE",
  priceLabelText: "Clearance Price",
};

export const defaultCampaignSettings: CampaignSettings = {
  name: "Clearance Boat Event",
  subject: "Clearance boats ready for the water",
  preheader: "Browse hand-picked clearance boats available now.",
  fromName: "Winnisquam Marine",
  fromEmail: "boatsales@winnisquammarine.com",
  replyToEmail: "boatsales@winnisquammarine.com",
  assets: defaultEmailAssets,
};

type StoredDraft = {
  selectedBoats: Boat[];
};

type StoredDraftSnapshot = {
  settings?: Partial<CampaignSettings> & {
    assets?: Partial<EmailAssets>;
  };
  selectedBoats?: Boat[];
};

function mergeCampaignSettings(
  defaults: CampaignSettings,
  saved: StoredDraftSnapshot["settings"]
): CampaignSettings {
  return {
    ...defaults,
    ...(saved ?? {}),
    assets: {
      ...defaults.assets,
      ...(saved?.assets ?? {}),
    },
  };
}

export function useCampaignDraft() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [settings, setSettings] = useState<CampaignSettings>(defaultCampaignSettings);
  const [settingsStatus, setSettingsStatus] = useState("Settings saved automatically");
  const [selectedBoats, setSelectedBoats] = useState<Boat[]>([]);

  useEffect(() => {
    const hadSavedSettings = hasSavedCampaignSettings();
    let nextSettings = loadSavedCampaignSettings(defaultCampaignSettings);
    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredDraftSnapshot;
        if (!hadSavedSettings && parsed.settings) {
          nextSettings = mergeCampaignSettings(defaultCampaignSettings, parsed.settings);
        }
        setSelectedBoats(parsed.selectedBoats ?? []);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setSettings(nextSettings);
    setSettingsStatus(hadSavedSettings ? "Loaded saved settings" : "Settings saved automatically");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const stored: StoredDraft = {
      selectedBoats,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  }, [isHydrated, selectedBoats]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveCampaignSettings(settings);
    setSettingsStatus("Settings saved automatically");
  }, [isHydrated, settings]);

  const selectedBoatIds = useMemo(
    () => new Set(selectedBoats.map((boat) => boat.id)),
    [selectedBoats]
  );
  const canCreateCampaign =
    selectedBoats.length >= minimumBoats && selectedBoats.length <= maximumBoats;
  const selectionMessage =
    selectedBoats.length < minimumBoats
      ? `Select ${minimumBoats - selectedBoats.length} more boats.`
      : selectedBoats.length > maximumBoats
        ? `Remove ${selectedBoats.length - maximumBoats} boats.`
        : "Selection is ready.";

  function updateSetting<K extends keyof CampaignSettings>(
    field: K,
    value: CampaignSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateAsset<K extends keyof EmailAssets>(field: K, value: EmailAssets[K]) {
    setSettings((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [field]: value,
      },
    }));
  }

  function toggleBoat(boat: Boat) {
    setSelectedBoats((current) => {
      if (current.some((selected) => selected.id === boat.id)) {
        return current.filter((selected) => selected.id !== boat.id);
      }

      if (current.length >= maximumBoats) {
        return current;
      }

      return [...current, boat];
    });
  }

  function removeBoat(boatId: string) {
    setSelectedBoats((current) => current.filter((boat) => boat.id !== boatId));
  }

  function moveBoat(boatId: string, direction: "up" | "down") {
    setSelectedBoats((current) => {
      const index = current.findIndex((boat) => boat.id === boatId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [boat] = next.splice(index, 1);
      next.splice(targetIndex, 0, boat);

      return next;
    });
  }

  function resetDraft() {
    setSettings(defaultCampaignSettings);
    setSelectedBoats([]);
    window.localStorage.removeItem(storageKey);
  }

  function resetSavedSettings() {
    const confirmed = window.confirm(
      "Reset saved settings? This keeps your selected boats, but restores the campaign/template settings to defaults."
    );

    if (!confirmed) {
      return;
    }

    clearSavedCampaignSettings();
    setSettings(defaultCampaignSettings);
    setSettingsStatus("Settings reset to defaults");
  }

  function clearSelectedBoats() {
    setSelectedBoats([]);

    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as StoredDraftSnapshot;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          selectedBoats: [],
        })
      );
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }

  return {
    canCreateCampaign,
    clearSelectedBoats,
    isHydrated,
    maximumBoats,
    minimumBoats,
    resetDraft,
    resetSavedSettings,
    removeBoat,
    moveBoat,
    selectedBoatIds,
    selectedBoats,
    selectionMessage,
    settings,
    settingsStatus,
    toggleBoat,
    updateAsset,
    updateSetting,
  };
}
