"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateClearanceBoatEmailHtml } from "@/lib/emailTemplate";
import { formatRichText, preserveEditableWhitespace, stripRichText } from "@/lib/richText";
import { ActionFooter, StepShell } from "../_components/StepShell";
import { CampaignContentEditor } from "../_components/CampaignContentEditor";
import { useCampaignDraft } from "../_components/useCampaignDraft";
import type { EmailAssets, FeaturedListingSettings, TextFormat } from "@/lib/types";

export default function CampaignPreviewPage() {
  const draft = useCampaignDraft();
  const {
    canCreateCampaign,
    selectedBoats,
    selectionMessage,
    settings,
    sourceDraftId,
    updateAsset,
    updateFeaturedListing,
    updateFooterBlock,
    updateHeaderBlock,
    updateHeaderSection,
    updateTextFormat,
  } = draft;
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

      if (sectionId && group === "title") {
        updateHeaderSection(sectionId, "title", value);
      } else if (
        sectionId &&
        group === "blocks" &&
        blockId &&
        (blockField === "content" || blockField === "label")
      ) {
        updateHeaderBlock(sectionId, blockId, { [blockField]: value });
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

    if (field.startsWith("footerBlocks.")) {
      const [, blockId, blockField] = field.split(".");

      if (blockId && (blockField === "content" || blockField === "label")) {
        updateFooterBlock(blockId, { [blockField]: value });
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
          history: {
            selectedBoats,
            settings,
            sourceDraftId,
          },
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
      if (data.historyWarning) {
        setDraftError(data.historyWarning);
      }
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
      description="Edit header and footer content beside the live email, then create the Constant Contact draft."
      footer={
        <ActionFooter
          backHref="/campaign/new/boats"
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
      title="Editor & preview"
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

      <section className="grid items-start gap-5 lg:grid-cols-2 lg:items-stretch">
        <CampaignContentEditor draft={draft} />
        <div className="min-w-0 lg:sticky lg:top-5">
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
          <EmailVisualPreview
            html={emailHtml}
            onInlineTextEdit={handleInlineTextEdit}
            onInlineTextFormat={updateTextFormat}
            textFormats={settings.assets.textFormats}
          />
        ) : (
          <pre className="max-h-[720px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {emailHtml}
          </pre>
        )}
        </div>
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
    const labelHtml = value.slice(0, colonIndex);

    if (stripRichText(labelHtml).trim()) {
      return labelHtml;
    }
  }

  const plainValue = stripRichText(value);

  return plainValue.split(":")[0] ?? plainValue;
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
  onInlineTextFormat,
  textFormats,
}: {
  html: string;
  onInlineTextEdit: (field: string, value: string) => void;
  onInlineTextFormat: (field: string, updates: Partial<TextFormat>) => void;
  textFormats: Record<string, TextFormat>;
}) {
  const previewWidth = 700;
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const appliedHtmlRef = useRef("");
  const commitTimerRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<HTMLElement | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const selectionTargetRef = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState(900);
  const [containerWidth, setContainerWidth] = useState(previewWidth);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [canFormatSelection, setCanFormatSelection] = useState(false);
  const scale = Math.min(1, containerWidth / previewWidth);
  const wrapperHeight = Math.ceil(height * scale);
  const previewHtml = useMemo(() => makePreviewHtmlEditable(extractEmailBodyHtml(html)), [html]);
  const activeFormat = activeField ? textFormats[activeField] ?? {} : {};

  useEffect(() => {
    const preview = previewRef.current;

    if (!preview) {
      return;
    }

    const activeElement = document.activeElement;
    const activeEditor = activeElement instanceof Node
      ? getEditableNodeTarget(activeElement)
      : null;

    if (activeEditor && preview.contains(activeEditor)) {
      return;
    }

    if (appliedHtmlRef.current !== previewHtml) {
      preview.innerHTML = previewHtml;
      appliedHtmlRef.current = previewHtml;
    }
  });

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

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

  function commitEditableTarget(target: HTMLElement, normalizeDom = false) {
    const field = target.dataset.editField;

    if (!field) {
      return;
    }

    const nextValue = formatRichText(target.innerHTML ?? target.textContent ?? "");

    if (normalizeDom && target.innerHTML !== nextValue) {
      target.innerHTML = nextValue;
    }

    onInlineTextEdit(field, nextValue);
  }

  function cancelScheduledCommit() {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    pendingTargetRef.current = null;
  }

  function scheduleEditableCommit(target: HTMLElement) {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
    }

    pendingTargetRef.current = target;
    commitTimerRef.current = window.setTimeout(() => {
      const pendingTarget = pendingTargetRef.current;
      commitTimerRef.current = null;
      pendingTargetRef.current = null;

      if (pendingTarget?.isConnected) {
        commitEditableTarget(pendingTarget);
      }
    }, 300);
  }

  function rememberFormattingSelection() {
    const preview = previewRef.current;
    const selection = window.getSelection();

    if (!preview || !selection?.rangeCount) {
      setCanFormatSelection(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const startTarget = getEditableNodeTarget(range.startContainer);
    const endTarget = getEditableNodeTarget(range.endContainer);

    if (
      startTarget &&
      startTarget === endTarget &&
      preview.contains(startTarget)
    ) {
      selectionRangeRef.current = range.cloneRange();
      selectionTargetRef.current = startTarget;
      setActiveField(startTarget.dataset.editField ?? null);
      setCanFormatSelection(!range.collapsed);
      return;
    }

    setCanFormatSelection(false);
  }

  function applyInlineCommand(command: "bold" | "italic" | "underline") {
    const target = selectionTargetRef.current;
    const range = selectionRangeRef.current;
    const selection = window.getSelection();

    if (
      !target?.isConnected ||
      !range ||
      range.collapsed ||
      !selection ||
      !target.contains(range.startContainer) ||
      !target.contains(range.endContainer)
    ) {
      setCanFormatSelection(false);
      return;
    }

    target.focus();
    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand(command, false)) {
      const tagName = command === "bold" ? "strong" : command === "italic" ? "em" : "u";
      const wrapper = document.createElement(tagName);
      const selectedContent = range.extractContents();
      wrapper.append(selectedContent);
      range.insertNode(wrapper);
      range.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    rememberFormattingSelection();
    scheduleEditableCommit(target);
  }

  function applyBlockFormat(updates: Partial<TextFormat>) {
    const target = selectionTargetRef.current;
    const field = target?.dataset.editField ?? activeField;

    if (!target?.isConnected || !field) return;

    if (updates.fontSize !== undefined) {
      target.style.fontSize = `${updates.fontSize}px`;
      target.style.lineHeight = `${Math.round(updates.fontSize * 1.35)}px`;
    }
    if (updates.textAlign !== undefined) {
      target.style.textAlign = updates.textAlign;

      if (target instanceof HTMLAnchorElement && target.parentElement instanceof HTMLTableCellElement) {
        target.parentElement.align = updates.textAlign;
        target.parentElement.style.textAlign = updates.textAlign;
      }
    }
    if (updates.color !== undefined) target.style.color = updates.color;
    onInlineTextFormat(field, updates);
  }

  function clearFormatting() {
    const target = selectionTargetRef.current;
    const field = target?.dataset.editField ?? activeField;

    if (!field) return;
    const selection = window.getSelection();
    const range = selectionRangeRef.current;

    if (canFormatSelection && target && range && selection) {
      target.focus();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("removeFormat", false);
      scheduleEditableCommit(target);
    }
    onInlineTextFormat(field, { color: undefined, fontSize: undefined, textAlign: undefined });
    setActiveField(null);
    target?.blur();
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
        const textNode = document.createTextNode(preserveEditableWhitespace(part));
        range.insertNode(textNode);
        range.setStartAfter(textNode);
      }
    });

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    rememberFormattingSelection();
    scheduleEditableCommit(target);
  }

  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-[var(--surface-shadow)]">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Inline editing</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Click a dashed text box. Highlight text for bold, italic, or underline.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            aria-label="Font size"
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
            disabled={!activeField}
            onChange={(event) => applyBlockFormat({ fontSize: Number(event.target.value) })}
            value={activeFormat.fontSize ?? ""}
          >
            <option value="">Font size</option>
            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42].map((size) => <option key={size} value={size}>{size}px</option>)}
          </select>
          {(["bold", "italic", "underline"] as const).map((command) => (
            <button
              aria-label={command}
              className={`h-8 min-w-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 hover:border-harbor hover:text-harbor disabled:opacity-40 ${command === "bold" ? "font-bold" : command === "italic" ? "italic" : "underline"}`}
              disabled={!canFormatSelection}
              key={command}
              onClick={() => applyInlineCommand(command)}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              {command[0].toUpperCase()}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          {(["left", "center", "right"] as const).map((alignment) => (
            <button
              aria-label={`Align ${alignment}`}
              className={`h-8 rounded border px-2 text-xs font-semibold ${activeFormat.textAlign === alignment ? "border-harbor bg-mist text-harbor" : "border-slate-300 bg-white text-slate-600"}`}
              disabled={!activeField}
              key={alignment}
              onClick={() => applyBlockFormat({ textAlign: alignment })}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              {alignment === "left" ? "≡←" : alignment === "center" ? "≡" : "→≡"}
            </button>
          ))}
          <label className="flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600">
            Color
            <input aria-label="Text color" className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" disabled={!activeField} onChange={(event) => applyBlockFormat({ color: event.target.value })} type="color" value={activeFormat.color ?? "#111827"} />
          </label>
          <button className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 disabled:opacity-40" disabled={!activeField} onClick={clearFormatting} onMouseDown={(event) => event.preventDefault()} type="button">Clear</button>
        </div>
      </div>
      <div className="overflow-x-hidden px-4 py-8">
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
              onBlurCapture={(event) => {
                const target = getEditableTarget(event.target);

                if (!target) {
                  return;
                }

                cancelScheduledCommit();
                commitEditableTarget(target, true);
                setCanFormatSelection(false);
              }}
              onClickCapture={(event) => {
                const target = getEditableTarget(event.target);

                if (target) {
                  event.preventDefault();
                }
              }}
              onFocusCapture={rememberFormattingSelection}
              onInputCapture={(event) => {
                const target = getEditableTarget(event.target);

                if (target) {
                  rememberFormattingSelection();
                  scheduleEditableCommit(target);
                }
              }}
              onKeyDownCapture={(event) => {
                const target = getEditableTarget(event.target);

                if (target && event.key === "Tab") {
                  event.preventDefault();
                  insertPlainTextAtSelection(target, "\t");
                  return;
                }

                if (
                  target &&
                  (event.ctrlKey || event.metaKey) &&
                  ["b", "i", "u"].includes(event.key.toLowerCase())
                ) {
                  event.preventDefault();
                  rememberFormattingSelection();
                  applyInlineCommand(event.key.toLowerCase() === "b" ? "bold" : event.key.toLowerCase() === "i" ? "italic" : "underline");
                }
              }}
              onKeyUpCapture={rememberFormattingSelection}
              onMouseUpCapture={rememberFormattingSelection}
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
    </div>
  );
}

function makePreviewHtmlEditable(html: string): string {
  return html.replace(
    /data-edit-field="([^"]+)"([^>]*?)style="([^"]*)"/g,
    'data-edit-field="$1" contenteditable="true" spellcheck="true" title="Click to edit"$2style="$3 outline:1px dashed rgba(0,110,182,0.35); outline-offset:2px; min-height:18px; cursor:text; white-space:pre-wrap;"'
  );
}

function extractEmailBodyHtml(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;

  return bodyHtml.replace("[[trackingImage]]", "");
}
