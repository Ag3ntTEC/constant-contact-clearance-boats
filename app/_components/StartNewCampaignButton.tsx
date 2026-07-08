"use client";

import { useRouter } from "next/navigation";
import { useCampaignDraft } from "../campaign/new/_components/useCampaignDraft";

export function StartNewCampaignButton() {
  const router = useRouter();
  const { clearSelectedBoats } = useCampaignDraft();

  return (
    <button
      className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-tide"
      onClick={() => {
        clearSelectedBoats();
        router.push("/campaign/new/settings");
      }}
      type="button"
    >
      Start New Campaign
    </button>
  );
}
