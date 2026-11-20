import type { Boat } from "./types";

const MEDIA_API = "https://winnisquammarine.com/wp-json/wp/v2/media";
const LOOKUP_CONCURRENCY = 12;
const LOOKUP_TIMEOUT_MS = 20_000;
const VERIFIED_DIRECTORY_TTL_MS = 5 * 60_000;
const MISSING_DIRECTORY_TTL_MS = 60_000;

type MediaRecord = {
  source_url?: string;
  media_type?: string | null;
};

const directoryCache = new Map<
  string,
  { pictureKey: string; directory: string | undefined; expiresAt: number }
>();

export async function resolveBoatImages(boats: Boat[]): Promise<Boat[]> {
  const now = Date.now();
  for (const [id, entry] of directoryCache) {
    if (entry.expiresAt <= now) directoryCache.delete(id);
  }

  const signal = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
  const pending = boats.entries();
  const resolved = new Array<Boat>(boats.length);

  await Promise.all(
    Array.from({ length: Math.min(LOOKUP_CONCURRENCY, boats.length) }, async () => {
      for (const [index, boat] of pending) {
        const pictures = await resolvePictures(boat, signal);
        resolved[index] = { ...boat, pictures, imageUrl: pictures[0], primaryImageUrl: pictures[0] };
      }
    })
  );

  return resolved;
}

async function resolvePictures(boat: Boat, signal: AbortSignal): Promise<string[]> {
  if (boat.pictures.every(isAbsoluteUrl)) return boat.pictures;

  const { id, pictures } = boat;
  const pictureKey = pictures.join("\n");
  const cached = directoryCache.get(id);
  let directory: string | undefined;

  if (cached?.pictureKey === pictureKey && cached.expiresAt > Date.now()) {
    directory = cached.directory;
  } else if (!signal.aborted) {
    try {
      directory = await findImageDirectory(id, pictures, signal);
      directoryCache.set(id, {
        pictureKey,
        directory,
        expiresAt: Date.now() + (directory ? VERIFIED_DIRECTORY_TTL_MS : MISSING_DIRECTORY_TTL_MS),
      });
    } catch {
      // A media lookup failure should still return the boat and any absolute feed URLs.
    }
  }

  const resolved = pictures.flatMap((picture) => {
    if (isAbsoluteUrl(picture)) return [picture];
    return directory ? [new URL(`./${getFilename(picture)}`, directory).href] : [];
  });
  return [...new Set(resolved)];
}

async function findImageDirectory(boatId: string, pictures: string[], signal: AbortSignal) {
  const id = boatId.toLowerCase();
  const expectedNames = new Set(pictures.map(normalizeFilename));
  const searchUrl = new URL(MEDIA_API);
  searchUrl.search = new URLSearchParams({
    search: boatId,
    per_page: "100",
    _fields: "source_url,media_type",
  }).toString();

  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    searchUrl.searchParams.set("page", String(page));
    const response = await fetch(searchUrl, { cache: "no-store", signal });
    if (!response.ok) throw new Error(`WordPress media search returned ${response.status}`);

    const records = (await response.json()) as MediaRecord[];
    if (!Array.isArray(records)) throw new Error("WordPress media search returned an invalid response");
    if (!records.length) break;
    totalPages = Number(response.headers.get("X-WP-TotalPages")) || 1;

    const candidates = records.flatMap((record) => {
      const source = record?.source_url;
      if (typeof source !== "string" || !isAbsoluteUrl(source) || !URL.canParse(source)) return [];
      if (record.media_type != null && record.media_type !== "image") return [];

      const url = new URL(source);
      const filename = normalizeFilename(url.pathname);
      return filename.includes(id) ? [{ url, exactMatch: expectedNames.has(filename) }] : [];
    });

    candidates.sort((a, b) => Number(b.exactMatch) - Number(a.exactMatch));
    for (const { url } of candidates) {
      if (await servesImage(url, signal)) return new URL(".", url).href;
    }
  }

  return undefined;
}

async function servesImage(url: URL, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(url, { cache: "no-store", signal }).catch(() => undefined);
  signal.throwIfAborted();
  if (!response) return false;

  try {
    const contentType = response.headers.get("Content-Type")?.toLowerCase();
    return response.status === 200 && Boolean(contentType?.startsWith("image/"));
  } finally {
    await response.body?.cancel().catch(() => undefined);
  }
}

function isAbsoluteUrl(picture: string): boolean {
  return /^https?:\/\//i.test(picture);
}

function getFilename(picture: string): string {
  return picture.split(/[?#]/, 1)[0].split(/[\\/]/).pop() ?? "";
}

function normalizeFilename(picture: string): string {
  const filename = getFilename(picture);
  try {
    return decodeURIComponent(filename).toLowerCase();
  } catch {
    return filename.toLowerCase();
  }
}
