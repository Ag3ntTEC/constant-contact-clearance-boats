"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateClearanceBoatEmailHtml } from "@/lib/emailTemplate";
import { StepShell } from "../_components/StepShell";
import { useCampaignDraft } from "../_components/useCampaignDraft";

export default function CampaignPreviewPage() {
  const { canCreateCampaign, selectedBoats, selectionMessage, settings } =
    useCampaignDraft();
  const [activeTab, setActiveTab] = useState<"visual" | "source">("visual");
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState<{
    campaignActivityId?: string;
    campaignId?: string;
    message: string;
  } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftErrorDetails, setDraftErrorDetails] = useState<unknown>(null);
  const emailHtml = useMemo(
    () => generateClearanceBoatEmailHtml(settings, selectedBoats),
    [selectedBoats, settings]
  );
  const validationMessage = getDraftValidationMessage(
    settings,
    selectedBoats.length,
    emailHtml
  );
  const canCreateDraft =
    hasRefreshToken && canCreateCampaign && !validationMessage && !isCreatingDraft;

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/constant-contact/status");
        const data = (await response.json()) as { hasRefreshToken?: boolean };
        setHasRefreshToken(Boolean(data.hasRefreshToken));
      } catch {
        setHasRefreshToken(false);
      } finally {
        setIsCheckingStatus(false);
      }
    }

    loadStatus();
  }, []);

  async function createDraft() {
    setIsCreatingDraft(true);
    setDraftError(null);
    setDraftErrorDetails(null);
    setDraftResult(null);

    try {
      const response = await fetch("/api/constant-contact/create-draft", {
        body: JSON.stringify({
          campaignName: settings.name,
          fromEmail: settings.fromEmail,
          fromName: settings.fromName,
          htmlContent: emailHtml,
          preheader: settings.preheader,
          replyToEmail: settings.replyToEmail,
          subject: settings.subject,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setDraftErrorDetails(data.details);
        throw new Error(data.error ?? "Unable to create Constant Contact draft.");
      }

      setDraftResult({
        campaignActivityId: data.campaignActivityId,
        campaignId: data.campaignId,
        message: data.message,
      });
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Unable to create Constant Contact draft."
      );
    } finally {
      setIsCreatingDraft(false);
    }
  }

  return (
    <StepShell
      description="Review the final table-based email before the future Constant Contact draft step."
      selectedCount={selectedBoats.length}
      title="Preview email"
    >
      <div className="mb-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{selectionMessage}</p>
          <p className="mt-1 text-xs text-slate-500">
            Create a draft only after reviewing the generated custom-code HTML.
          </p>
          {validationMessage ? (
            <p className="mt-2 text-sm font-semibold text-amber-700">{validationMessage}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCheckingStatus && !hasRefreshToken ? (
            <a
              className="rounded-md border border-harbor bg-white px-4 py-2 text-sm font-semibold text-harbor hover:bg-harbor hover:text-white"
              href="/api/constant-contact/auth"
            >
              Connect Constant Contact
            </a>
          ) : null}
          <button
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canCreateDraft}
            onClick={createDraft}
            type="button"
          >
            {isCreatingDraft ? "Creating draft..." : "Create Constant Contact Draft"}
          </button>
        </div>
      </div>

      {draftResult ? (
        <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{draftResult.message}</p>
          <p className="mt-2">Campaign ID: {draftResult.campaignId ?? "Not returned"}</p>
          <p>Campaign Activity ID: {draftResult.campaignActivityId ?? "Not returned"}</p>
        </div>
      ) : null}

      {draftError ? (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{draftError}</p>
          {draftErrorDetails ? (
            <pre className="mt-3 max-h-72 overflow-auto rounded bg-white p-3 text-xs text-red-900">
              {JSON.stringify(draftErrorDetails, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === "visual"
                ? "bg-harbor text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => setActiveTab("visual")}
            type="button"
          >
            Visual Preview
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === "source"
                ? "bg-harbor text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => setActiveTab("source")}
            type="button"
          >
            HTML Source
          </button>
        </div>

        {activeTab === "visual" ? (
          <EmailVisualPreview html={emailHtml} />
        ) : (
          <pre className="max-h-[720px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {emailHtml}
          </pre>
        )}
      </section>
    </StepShell>
  );
}

function getDraftValidationMessage(
  settings: ReturnType<typeof useCampaignDraft>["settings"],
  selectedBoatCount: number,
  html: string
) {
  if (selectedBoatCount < 7 || selectedBoatCount > 10) {
    return "Select between 7 and 10 boats before creating a draft.";
  }

  if (!settings.name.trim()) {
    return "Campaign name is required.";
  }

  if (!settings.subject.trim()) {
    return "Subject line is required.";
  }

  if (!settings.fromName?.trim() || !settings.fromEmail?.trim() || !settings.replyToEmail?.trim()) {
    return "From name, from email, and reply-to email are required.";
  }

  if (!html || !html.includes("[[trackingImage]]")) {
    return "Generated HTML must include [[trackingImage]].";
  }

  if (containsNonPublicImageReference(html)) {
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

function EmailVisualPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);

  useEffect(() => {
    setHeight(900);
  }, [html]);

  function resizeIframe() {
    const iframe = iframeRef.current;
    const documentElement = iframe?.contentDocument?.documentElement;
    const body = iframe?.contentDocument?.body;
    const nextHeight = Math.max(
      documentElement?.scrollHeight ?? 0,
      body?.scrollHeight ?? 0,
      900
    );

    setHeight(nextHeight);
  }

  return (
    <div className="w-full bg-slate-100 px-4 py-8">
      <div className="mx-auto w-[600px] max-w-full bg-white shadow-lg">
        <iframe
          className="block w-full border-0 bg-white"
          onLoad={resizeIframe}
          ref={iframeRef}
          srcDoc={html}
          style={{ height }}
          title="Generated email preview"
        />
      </div>
    </div>
  );
}
