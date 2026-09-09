import { NextRequest, NextResponse } from "next/server";
import { isHeaderImageHistoryEntry } from "@/lib/history-data";
import {
  listHeaderImageHistory,
  saveHeaderImageHistoryEntries,
} from "@/lib/history-store";

export async function GET() {
  try {
    const entries = await listHeaderImageHistory();
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load image history.",
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { entries?: unknown };

    if (!Array.isArray(body.entries)) {
      return NextResponse.json({ error: "Image history entries are required." }, { status: 400 });
    }

    const entries = body.entries.filter(isHeaderImageHistoryEntry).slice(0, 200);

    if (entries.length !== body.entries.length) {
      return NextResponse.json({ error: "One or more image history entries are invalid." }, { status: 400 });
    }

    await saveHeaderImageHistoryEntries(entries);
    return NextResponse.json({ importedCount: entries.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save image history.",
      },
      { status: 503 }
    );
  }
}
