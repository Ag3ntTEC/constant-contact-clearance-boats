"use client";

import { useEffect, useRef } from "react";
import { formatRichText } from "@/lib/richText";

export function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none ring-harbor/20 placeholder:text-slate-400 focus:border-harbor focus:ring-4"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

export function RichTextEditor({
  compact = false,
  label,
  onChange,
  value,
}: {
  compact?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || document.activeElement === editor) {
      return;
    }

    const nextHtml = formatRichText(value);

    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  function emitChange() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    onChange(editor.innerHTML);
  }

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange();
    }
  }

  function insertPlainText(text: string) {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) {
      return;
    }

    const activeRange = selection.rangeCount ? selection.getRangeAt(0) : null;
    const range =
      activeRange && editor.contains(activeRange.commonAncestorContainer)
        ? activeRange
        : selectionRangeRef.current &&
            editor.contains(selectionRangeRef.current.commonAncestorContainer)
          ? selectionRangeRef.current
          : document.createRange();

    if (!editor.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    editor.focus();
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
    selectionRangeRef.current = range.cloneRange();
    emitChange();
  }

  return (
    <div className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div
        className={`mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-ink shadow-sm outline-none ring-harbor/20 focus:border-harbor focus:ring-4 ${
          compact ? "min-h-12" : "min-h-36"
        }`}
        contentEditable
        onBlur={() => onChange(formatRichText(editorRef.current?.innerHTML ?? ""))}
        onFocus={rememberSelection}
        onInput={() => {
          rememberSelection();
          emitChange();
        }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onPaste={(event) => {
          event.preventDefault();
          insertPlainText(event.clipboardData.getData("text/plain"));
        }}
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
      />
    </div>
  );
}
