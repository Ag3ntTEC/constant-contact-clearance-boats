import { NextResponse } from "next/server";
import { hasConstantContactRefreshToken } from "@/lib/constant-contact";

export async function GET() {
  return NextResponse.json({
    hasRefreshToken: hasConstantContactRefreshToken(),
  });
}
