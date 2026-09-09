"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Boat,
  CampaignSettings,
  EmailAssets,
  FeaturedListingSettings,
  HeaderContentBlock,
  HeaderSection,
} from "@/lib/types";
import {
  clearSavedCampaignSettings,
  hasSavedCampaignSettings,
  loadSavedCampaignSettings,
  saveCampaignSettings,
} from "@/lib/saved-settings";
import {
  consumeDraftRestoreNotice,
  DRAFT_WORKSPACE_STORAGE_KEY,
  loadDraftWorkspace,
  saveDraftWorkspace,
} from "@/lib/draft-workspace";

export const storageKey = DRAFT_WORKSPACE_STORAGE_KEY;

export const createHeaderSection = (
  overrides: Partial<HeaderSection> = {}
): HeaderSection => ({
  id: `header-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  imageUrl: "https://i.imgur.com/WrMY9ND.jpeg",
  imageDataUrl: "https://i.imgur.com/WrMY9ND.jpeg",
  imageWidth: 520,
  blocks: [],
  ...overrides,
});

export const defaultEmailAssets: EmailAssets = {
  topBannerImageUrl: "https://i.imgur.com/yYpcgaF.png",
  topBannerImageDataUrl: "https://i.imgur.com/yYpcgaF.png",
  topBannerImageWidth: 520,
  heroImageUrl: "https://i.imgur.com/WrMY9ND.jpeg",
  heroImageDataUrl: "https://i.imgur.com/WrMY9ND.jpeg",
  heroImageWidth: 520,
  headerSections: [
    {
      id: "default-hero",
      imageUrl: "https://i.imgur.com/WrMY9ND.jpeg",
      imageDataUrl: "https://i.imgur.com/WrMY9ND.jpeg",
      imageWidth: 520,
      blocks: [],
    },
  ],
  featuredListing: {
    enabled: false,
    boatId: "",
    headline: "We've Found A Boat\nThat's Perfect For You!",
    label: "Featured Listing",
    imageUrl: "",
    imageDataUrl: "",
    imageWidth: 570,
    galleryImageUrls: [],
    title: "",
    body: "Power, luxury, and comfort come together effortlessly in this featured boat. Its wide-open deck plan offers abundant cockpit and bow seating, along with a thoughtfully arranged helm station.",
    specs: "",
    fullListingUrl: "",
    budgetBoatsUrl: "https://winnisquammarine.com/all/boats-for-sale/",
    scheduleViewingUrl: "https://winnisquammarine.com/schedule-an-appointment/",
  },
  footerImageUrl: "https://lakewinnipesaukee.info/wp-content/uploads/2020/01/winni.jpg",
  footerImageDataUrl: "https://lakewinnipesaukee.info/wp-content/uploads/2020/01/winni.jpg",
  newInventoryUrl: "https://winnisquammarine.com/all/boats-for-sale/",
  preOwnedInventoryUrl: "https://winnisquammarine.com/all/boats-for-sale/pre-owned/",
  clearanceDealsUrl: "https://winnisquammarine.com/all/boats-for-sale/clearance-boats/",
  topButtonPaddingTop: 24,
  topButtonPaddingBottom: 24,
  contactUrl: "https://winnisquammarine.com/schedule-an-appointment/",
  footerHeading: "Meet Your Boating Team",
  footerBusinessName: "Winnisquam Marine",
  footerSubtext: "Call/Text 603-524-8380",
  contactButtonLabel: "Contact",
  clearanceHeadingText: "CLEARANCE",
  priceLabelText: "Clearance Price",
};

export const defaultCampaignSettings: CampaignSettings = {
  name: "June Boat Deals 2026",
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

type StoredDraftAssets = Partial<Omit<EmailAssets, "featuredListing">> & {
  featuredListing?: Partial<FeaturedListingSettings>;
};

type StoredDraftSnapshot = {
  settings?: Partial<CampaignSettings> & {
    assets?: StoredDraftAssets;
  };
  selectedBoats?: Boat[];
  sourceDraftId?: string;
};

function mergeCampaignSettings(
  defaults: CampaignSettings,
  saved: StoredDraftSnapshot["settings"]
): CampaignSettings {
  const savedAssets: StoredDraftAssets = saved?.assets ?? {};
  const rawHeaderSections =
    savedAssets.headerSections && savedAssets.headerSections.length
      ? savedAssets.headerSections
      : [
          createHeaderSection({
            id: "default-hero",
            imageUrl: savedAssets.heroImageUrl ?? defaults.assets.heroImageUrl,
            imageDataUrl: savedAssets.heroImageDataUrl ?? defaults.assets.heroImageDataUrl,
            imageWidth: savedAssets.heroImageWidth ?? defaults.assets.heroImageWidth,
          }),
        ];
  const headerSections = rawHeaderSections.map(migrateHeaderSection);

  return {
    ...defaults,
    ...(saved ?? {}),
    assets: {
      ...defaults.assets,
      ...savedAssets,
      featuredListing: {
        ...defaults.assets.featuredListing,
        ...(savedAssets.featuredListing ?? {}),
      },
      headerSections,
    },
  };
}

function createHeaderBlockId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateHeaderSection(section: HeaderSection): HeaderSection {
  if (Array.isArray(section.blocks)) return section;
  return {
    ...section,
    blocks: section.text?.trim()
      ? [{ id: createHeaderBlockId(), type: "text", content: section.text }]
      : [],
  };
}

export function useCampaignDraft() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [settings, setSettings] = useState<CampaignSettings>(defaultCampaignSettings);
  const [settingsStatus, setSettingsStatus] = useState("Settings saved automatically");
  const [selectedBoats, setSelectedBoats] = useState<Boat[]>([]);
  const [sourceDraftId, setSourceDraftId] = useState<string | undefined>();
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  useEffect(() => {
    const hadSavedSettings = hasSavedCampaignSettings();
    let nextSettings = loadSavedCampaignSettings(defaultCampaignSettings);
    const stored = loadDraftWorkspace();

    if (stored) {
      const parsed = stored as StoredDraftSnapshot;
      if ((!hadSavedSettings || parsed.sourceDraftId) && parsed.settings) {
        nextSettings = mergeCampaignSettings(defaultCampaignSettings, parsed.settings);
      }
      setSelectedBoats(parsed.selectedBoats ?? []);
      setSourceDraftId(parsed.sourceDraftId);
    }

    setSettings(nextSettings);
    setRestoreNotice(consumeDraftRestoreNotice());
    setSettingsStatus(
      stored?.sourceDraftId
        ? "Loaded from shared draft history"
        : hadSavedSettings
          ? "Loaded saved settings"
          : "Settings saved automatically"
    );
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const stored: StoredDraft & { sourceDraftId?: string } = { selectedBoats, sourceDraftId };
    saveDraftWorkspace(stored);
  }, [isHydrated, selectedBoats, sourceDraftId]);

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
  const canCreateCampaign = selectedBoats.length > 0;
  const selectionMessage = selectedBoats.length
    ? `${selectedBoats.length} boat${selectedBoats.length === 1 ? "" : "s"} selected.`
    : "Select at least one boat.";

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

  function addHeaderSection() {
    setSettings((current) => ({
      ...current,
      assets: {
        ...current.assets,
        headerSections: [...current.assets.headerSections, createHeaderSection()],
      },
    }));
  }

  function removeHeaderSection(sectionId: string) {
    setSettings((current) => ({
      ...current,
      assets: {
        ...current.assets,
        headerSections:
          current.assets.headerSections.length > 1
            ? current.assets.headerSections.filter((section) => section.id !== sectionId)
            : current.assets.headerSections,
      },
    }));
  }

  function updateHeaderSection<K extends keyof HeaderSection>(
    sectionId: string,
    field: K,
    value: HeaderSection[K]
  ) {
    setSettings((current) => ({
      ...current,
      assets: {
        ...current.assets,
        headerSections: current.assets.headerSections.map((section) =>
          section.id === sectionId ? { ...section, [field]: value } : section
        ),
      },
    }));
  }

  function addHeaderBlock(sectionId: string, type: HeaderContentBlock["type"]) {
    const block: HeaderContentBlock = type === "text"
      ? { id: createHeaderBlockId(), type: "text", content: "" }
      : { id: createHeaderBlockId(), type: "button", label: "Button text", href: "" };
    setSettings((current) => ({ ...current, assets: {
      ...current.assets,
      headerSections: current.assets.headerSections.map((section) =>
        section.id === sectionId ? { ...section, blocks: [...section.blocks, block] } : section
      ),
    }}));
  }

  function updateHeaderBlock(sectionId: string, blockId: string, updates: Partial<HeaderContentBlock>) {
    setSettings((current) => ({ ...current, assets: {
      ...current.assets,
      headerSections: current.assets.headerSections.map((section) =>
        section.id === sectionId
          ? { ...section, blocks: section.blocks.map((block) => block.id === blockId ? { ...block, ...updates } as HeaderContentBlock : block) }
          : section
      ),
    }}));
  }

  function removeHeaderBlock(sectionId: string, blockId: string) {
    setSettings((current) => ({ ...current, assets: {
      ...current.assets,
      headerSections: current.assets.headerSections.map((section) =>
        section.id === sectionId ? { ...section, blocks: section.blocks.filter((block) => block.id !== blockId) } : section
      ),
    }}));
  }

  function moveHeaderBlock(sectionId: string, blockId: string, direction: "up" | "down") {
    setSettings((current) => ({ ...current, assets: {
      ...current.assets,
      headerSections: current.assets.headerSections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.blocks.findIndex((block) => block.id === blockId);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= section.blocks.length) return section;
        const blocks = [...section.blocks];
        const [block] = blocks.splice(index, 1);
        blocks.splice(target, 0, block);
        return { ...section, blocks };
      }),
    }}));
  }

  function updateFeaturedListing<K extends keyof FeaturedListingSettings>(
    field: K,
    value: FeaturedListingSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      assets: {
        ...current.assets,
        featuredListing: {
          ...current.assets.featuredListing,
          [field]: value,
        },
      },
    }));
  }

  function toggleBoat(boat: Boat) {
    setSelectedBoats((current) => {
      if (current.some((selected) => selected.id === boat.id)) {
        return current.filter((selected) => selected.id !== boat.id);
      }

      return [...current, boat];
    });
  }

  function removeBoat(boatId: string) {
    setSelectedBoats((current) => current.filter((boat) => boat.id !== boatId));
  }

  function reorderBoats(sourceBoatId: string, targetBoatId: string) {
    setSelectedBoats((current) => {
      const index = current.findIndex((boat) => boat.id === sourceBoatId);
      const targetIndex = current.findIndex((boat) => boat.id === targetBoatId);

      if (index < 0 || targetIndex < 0 || index === targetIndex) {
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
    setSourceDraftId(undefined);
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
    setSourceDraftId(undefined);
    saveDraftWorkspace({ selectedBoats: [] });
  }

  return {
    canCreateCampaign,
    clearSelectedBoats,
    addHeaderBlock,
    addHeaderSection,
    isHydrated,
    resetDraft,
    resetSavedSettings,
    removeHeaderBlock,
    removeHeaderSection,
    removeBoat,
    moveHeaderBlock,
    reorderBoats,
    selectedBoatIds,
    selectedBoats,
    selectionMessage,
    settings,
    settingsStatus,
    restoreNotice,
    sourceDraftId,
    toggleBoat,
    updateAsset,
    updateFeaturedListing,
    updateHeaderBlock,
    updateHeaderSection,
    updateSetting,
  };
}
