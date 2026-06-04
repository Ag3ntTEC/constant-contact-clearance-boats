import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeConstantContactAuthorizationCode } from "@/lib/constant-contact";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("constant_contact_oauth_state")?.value;

  if (!code) {
    return renderHtml("Constant Contact OAuth failed", "Missing authorization code.", 400);
  }

  if (!state || !expectedState || state !== expectedState) {
    return renderHtml("Constant Contact OAuth failed", "Invalid OAuth state.", 400);
  }

  cookieStore.delete("constant_contact_oauth_state");

  try {
    const tokenResponse = await exchangeConstantContactAuthorizationCode(code);

    // TODO: Replace development console copy-paste with secure database token storage.
    if (process.env.NODE_ENV !== "production" && tokenResponse.refresh_token) {
      console.warn(
        "Constant Contact refresh token received. Copy this into .env.local as CONSTANT_CONTACT_REFRESH_TOKEN. Do not share it:",
        tokenResponse.refresh_token
      );
    }

    return renderHtml(
      "Constant Contact connected",
      "OAuth completed. In development, check the server console for the refresh token and add it to .env.local, then restart the app."
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to exchange authorization code.";

    return renderHtml("Constant Contact OAuth failed", message, 500);
  }
}

function renderHtml(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:Arial,sans-serif; padding:40px; line-height:1.5;">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <p><a href="/campaign/new/preview">Return to campaign preview</a></p>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html",
      },
      status,
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
