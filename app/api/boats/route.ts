import { NextResponse } from "next/server";
import { fetchBoats } from "@/lib/boatFeed";

export async function GET() {
  try {
    const result = await fetchBoats();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load boat feed.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 502,
      }
    );
  }
}
