import { NextResponse } from "next/server";
import { fetchBoats } from "@/lib/boatFeed";
import {
  ConstantContactApiError,
  deleteConstantContactEmailCampaign,
} from "@/lib/constant-contact";
import { isValidHistoryId } from "@/lib/history-data";
import { deleteDraftHistoryEntry, getDraftHistoryEntry } from "@/lib/history-store";
import type { ReconciledDraftHistoryEntry } from "@/lib/history-types";

type RouteContext = {
  params: Promise<{ draftId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { draftId } = await context.params;

    if (!isValidHistoryId(draftId)) {
      return NextResponse.json({ error: "Invalid draft history ID." }, { status: 400 });
    }

    const draft = await getDraftHistoryEntry(draftId);

    if (!draft) {
      return NextResponse.json({ error: "Draft history entry not found." }, { status: 404 });
    }

    const inventory = await fetchBoats();
    const reconciled: ReconciledDraftHistoryEntry = {
      ...draft,
      inventorySource: inventory.source,
      reconciliationWarning: inventory.warning,
      refreshedBoatCount: 0,
      removedBoats: [],
    };

    if (inventory.source === "live") {
      const currentBoatsById = new Map(inventory.boats.map((boat) => [boat.id, boat]));
      const refreshedBoats = draft.selectedBoats.flatMap((savedBoat) => {
        const currentBoat = currentBoatsById.get(savedBoat.id);

        if (!currentBoat) {
          reconciled.removedBoats.push({
            id: savedBoat.id,
            name: savedBoat.displayTitle ?? savedBoat.title,
          });
          return [];
        }

        return [currentBoat];
      });

      reconciled.selectedBoats = refreshedBoats;
      reconciled.refreshedBoatCount = refreshedBoats.length;
    } else {
      reconciled.reconciliationWarning =
        "The live inventory feed is unavailable, so saved boat details were preserved. Reopen this draft when the live feed is available to remove sold inventory and refresh existing boats.";
    }

    return NextResponse.json({ draft: reconciled });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load this draft.",
      },
      { status: 503 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { draftId } = await context.params;

    if (!isValidHistoryId(draftId)) {
      return NextResponse.json({ error: "Invalid draft history ID." }, { status: 400 });
    }

    const draft = await getDraftHistoryEntry(draftId);

    if (!draft) {
      return NextResponse.json({ error: "Draft history entry not found." }, { status: 404 });
    }

    if (draft.campaignId) {
      await deleteConstantContactEmailCampaign(draft.campaignId);
    }

    await deleteDraftHistoryEntry(draftId);

    return NextResponse.json({
      message: draft.campaignId
        ? "Draft deleted from Constant Contact and shared history."
        : "Draft removed from shared history.",
    });
  } catch (error) {
    if (error instanceof ConstantContactApiError) {
      return NextResponse.json(
        {
          details: error.details,
          error:
            "Constant Contact could not delete this campaign. Scheduled or sent campaigns may need to be managed in Constant Contact.",
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete this draft.",
      },
      { status: 503 }
    );
  }
}
