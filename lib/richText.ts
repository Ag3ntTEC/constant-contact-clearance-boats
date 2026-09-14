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
  let boldDepth = 0;
  let italicDepth = 0;
  let underlineDepth = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(value)) !== null) {
    appendText(value.slice(lastIndex, match.index));
    handleTag(match[0]);
    lastIndex = match.index + match[0].length;
  }

  appendText(value.slice(lastIndex));

  if (boldDepth > 0) {
    output.push("</strong>");
  }
  if (italicDepth > 0) {
    output.push("</em>");
  }
  if (underlineDepth > 0) {
    output.push("</u>");
  }

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
    if (/^<(?:b|strong)\b/i.test(tag)) {
      if (boldDepth === 0) {
        output.push("<strong>");
      }
      boldDepth += 1;
      return;
    }

    if (/^<\/(?:b|strong)>/i.test(tag)) {
      if (boldDepth > 0) {
        boldDepth -= 1;
        if (boldDepth === 0) {
          output.push("</strong>");
        }
      }
      return;
    }

    if (/^<(?:i|em)\b/i.test(tag)) {
      if (italicDepth === 0) output.push("<em>");
      italicDepth += 1;
      return;
    }

    if (/^<\/(?:i|em)>/i.test(tag)) {
      if (italicDepth > 0) {
        italicDepth -= 1;
        if (italicDepth === 0) output.push("</em>");
      }
      return;
    }

    if (/^<u\b/i.test(tag)) {
      if (underlineDepth === 0) output.push("<u>");
      underlineDepth += 1;
      return;
    }

    if (/^<\/u>/i.test(tag)) {
      if (underlineDepth > 0) {
        underlineDepth -= 1;
        if (underlineDepth === 0) output.push("</u>");
      }
      return;
    }

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

export function preserveEditableWhitespace(value: string): string {
  return value
    .replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")
    .replace(/ {2,}/g, (spaces) => "\u00a0".repeat(spaces.length));
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
    .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
    .replace(/ {2,}/g, (spaces) => "&nbsp;".repeat(spaces.length))
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
