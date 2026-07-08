export function hasRichTextContent(value: string): boolean {
  return stripRichText(value).trim().length > 0;
}

export function stripRichText(value: string): string {
  return decodeBasicHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(?:div|p)[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function formatRichText(value: string): string {
  const output: string[] = [];
  const tagPattern = /<[^>]+>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(value)) !== null) {
    appendText(value.slice(lastIndex, match.index));
    handleTag(match[0]);
    lastIndex = match.index + match[0].length;
  }

  appendText(value.slice(lastIndex));

  return collapseExtraBreaks(output.join(""));

  function appendText(text: string) {
    if (!text) {
      return;
    }

    const escaped = formatEscapedText(escapeHtml(decodeBasicHtmlEntities(text)));

    if (escaped) {
      output.push(escaped);
    }
  }

  function handleTag(tag: string) {
    if (/^<br\b/i.test(tag)) {
      output.push("<br />");
      return;
    }

    if (/^<(?:div|p)\b/i.test(tag)) {
      appendBreakIfNeeded(output);
      return;
    }

    if (/^<\/(?:div|p)>/i.test(tag)) {
      appendBreakIfNeeded(output);
    }
  }
}

function appendBreakIfNeeded(output: string[]) {
  const current = output.join("");

  if (current && !current.endsWith("<br />")) {
    output.push("<br />");
  }
}

function collapseExtraBreaks(value: string): string {
  return value.replace(/(?:<br \/>){3,}/g, "<br /><br />").replace(/^(?:<br \/>)+|(?:<br \/>)+$/g, "");
}

function formatEscapedText(value: string): string {
  return value
    .replace(/\s\[\[bullet\]\]\s/g, " &bull; ")
    .replace(/\s\|\s/g, " &bull; ")
    .replace(/\r?\n/g, "<br />");
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&bull;/gi, " [[bullet]] ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#96;/gi, "`");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
