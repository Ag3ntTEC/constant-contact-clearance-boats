import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildConstantContactAuthorizationUrl } from "@/lib/constant-contact";

export async function GET() {
  try {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();

    cookieStore.set("constant_contact_oauth_state", state, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.redirect(buildConstantContactAuthorizationUrl(state));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Constant Contact OAuth is not configured.";

    return new NextResponse(
      `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif; padding:40px; line-height:1.5;">
    <h1>Constant Contact is not configured yet</h1>
    <p>${message}</p>
    <p>Add your Constant Contact values to <code>.env.local</code>, restart the app, and try again.</p>
    <p><a href="/campaign/new/preview">Return to campaign preview</a></p>
  </body>
</html>`,
      {
        headers: {
          "Content-Type": "text/html",
        },
        status: 500,
      }
    );
  }
}
