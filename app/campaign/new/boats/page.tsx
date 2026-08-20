"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ActionFooter, StepShell } from "../_components/StepShell";
import { useCampaignDraft } from "../_components/useCampaignDraft";
import type { Boat } from "@/lib/types";

type BoatsResponse = {
  boats: Boat[];
  error?: string;
  source?: "live" | "fallback";
  warning?: string;
};

const pageSize = 30;

type SortOption =
  | "clearance"
  | "newest"
  | "price-low"
  | "price-high"
  | "length-short"
  | "length-long"
  | "title";

export default function BoatSelectionPage() {
  const {
    selectedBoatIds,
    selectedBoats,
    selectionMessage,
    toggleBoat,
    removeBoat,
    reorderBoats,
  } = useCampaignDraft();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("clearance");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedWarning, setFeedWarning] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoats() {
      try {
        setIsLoading(true);
        setError(null);
        setFeedWarning(null);
        const response = await fetch("/api/boats");
        const data = (await response.json()) as BoatsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "The boat feed could not be loaded.");
        }

        setBoats(data.boats);
        setActiveBoatId(data.boats[0]?.id ?? null);
        setFeedWarning(data.warning ?? null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The boat feed could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadBoats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [makeFilter, searchTerm, sortBy]);

  const makes = useMemo(
    () =>
      Array.from(new Set(boats.map((boat) => boat.make).filter(Boolean))).sort() as string[],
    [boats]
  );

  const filteredBoats = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...boats]
      .filter((boat) => {
        const searchableText = [
          boat.displayTitle,
          boat.title,
          boat.make,
          boat.model,
          boat.priceLabel,
          boat.formattedLoa,
          boat.formattedBeam,
          boat.engineDisplay,
          boat.isClearance ? "clearance" : undefined,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!query || searchableText.includes(query)) &&
          (!makeFilter || boat.make === makeFilter)
        );
      })
      .sort((a, b) => compareBoats(a, b, sortBy));
  }, [boats, makeFilter, searchTerm, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredBoats.length / pageSize));
  const visibleBoats = filteredBoats.slice((page - 1) * pageSize, page * pageSize);
  const activeBoat =
    boats.find((boat) => boat.id === activeBoatId) ??
    selectedBoats[0] ??
    visibleBoats[0] ??
    null;
  const canContinue = selectedBoats.length > 0;
  const hasActiveFilters = Boolean(searchTerm || makeFilter);

  function handleToggle(boat: Boat) {
    toggleBoat(boat);
    setActiveBoatId(boat.id);
  }

  function clearFilters() {
    setSearchTerm("");
    setMakeFilter("");
  }

  return (
    <StepShell
      description="Search the feed and select the boats for the campaign."
      footer={
        <ActionFooter
          backHref="/campaign/new/settings"
          nextDescription={
            canContinue
              ? `${selectedBoats.length} boat${selectedBoats.length === 1 ? "" : "s"} selected for the email.`
              : "Select at least one boat to continue."
          }
          nextDisabled={!canContinue}
          nextHref="/campaign/new/editor"
          nextLabel="Continue to Editor"
        />
      }
      selectedCount={selectedBoats.length}
      title="Select boats"
    >
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-[var(--tight-shadow)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-harbor">
              Inventory Selection
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${
                canContinue ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {selectionMessage}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasActiveFilters ? (
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            ) : null}
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              disabled={!selectedBoats.length}
              onClick={() => setActiveBoatId(selectedBoats[0]?.id ?? activeBoatId)}
              type="button"
            >
              Review selected
            </button>
          </div>
        </div>
      </div>

      {feedWarning ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <p className="font-bold">Live feed unavailable</p>
          <p className="mt-1">{feedWarning}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-[var(--surface-shadow)]">
          <Filters
            clearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            makeFilter={makeFilter}
            makes={makes}
            searchTerm={searchTerm}
            setMakeFilter={setMakeFilter}
            setSearchTerm={setSearchTerm}
            setSortBy={setSortBy}
            sortBy={sortBy}
          />

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {visibleBoats.length} of {filteredBoats.length} boats
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {hasActiveFilters ? "Filtered results" : "Full feed"}
            </p>
          </div>

          {isLoading ? (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
              Loading boat feed...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
                <div className="hidden bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 lg:grid lg:grid-cols-[42px_minmax(220px,1.5fr)_130px_80px_80px_minmax(180px,1fr)_110px]">
                  <span />
                  <span>Boat title</span>
                  <span>Price</span>
                  <span>LOA</span>
                  <span>Beam</span>
                  <span>Engine</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {visibleBoats.length ? (
                    visibleBoats.map((boat) => (
                      <BoatRow
                        boat={boat}
                        isActive={activeBoat?.id === boat.id}
                        isSelected={selectedBoatIds.has(boat.id)}
                        key={boat.id}
                        onFocus={() => setActiveBoatId(boat.id)}
                        onToggle={() => handleToggle(boat)}
                      />
                    ))
                  ) : (
                    <NoResults hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
                  )}
                </div>
              </div>

              <Pagination
                page={page}
                pageCount={pageCount}
                setPage={setPage}
              />
            </>
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <PreviewPanel boat={activeBoat} />
          <SelectedBoatsPanel
            reorderBoats={reorderBoats}
            removeBoat={removeBoat}
            selectedBoats={selectedBoats}
          />
        </aside>
      </div>
    </StepShell>
  );
}

function Filters({
  clearFilters,
  hasActiveFilters,
  makeFilter,
  makes,
  searchTerm,
  setMakeFilter,
  setSearchTerm,
  setSortBy,
  sortBy,
}: {
  clearFilters: () => void;
  hasActiveFilters: boolean;
  makeFilter: string;
  makes: string[];
  searchTerm: string;
  setMakeFilter: (value: string) => void;
  setSearchTerm: (value: string) => void;
  setSortBy: (value: SortOption) => void;
  sortBy: SortOption;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Boat Feed</h2>
          <p className="mt-1 text-sm text-slate-500">Search, sort, and preview before selecting.</p>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
          type="button"
        >
          Clear filters
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label>
          <span className="text-sm font-medium text-slate-700">Search</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-harbor/20 placeholder:text-slate-400 focus:border-harbor focus:ring-4"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Title, model, engine, clearance"
            type="search"
            value={searchTerm}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Make</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-harbor/20 focus:border-harbor focus:ring-4"
            onChange={(event) => setMakeFilter(event.target.value)}
            value={makeFilter}
          >
            <option value="">All makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Sort by</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-harbor/20 focus:border-harbor focus:ring-4"
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            value={sortBy}
          >
            <option value="clearance">Clearance first</option>
            <option value="newest">Newest year first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="length-short">Length: shortest first</option>
            <option value="length-long">Length: longest first</option>
            <option value="title">Boat title: A to Z</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function BoatRow({
  boat,
  isActive,
  isSelected,
  onFocus,
  onToggle,
}: {
  boat: Boat;
  isActive: boolean;
  isSelected: boolean;
  onFocus: () => void;
  onToggle: () => void;
}) {
  return (
    <label
      className={`block cursor-pointer border-l-4 px-3 py-3 hover:bg-slate-50 ${
        isSelected
          ? "border-l-harbor bg-harbor/5"
          : isActive
            ? "border-l-signal bg-signal/10"
            : "border-l-transparent bg-white"
      }`}
      onClick={onFocus}
    >
      <div className="grid gap-2 lg:grid-cols-[42px_minmax(220px,1.5fr)_130px_80px_80px_minmax(180px,1fr)_110px] lg:items-center">
        <div>
          <input
            checked={isSelected}
            className="h-4 w-4 rounded border-slate-300 text-harbor focus:ring-harbor"
            onChange={onToggle}
            type="checkbox"
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{boat.displayTitle ?? boat.title}</p>
            {boat.isClearance ? (
              <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                Clearance
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 lg:hidden">
            {boat.priceLabel ?? "Call for clearance price"} | LOA {boat.formattedLoa ?? "N/A"} | Beam{" "}
            {boat.formattedBeam ?? "N/A"}
          </p>
        </div>
        <div className="hidden text-sm font-bold text-red-700 lg:block">
          {boat.priceLabel ?? "Call"}
        </div>
        <Cell>{boat.formattedLoa ?? "N/A"}</Cell>
        <Cell>{boat.formattedBeam ?? "N/A"}</Cell>
        <Cell>{boat.engineDisplay ?? "N/A"}</Cell>
        <div className="hidden lg:block">
          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${
              isSelected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {isSelected ? "Selected" : "Available"}
          </span>
        </div>
      </div>
    </label>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <div className="hidden text-sm text-slate-700 lg:block">{children}</div>;
}

function NoResults({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="bg-white p-10 text-center">
      <p className="text-base font-bold text-ink">No boats match this view.</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasActiveFilters
          ? "Try clearing the search or choosing a different make."
          : "The feed loaded, but no boats are available to show."}
      </p>
      {hasActiveFilters ? (
        <button
          className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor"
          onClick={onClear}
          type="button"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  setPage,
}: {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page === 1}
        onClick={() => setPage(Math.max(1, page - 1))}
        type="button"
      >
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {pageCount}
      </span>
      <button
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-harbor hover:text-harbor disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page === pageCount}
        onClick={() => setPage(Math.min(pageCount, page + 1))}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

function PreviewPanel({ boat }: { boat: Boat | null }) {
  const image = boat?.primaryImageUrl ?? boat?.imageUrl;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-[var(--tight-shadow)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">Active Preview</h2>
        {boat?.isClearance ? (
          <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
            Clearance
          </span>
        ) : null}
      </div>
      {boat ? (
        <div className="mt-4">
          <a href={boat.webLink ?? boat.detailUrl ?? "#"} rel="noreferrer" target="_blank">
            {image ? (
              <img
                alt={boat.displayTitle ?? boat.title}
                className="aspect-[4/3] w-full rounded-md bg-slate-100 object-cover"
                src={image}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">
                No image available
              </div>
            )}
          </a>
          <p className="mt-3 font-bold text-ink">{boat.displayTitle ?? boat.title}</p>
          <p className="mt-1 text-lg font-bold text-red-700">
            {boat.priceLabel ?? "Call for clearance price"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Spec label="LOA" value={boat.formattedLoa ?? "N/A"} />
            <Spec label="Beam" value={boat.formattedBeam ?? "N/A"} />
          </div>
          <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            {boat.engineDisplay || "Engine N/A"}
          </p>
          <a
            className="mt-3 inline-flex text-sm font-semibold text-harbor underline"
            href={boat.webLink ?? boat.detailUrl ?? "#"}
            rel="noreferrer"
            target="_blank"
          >
            View All Details
          </a>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Focus a boat to preview it.</p>
      )}
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function SelectedBoatsPanel({
  reorderBoats,
  removeBoat,
  selectedBoats,
}: {
  reorderBoats: (sourceBoatId: string, targetBoatId: string) => void;
  removeBoat: (boatId: string) => void;
  selectedBoats: Boat[];
}) {
  const [draggedBoatId, setDraggedBoatId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-[var(--tight-shadow)]">
      <h2 className="text-lg font-bold text-ink">Selected Order</h2>
      <p className="mt-1 text-sm text-slate-500">
        Drag boats by the handle to set the final email order.
      </p>
      <div className="mt-4 space-y-3">
        {selectedBoats.length ? (
          selectedBoats.map((boat, index) => (
            <div
              className={`rounded-md border bg-slate-50 p-3 transition ${dropTargetId === boat.id ? "border-harbor ring-2 ring-harbor/20" : "border-slate-200"} ${draggedBoatId === boat.id ? "opacity-50" : ""}`}
              draggable
              key={boat.id}
              onDragEnd={() => { setDraggedBoatId(null); setDropTargetId(null); }}
              onDragOver={(event) => { event.preventDefault(); setDropTargetId(boat.id); }}
              onDragStart={(event) => { setDraggedBoatId(boat.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", boat.id); }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggedBoatId;
                if (sourceId) reorderBoats(sourceId, boat.id);
                setDraggedBoatId(null);
                setDropTargetId(null);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span aria-hidden="true" className="cursor-grab select-none pt-1 text-lg leading-none text-slate-400 active:cursor-grabbing" title="Drag to reorder">⠿</span>
                  <div>
                  <p className="text-xs font-semibold text-slate-400">#{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{boat.displayTitle ?? boat.title}</p>
                  </div>
                </div>
                <button
                  aria-label={`Remove ${boat.displayTitle ?? boat.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-bold text-red-700 hover:bg-red-50"
                  onClick={() => removeBoat(boat.id)}
                  title="Remove"
                  type="button"
                >
                  x
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {boat.priceLabel ?? "Call"} | LOA {boat.formattedLoa ?? "N/A"} | Beam{" "}
                {boat.formattedBeam ?? "N/A"} | {boat.engineDisplay || "Engine N/A"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Selected boats will appear here.
          </div>
        )}
      </div>
    </section>
  );
}

function compareBoats(a: Boat, b: Boat, sortBy: SortOption): number {
  const aPrice = a.clearancePrice ?? a.salePrice ?? a.price;
  const bPrice = b.clearancePrice ?? b.salePrice ?? b.price;

  switch (sortBy) {
    case "newest":
      return compareOptionalNumbers(a.year, b.year, "desc");
    case "price-low":
      return compareOptionalNumbers(aPrice, bPrice, "asc");
    case "price-high":
      return compareOptionalNumbers(aPrice, bPrice, "desc");
    case "length-short":
      return compareOptionalNumbers(a.lengthFeet, b.lengthFeet, "asc");
    case "length-long":
      return compareOptionalNumbers(a.lengthFeet, b.lengthFeet, "desc");
    case "title":
      return (a.displayTitle ?? a.title).localeCompare(b.displayTitle ?? b.title);
    case "clearance":
    default:
      return Number(b.isClearance) - Number(a.isClearance);
  }
}

function compareOptionalNumbers(
  a: number | undefined,
  b: number | undefined,
  direction: "asc" | "desc"
): number {
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return direction === "asc" ? a - b : b - a;
}
