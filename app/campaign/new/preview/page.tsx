"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateClearanceBoatEmailHtml } from "@/lib/emailTemplate";
import { recordHeaderImageHistory } from "@/lib/header-image-history";
import { stripRichText } from "@/lib/richText";
import { ActionFooter, StepShell } from "../_components/StepShell";
import { useCampaignDraft } from "../_components/useCampaignDraft";
import type { EmailAssets, FeaturedListingSettings } from "@/lib/types";

export default function CampaignPreviewPage() {
  const {
    canCreateCampaign,
    selectedBoats,
    selectionMessage,
    settings,
    updateAsset,
    updateFeaturedListing,
    updateHeaderBlock,
  } = useCampaignDraft();
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
  const readinessItems = [
    {
      detail: selectedBoats.length
        ? `${selectedBoats.length} boat${selectedBoats.length === 1 ? "" : "s"} selected`
        : "Select at least one boat.",
      label: "Boat selection",
      ready: selectedBoats.length > 0,
    },
    {
      detail: settings.name || "Campaign name required.",
      label: "Campaign name",
      ready: Boolean(settings.name.trim()),
    },
    {
      detail: settings.subject || "Subject line required.",
      label: "Subject line",
      ready: Boolean(settings.subject.trim()),
    },
    {
      detail:
        settings.fromName?.trim() && settings.fromEmail?.trim() && settings.replyToEmail?.trim()
          ? settings.fromEmail ?? "Sender ready"
          : "From name, from email, and reply-to email required.",
      label: "Sender info",
      ready: Boolean(
        settings.fromName?.trim() && settings.fromEmail?.trim() && settings.replyToEmail?.trim()
      ),
    },
    {
      detail: containsNonPublicImageReference(emailHtml)
        ? "Replace imported or local images with public URLs."
        : "Images are public URL ready.",
      label: "Image URLs",
      ready: !containsNonPublicImageReference(emailHtml),
    },
    {
      detail: isCheckingStatus
        ? "Checking connection"
        : hasRefreshToken
          ? "Connected"
          : "Connect before creating the draft.",
      label: "Constant Contact",
      ready: hasRefreshToken,
    },
  ];

  function handleInlineTextEdit(field: string, value: string) {
    if (field.startsWith("headerSections.")) {
      const [, sectionId, group, blockId, blockField] = field.split(".");

      if (sectionId && group === "blocks" && blockId && blockField === "content") {
        updateHeaderBlock(sectionId, blockId, { content: value });
      }

      return;
    }

    if (field.startsWith("featuredListing.")) {
      const featuredField = field.replace("featuredListing.", "");

      if (isEditableFeaturedListingField(featuredField)) {
        updateFeaturedListing(featuredField, value);
      }

      return;
    }

    if (field === "priceLabelText") {
      updateAsset("priceLabelText", extractPriceLabelEdit(value));
      return;
    }

    if (isEditableAssetField(field)) {
      updateAsset(field, value);
    }
  }

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
      recordHeaderImageHistory(settings, { campaignId: data.campaignId });
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
      footer={
        <ActionFooter
          backHref="/campaign/new/editor"
          nextDescription={validationMessage ?? "Ready to create a Constant Contact draft."}
        >
          <button
            className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-tide disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canCreateDraft}
            onClick={createDraft}
            type="button"
          >
            {isCreatingDraft ? "Creating Draft..." : "Create Constant Contact Draft"}
          </button>
        </ActionFooter>
      }
      selectedCount={selectedBoats.length}
      title="Preview email"
    >
      <div className="mb-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-[var(--tight-shadow)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-harbor">
            Final Review
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{selectionMessage}</p>
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
        </div>
      </div>

      <ReadinessChecklist items={readinessItems} />

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
        <div className="mb-4 flex gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-[var(--tight-shadow)]">
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
          <EmailVisualPreview html={emailHtml} onInlineTextEdit={handleInlineTextEdit} />
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
  if (selectedBoatCount < 1) {
    return "Select at least one boat before creating a draft.";
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

function ReadinessChecklist({
  items,
}: {
  items: { detail: string; label: string; ready: boolean }[];
}) {
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-[var(--tight-shadow)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Draft Readiness</h2>
          <p className="mt-1 text-sm text-slate-500">
            {readyCount} of {items.length} checks ready.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            readyCount === items.length
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {readyCount === items.length ? "Ready" : "Needs attention"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink">{item.label}</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${
                  item.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {item.ready ? "Ready" : "Needed"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function isEditableAssetField(field: string): field is keyof Pick<
  EmailAssets,
  | "clearanceHeadingText"
  | "footerHeading"
  | "footerBusinessName"
  | "footerSubtext"
  | "contactButtonLabel"
> {
  return [
    "clearanceHeadingText",
    "footerHeading",
    "footerBusinessName",
    "footerSubtext",
    "contactButtonLabel",
  ].includes(field);
}

function isEditableFeaturedListingField(field: string): field is keyof Pick<
  FeaturedListingSettings,
  | "headline"
  | "label"
  | "title"
  | "body"
  | "specs"
> {
  return [
    "headline",
    "label",
    "title",
    "body",
    "specs",
  ].includes(field);
}

function extractPriceLabelEdit(value: string): string {
  const colonIndex = value.indexOf(":");

  if (colonIndex >= 0) {
    const labelHtml = value.slice(0, colonIndex).trim();

    if (stripRichText(labelHtml).trim()) {
      return labelHtml;
    }
  }

  const plainValue = stripRichText(value);

  return plainValue.split(":")[0]?.trim() || plainValue.trim();
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

function EmailVisualPreview({
  html,
  onInlineTextEdit,
}: {
  html: string;
  onInlineTextEdit: (field: string, value: string) => void;
}) {
  const previewWidth = 700;
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(900);
  const [containerWidth, setContainerWidth] = useState(previewWidth);
  const scale = Math.min(1, containerWidth / previewWidth);
  const wrapperHeight = Math.ceil(height * scale);
  const previewHtml = useMemo(() => makePreviewHtmlEditable(extractEmailBodyHtml(html)), [html]);

  useEffect(() => {
    setHeight(900);
  }, [html]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function updateContainerWidth() {
      setContainerWidth(container?.clientWidth || previewWidth);
    }

    updateContainerWidth();

    const observer = new ResizeObserver(updateContainerWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preview = previewRef.current;

    if (!preview) {
      return;
    }

    function updateHeight() {
      setHeight(Math.max(preview?.scrollHeight ?? 0, 900));
    }

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(preview);

    return () => observer.disconnect();
  }, [previewHtml]);

  function getEditableTarget(target: EventTarget | null) {
    return target instanceof Node ? getEditableNodeTarget(target) : null;
  }

  function getEditableNodeTarget(node: Node | null) {
    if (!node) {
      return null;
    }

    const element = node instanceof HTMLElement ? node : node.parentElement;

    return element?.closest<HTMLElement>("[data-edit-field]") ?? null;
  }

  function commitEditableTarget(target: HTMLElement) {
    const field = target.dataset.editField;

    if (!field) {
      return;
    }

    onInlineTextEdit(field, target.innerHTML ?? target.textContent ?? "");
  }

  function insertPlainTextAtSelection(target: HTMLElement, text: string) {
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const activeRange = selection.rangeCount ? selection.getRangeAt(0) : null;
    const range =
      activeRange && target.contains(activeRange.commonAncestorContainer)
        ? activeRange
        : document.createRange();

    if (!target.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(target);
      range.collapse(false);
    }

    target.focus();
    range.deleteContents();

    const parts = text.split(/\r?\n/);

    parts.forEach((part, index) => {
      if (index > 0) {
        const breakNode = document.createElement("br");
        range.insertNode(breakNode);
        range.setStartAfter(breakNode);
      }

      if (part) {
        const textNode = document.createTextNode(part);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
      }
    });

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    commitEditableTarget(target);
  }

  return (
    <div className="w-full overflow-x-hidden rounded-md border border-slate-200 bg-slate-100 px-4 py-8 shadow-[var(--surface-shadow)]">
      <div
        className="mx-auto w-full max-w-[700px] overflow-hidden"
        ref={containerRef}
        style={{ height: wrapperHeight }}
      >
        <div
          className="bg-white shadow-lg"
          style={{
            margin: "0 auto",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: previewWidth,
          }}
        >
          <div
            className="overflow-hidden bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            onBlurCapture={(event) => {
              const target = getEditableTarget(event.target);

              if (!target) {
                return;
              }

              commitEditableTarget(target);
            }}
            onClickCapture={(event) => {
              const target = getEditableTarget(event.target);

              if (target) {
                event.preventDefault();
              }
            }}
            onKeyDownCapture={(event) => {
              const target = getEditableTarget(event.target);

              if (!target || event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              commitEditableTarget(target);
              target.blur();
            }}
            onPasteCapture={(event) => {
              const target = getEditableTarget(event.target);

              if (!target) {
                return;
              }

              event.preventDefault();
              insertPlainTextAtSelection(target, event.clipboardData.getData("text/plain"));
            }}
            ref={previewRef}
            style={{ width: previewWidth }}
          />
        </div>
      </div>
    </div>
  );
}

function makePreviewHtmlEditable(html: string): string {
  return html.replace(
    /data-edit-field="([^"]+)"([^>]*?)style="([^"]*)"/g,
    'data-edit-field="$1" contenteditable="true" spellcheck="true" title="Click to edit"$2style="$3 outline:1px dashed rgba(0,110,182,0.35); outline-offset:2px; min-height:18px; cursor:text;"'
  );
}

function extractEmailBodyHtml(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;

  return bodyHtml.replace("[[trackingImage]]", "");
}
