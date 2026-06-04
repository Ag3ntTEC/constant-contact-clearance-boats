"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { StepShell } from "../_components/StepShell";
import { NextStepLink } from "../_components/NextStepLink";
import {
  maximumBoats,
  minimumBoats,
  useCampaignDraft,
} from "../_components/useCampaignDraft";
import type { Boat } from "@/lib/types";

type BoatsResponse = {
  boats: Boat[];
  error?: string;
};

const pageSize = 30;

export default function BoatSelectionPage() {
  const {
    selectedBoatIds,
    selectedBoats,
    selectionMessage,
    toggleBoat,
    removeBoat,
    moveBoat,
  } = useCampaignDraft();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoats() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/boats");
        const data = (await response.json()) as BoatsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "The boat feed could not be loaded.");
        }

        setBoats(data.boats);
        setActiveBoatId(data.boats[0]?.id ?? null);
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
  }, [makeFilter, maxLength, maxPrice, minLength, minPrice, searchTerm]);

  const makes = useMemo(
    () =>
      Array.from(new Set(boats.map((boat) => boat.make).filter(Boolean))).sort() as string[],
    [boats]
  );

  const filteredBoats = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const minPriceNumber = parseOptionalNumber(minPrice);
    const maxPriceNumber = parseOptionalNumber(maxPrice);
    const minLengthNumber = parseOptionalNumber(minLength);
    const maxLengthNumber = parseOptionalNumber(maxLength);

    return [...boats]
      .sort((a, b) => Number(b.isClearance) - Number(a.isClearance))
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
        const price = boat.clearancePrice ?? boat.salePrice ?? boat.price;
        const length = boat.lengthFeet;

        return (
          (!query || searchableText.includes(query)) &&
          (!makeFilter || boat.make === makeFilter) &&
          (minPriceNumber === undefined || (price ?? 0) >= minPriceNumber) &&
          (maxPriceNumber === undefined || (price ?? 0) <= maxPriceNumber) &&
          (minLengthNumber === undefined || (length ?? 0) >= minLengthNumber) &&
          (maxLengthNumber === undefined || (length ?? 0) <= maxLengthNumber)
        );
      });
  }, [boats, makeFilter, maxLength, maxPrice, minLength, minPrice, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredBoats.length / pageSize));
  const visibleBoats = filteredBoats.slice((page - 1) * pageSize, page * pageSize);
  const activeBoat =
    boats.find((boat) => boat.id === activeBoatId) ??
    selectedBoats[0] ??
    visibleBoats[0] ??
    null;
  const canContinue =
    selectedBoats.length >= minimumBoats && selectedBoats.length <= maximumBoats;

  function handleToggle(boat: Boat) {
    toggleBoat(boat);
    setActiveBoatId(boat.id);
  }

  return (
    <StepShell
      description="Search the feed and select between 7 and 10 boats for the campaign."
      selectedCount={selectedBoats.length}
      title="Select boats"
    >
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">
              Selected {selectedBoats.length} of {maximumBoats}
            </p>
            <p
              className={`mt-1 text-sm ${
                canContinue ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {selectionMessage}
            </p>
          </div>
          {canContinue ? (
            <NextStepLink href="/campaign/new/editor" label="Continue to editor" />
          ) : (
            <button
              className="rounded-md bg-slate-300 px-4 py-2 text-sm font-semibold text-white"
              disabled
              type="button"
            >
              Continue to editor
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <Filters
            makeFilter={makeFilter}
            makes={makes}
            maxLength={maxLength}
            maxPrice={maxPrice}
            minLength={minLength}
            minPrice={minPrice}
            searchTerm={searchTerm}
            setMakeFilter={setMakeFilter}
            setMaxLength={setMaxLength}
            setMaxPrice={setMaxPrice}
            setMinLength={setMinLength}
            setMinPrice={setMinPrice}
            setSearchTerm={setSearchTerm}
          />

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
            <p>
              Showing {visibleBoats.length} of {filteredBoats.length} boats
            </p>
            <p>No images load in this list.</p>
          </div>

          {isLoading ? (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Loading boat feed...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
                <div className="hidden bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 lg:grid lg:grid-cols-[42px_minmax(220px,1.5fr)_120px_80px_80px_minmax(180px,1fr)_96px]">
                  <span />
                  <span>Boat title</span>
                  <span>Price</span>
                  <span>LOA</span>
                  <span>Beam</span>
                  <span>Engine</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {visibleBoats.map((boat) => (
                    <BoatRow
                      boat={boat}
                      isSelected={selectedBoatIds.has(boat.id)}
                      isSelectionFull={selectedBoats.length >= maximumBoats}
                      key={boat.id}
                      onFocus={() => setActiveBoatId(boat.id)}
                      onToggle={() => handleToggle(boat)}
                    />
                  ))}
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
            moveBoat={moveBoat}
            removeBoat={removeBoat}
            selectedBoats={selectedBoats}
          />
        </aside>
      </div>
    </StepShell>
  );
}

function Filters({
  makeFilter,
  makes,
  maxLength,
  maxPrice,
  minLength,
  minPrice,
  searchTerm,
  setMakeFilter,
  setMaxLength,
  setMaxPrice,
  setMinLength,
  setMinPrice,
  setSearchTerm,
}: {
  makeFilter: string;
  makes: string[];
  maxLength: string;
  maxPrice: string;
  minLength: string;
  minPrice: string;
  searchTerm: string;
  setMakeFilter: (value: string) => void;
  setMaxLength: (value: string) => void;
  setMaxPrice: (value: string) => void;
  setMinLength: (value: string) => void;
  setMinPrice: (value: string) => void;
  setSearchTerm: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <label className="md:col-span-2 xl:col-span-2">
        <span className="text-sm font-medium text-slate-700">Search</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Title, model, engine, clearance"
          type="search"
          value={searchTerm}
        />
      </label>
      <label>
        <span className="text-sm font-medium text-slate-700">Make</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
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
      <RangeFields
        label="Price"
        maxValue={maxPrice}
        minValue={minPrice}
        onMaxChange={setMaxPrice}
        onMinChange={setMinPrice}
      />
      <RangeFields
        label="Length"
        maxValue={maxLength}
        minValue={minLength}
        onMaxChange={setMaxLength}
        onMinChange={setMinLength}
      />
    </div>
  );
}

function RangeFields({
  label,
  maxValue,
  minValue,
  onMaxChange,
  onMinChange,
}: {
  label: string;
  maxValue: string;
  minValue: string;
  onMaxChange: (value: string) => void;
  onMinChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label>
        <span className="text-sm font-medium text-slate-700">{label} min</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
          inputMode="numeric"
          onChange={(event) => onMinChange(event.target.value)}
          placeholder="Min"
          value={minValue}
        />
      </label>
      <label>
        <span className="text-sm font-medium text-slate-700">{label} max</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-harbor focus:ring-2"
          inputMode="numeric"
          onChange={(event) => onMaxChange(event.target.value)}
          placeholder="Max"
          value={maxValue}
        />
      </label>
    </div>
  );
}

function BoatRow({
  boat,
  isSelected,
  isSelectionFull,
  onFocus,
  onToggle,
}: {
  boat: Boat;
  isSelected: boolean;
  isSelectionFull: boolean;
  onFocus: () => void;
  onToggle: () => void;
}) {
  const checkboxDisabled = !isSelected && isSelectionFull;

  return (
    <label
      className={`block cursor-pointer px-3 py-3 hover:bg-slate-50 ${
        isSelected ? "bg-harbor/5" : "bg-white"
      }`}
      onClick={onFocus}
    >
      <div className="grid gap-2 lg:grid-cols-[42px_minmax(220px,1.5fr)_120px_80px_80px_minmax(180px,1fr)_96px] lg:items-center">
        <div>
          <input
            checked={isSelected}
            className="h-4 w-4 rounded border-slate-300 text-harbor focus:ring-harbor"
            disabled={checkboxDisabled}
            onChange={onToggle}
            type="checkbox"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{boat.displayTitle ?? boat.title}</p>
          <p className="text-xs text-slate-500 lg:hidden">
            {boat.priceLabel ?? "Call for clearance price"} | LOA {boat.formattedLoa ?? "N/A"} | Beam{" "}
            {boat.formattedBeam ?? "N/A"}
          </p>
        </div>
        <Cell>{boat.priceLabel ?? "Call"}</Cell>
        <Cell>{boat.formattedLoa ?? "N/A"}</Cell>
        <Cell>{boat.formattedBeam ?? "N/A"}</Cell>
        <Cell>{boat.engineDisplay ?? "N/A"}</Cell>
        <Cell>{isSelected ? "Selected" : checkboxDisabled ? "Limit met" : "Not selected"}</Cell>
      </div>
    </label>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <div className="hidden text-sm text-slate-700 lg:block">{children}</div>;
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
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Preview</h2>
      {boat ? (
        <div className="mt-4">
          <a href={boat.webLink ?? boat.detailUrl ?? "#"} rel="noreferrer" target="_blank">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
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
          <p className="mt-2 text-sm text-slate-600">
            LOA {boat.formattedLoa ?? "N/A"} | Beam {boat.formattedBeam ?? "N/A"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
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

function SelectedBoatsPanel({
  moveBoat,
  removeBoat,
  selectedBoats,
}: {
  moveBoat: (boatId: string, direction: "up" | "down") => void;
  removeBoat: (boatId: string) => void;
  selectedBoats: Boat[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Selected order</h2>
      <p className="mt-1 text-sm text-slate-500">
        This order controls the final email.
      </p>
      <div className="mt-4 space-y-3">
        {selectedBoats.length ? (
          selectedBoats.map((boat, index) => (
            <div className="rounded-md border border-slate-200 p-3" key={boat.id}>
              <p className="text-xs font-semibold text-slate-400">#{index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{boat.displayTitle ?? boat.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {boat.priceLabel ?? "Call"} | LOA {boat.formattedLoa ?? "N/A"} | Beam{" "}
                {boat.formattedBeam ?? "N/A"} | {boat.engineDisplay || "Engine N/A"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => moveBoat(boat.id, "up")}
                  type="button"
                >
                  Up
                </button>
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  disabled={index === selectedBoats.length - 1}
                  onClick={() => moveBoat(boat.id, "down")}
                  type="button"
                >
                  Down
                </button>
                <button
                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                  onClick={() => removeBoat(boat.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
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

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
}
