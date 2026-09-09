import { NextResponse } from "next/server";
import { listDraftHistory } from "@/lib/history-store";

export async function GET() {
  try {
    const drafts = await listDraftHistory();
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load draft history.",
      },
      { status: 503 }
    );
  }
}
