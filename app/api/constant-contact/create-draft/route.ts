import { NextRequest, NextResponse } from "next/server";
import {
  ConstantContactApiError,
  createConstantContactEmailDraft,
  type ConstantContactCreateEmailPayload,
} from "@/lib/constant-contact";

type CreateDraftRequest = {
  campaignName?: string;
  fromEmail?: string;
  fromName?: string;
  htmlContent?: string;
  preheader?: string;
  replyToEmail?: string;
  subject?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDraftRequest;
    const validationError = validateRequest(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const payload = buildCreateEmailPayload(body as Required<CreateDraftRequest>);
    logPayloadSummary(payload);
    const response = await createConstantContactEmailDraft(payload);
    const campaignActivityId =
      response?.campaign_activities?.find?.(
        (activity: { role?: string }) => activity.role === "primary_email"
      )?.campaign_activity_id ?? response?.campaign_activities?.[0]?.campaign_activity_id;

    return NextResponse.json({
      campaignActivityId,
      campaignId: response?.campaign_id,
      message:
        "Draft created in Constant Contact. Review it there before scheduling or sending.",
      response,
    });
  } catch (error) {
    if (error instanceof ConstantContactApiError) {
      return NextResponse.json(
        {
          details: error.details,
          error: formatConstantContactError(error.details) ?? error.message,
        },
        {
          status: error.status,
        }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create draft.",
      },
      {
        status: 500,
      }
    );
  }
}

function buildCreateEmailPayload(
  body: Required<CreateDraftRequest>
): ConstantContactCreateEmailPayload {
  const activity: ConstantContactCreateEmailPayload["email_campaign_activities"][number] = {
    format_type: 5,
    from_email: body.fromEmail,
    from_name: body.fromName,
    html_content: body.htmlContent,
    reply_to_email: body.replyToEmail,
    subject: body.subject,
  };

  if (body.preheader?.trim()) {
    activity.preheader = body.preheader.trim();
  }

  return {
    email_campaign_activities: [activity],
    name: body.campaignName,
  };
}

function validateRequest(body: CreateDraftRequest) {
  const requiredFields: Array<[keyof CreateDraftRequest, string]> = [
    ["campaignName", "Campaign name is required."],
    ["subject", "Subject line is required."],
    ["fromName", "From name is required."],
    ["fromEmail", "From email is required."],
    ["replyToEmail", "Reply-to email is required."],
    ["htmlContent", "Generated HTML is required."],
  ];

  for (const [field, message] of requiredFields) {
    if (!body[field]?.trim()) {
      return message;
    }
  }

  if (!body.htmlContent?.includes("[[trackingImage]]")) {
    return "Generated HTML must include [[trackingImage]].";
  }

  if (containsNonPublicImageReference(body.htmlContent)) {
    return "Email images must use publicly accessible URLs before creating a Constant Contact draft.";
  }

  return null;
}

function containsNonPublicImageReference(html: string) {
  const imageSources = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map(
    (match) => match[1].trim().toLowerCase()
  );

  return imageSources.some(
    (src) =>
      src.startsWith("blob:") ||
      src.startsWith("data:") ||
      src.startsWith("file:") ||
      src.includes("localhost") ||
      src.includes("127.0.0.1")
  );
}

function formatConstantContactError(details: unknown): string | null {
  if (!details) {
    return null;
  }

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details)) {
    return details
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return [record.error_key, record.error_message, record.message]
            .filter(Boolean)
            .join(": ");
        }

        return null;
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof details === "object") {
    const record = details as Record<string, unknown>;
    return [record.error, record.error_description, record.error_message, record.message]
      .filter(Boolean)
      .join(": ");
  }

  return null;
}

function logPayloadSummary(payload: ConstantContactCreateEmailPayload) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const activity = payload.email_campaign_activities[0];

  console.info("Constant Contact /emails payload summary", {
    format_type: activity.format_type,
    from_email: activity.from_email,
    from_name: activity.from_name,
    html_content_length: activity.html_content.length,
    includes_tracking_image: activity.html_content.includes("[[trackingImage]]"),
    name: payload.name,
    preheader: activity.preheader,
    reply_to_email: activity.reply_to_email,
    subject: activity.subject,
  });
}
