"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { replaceDraftWorkspaceFromHistory } from "@/lib/draft-workspace";
import type {
  DraftHistorySummary,
  ReconciledDraftHistoryEntry,
} from "@/lib/history-types";

type DraftsResponse = {
  drafts?: DraftHistorySummary[];
  error?: string;
};

type DraftResponse = {
  draft?: ReconciledDraftHistoryEntry;
  error?: string;
};

export default function DraftHistoryPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftHistorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const visibleDrafts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return drafts;

    return drafts.filter((draft) =>
      [draft.campaignName, draft.subject, ...draft.boatNames]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [drafts, query]);

  useEffect(() => {
    void loadDrafts();
  }, []);

  async function loadDrafts() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/drafts", { cache: "no-store" });
      const data = (await response.json()) as DraftsResponse;

      if (!response.ok) throw new Error(data.error ?? "Unable to load draft history.");
      setDrafts(data.drafts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load draft history.");
    } finally {
      setIsLoading(false);
    }
  }

  async function editAsNewProject(draft: DraftHistorySummary) {
    try {
      setBusyDraftId(draft.id);
      setError(null);
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as DraftResponse;

      if (!response.ok || !data.draft) {
        throw new Error(data.error ?? "Unable to open this draft.");
      }

      const restored = data.draft;
      const notice = createRestoreNotice(restored);
      replaceDraftWorkspaceFromHistory({
        notice,
        selectedBoats: restored.selectedBoats,
        settings: restored.settings,
        sourceDraftId: restored.id,
      });
      router.push("/campaign/new/settings");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open this draft.");
      setBusyDraftId(null);
    }
  }

  async function deleteHistoryEntry(draft: DraftHistorySummary) {
    const confirmed = window.confirm(
      draft.campaignId
        ? `Delete “${draft.campaignName}” from Constant Contact and shared history? This cannot be undone in the app.`
        : `Delete “${draft.campaignName}” from shared draft history?`
    );

    if (!confirmed) return;

    try {
      setBusyDraftId(draft.id);
      setError(null);
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Unable to delete this history entry.");

      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setExpandedDraftId((current) => (current === draft.id ? null : current));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete this history entry."
      );
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <main className="min-h-screen bg-foam">
      <section className="mx-auto min-h-screen max-w-[1200px] px-5 py-6 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-harbor hover:text-tide"
              href="/"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-harbor text-xs text-white">
                WM
              </span>
              Campaign Studio
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-ink">Draft history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review successful Constant Contact drafts from any device, then open one as a fresh
              project with the latest live boat details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-tide"
              href="/campaign/new/settings"
            >
              New Campaign
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="py-7">
          <div className="mb-6 rounded-md border border-slate-200 bg-white p-5 shadow-[var(--tight-shadow)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <label className="block flex-1">
                <span className="text-sm font-semibold text-slate-700">Search draft history</span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-harbor/20 placeholder:text-slate-400 focus:border-harbor focus:ring-4"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Campaign, subject, or boat"
                  type="search"
                  value={query}
                />
              </label>
              <div className="rounded-md border border-harbor/20 bg-mist px-4 py-3 text-sm font-bold text-tide">
                {drafts.length} saved draft{drafts.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-6 flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 md:flex-row md:items-center md:justify-between">
              <p>{error}</p>
              <button
                className="rounded-md border border-red-300 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-100"
                onClick={() => void loadDrafts()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <EmptyState title="Loading shared draft history..." />
          ) : visibleDrafts.length ? (
            <div className="space-y-4">
              {visibleDrafts.map((draft) => {
                const isBusy = busyDraftId === draft.id;
                const isExpanded = expandedDraftId === draft.id;

                return (
                  <article
                    className="rounded-md border border-slate-200 bg-white p-5 shadow-[var(--surface-shadow)]"
                    key={draft.id}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Created
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {formatHistoryDate(draft.createdAt)}
                          </span>
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-ink">{draft.campaignName}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {draft.subject || "No subject line"}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-harbor">
                          {draft.boatCount} boat{draft.boatCount === 1 ? "" : "s"} in the saved
                          selection
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-harbor hover:text-harbor"
                          onClick={() =>
                            setExpandedDraftId((current) => (current === draft.id ? null : draft.id))
                          }
                          type="button"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                        <button
                          className="rounded-md bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={isBusy}
                          onClick={() => void editAsNewProject(draft)}
                          type="button"
                        >
                          {isBusy ? "Refreshing inventory..." : "Edit as new project"}
                        </button>
                        <button
                          className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isBusy}
                          onClick={() => void deleteHistoryEntry(draft)}
                          type="button"
                        >
                          Delete draft
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 lg:grid-cols-[1fr_300px]">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                            Saved boats
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {draft.boatNames.length ? (
                              draft.boatNames.map((boatName, index) => (
                                <span
                                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                  key={`${boatName}-${index}`}
                                >
                                  {index + 1}. {boatName}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No boats were saved.</span>
                            )}
                          </div>
                        </div>
                        <dl className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
                          <div>
                            <dt className="font-semibold text-slate-500">Constant Contact ID</dt>
                            <dd className="mt-1 break-all text-slate-700">
                              {draft.campaignId ?? "Not returned"}
                            </dd>
                          </div>
                          {draft.sourceDraftId ? (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <dt className="font-semibold text-slate-500">Created from history</dt>
                              <dd className="mt-1 text-slate-700">Yes</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description={
                drafts.length
                  ? "Try a different campaign, subject, or boat name."
                  : "Successful Constant Contact drafts will appear here automatically."
              }
              title={drafts.length ? "No drafts match your search" : "No draft history yet"}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyState({ description, title }: { description?: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <p className="text-lg font-bold text-ink">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

function createRestoreNotice(draft: ReconciledDraftHistoryEntry) {
  if (draft.inventorySource === "fallback") {
    return draft.reconciliationWarning ?? "Saved boat details were preserved.";
  }

  const refreshed = `${draft.refreshedBoatCount} existing boat${
    draft.refreshedBoatCount === 1 ? " was" : "s were"
  } refreshed from live inventory.`;
  const removed = draft.removedBoats.length
    ? ` ${draft.removedBoats.length} unavailable boat${
        draft.removedBoats.length === 1 ? " was" : "s were"
      } removed: ${draft.removedBoats.map((boat) => boat.name).join(", ")}.`
    : " No unavailable boats were found.";

  return `${refreshed}${removed}`;
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
