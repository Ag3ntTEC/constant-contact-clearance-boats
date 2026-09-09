"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadHeaderImageHistory,
  type HeaderImageHistoryEntry,
} from "@/lib/header-image-history";

type HeaderImageHistoryModalProps = {
  onClose: () => void;
  onSelect: (entry: HeaderImageHistoryEntry) => void;
};

export function HeaderImageHistoryModal({ onClose, onSelect }: HeaderImageHistoryModalProps) {
  const [entries, setEntries] = useState<HeaderImageHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return entries;
    return entries.filter(
      (entry) =>
        entry.campaignName.toLowerCase().includes(normalizedQuery) ||
        entry.imageUrl.toLowerCase().includes(normalizedQuery)
    );
  }, [entries, query]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let isCurrent = true;

    async function loadEntries() {
      try {
        const nextEntries = await loadHeaderImageHistory();
        if (isCurrent) setEntries(nextEntries);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load shared image history."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadEntries();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function copyImageUrl(entry: HeaderImageHistoryEntry) {
    try {
      await navigator.clipboard.writeText(entry.imageUrl);
      setCopiedId(entry.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-labelledby="header-image-history-title"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-ink" id="header-image-history-title">
              Header image history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Images recorded from successful drafts and shared across every signed-in device.
            </p>
          </div>
          <button
            aria-label="Close header image history"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xl text-slate-600 hover:border-harbor hover:text-harbor"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <label className="block">
            <span className="sr-only">Search image history</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-harbor/20 placeholder:text-slate-400 focus:border-harbor focus:ring-4"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by campaign name or image URL"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="font-semibold text-slate-700">Loading shared image history...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="font-semibold text-red-800">Image history is unavailable</p>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          ) : filteredEntries.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredEntries.map((entry) => (
                <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" key={entry.id}>
                  <div className="flex h-40 items-center justify-center bg-slate-100 p-3">
                    <img
                      alt={`Header used in ${entry.campaignName}`}
                      className="max-h-full max-w-full rounded object-contain"
                      src={entry.imageUrl}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-sm font-bold text-ink" title={entry.campaignName}>
                      {entry.campaignName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatHistoryDate(entry.usedAt)} · {entry.imageWidth}px wide
                    </p>
                    <a
                      className="mt-3 block truncate rounded bg-slate-50 px-2 py-1.5 text-xs text-harbor underline"
                      href={entry.imageUrl}
                      rel="noreferrer"
                      target="_blank"
                      title={entry.imageUrl}
                    >
                      {entry.imageUrl}
                    </a>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-md bg-harbor px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"
                        onClick={() => onSelect(entry)}
                        type="button"
                      >
                        Use this image
                      </button>
                      <button
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-harbor hover:text-harbor"
                        onClick={() => copyImageUrl(entry)}
                        type="button"
                      >
                        {copiedId === entry.id ? "Copied" : "Copy link"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="font-semibold text-slate-700">
                {entries.length ? "No matching images" : "No header image history yet"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {entries.length
                  ? "Try a different campaign name or URL."
                  : "Images will appear here after you successfully create a Constant Contact draft."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
