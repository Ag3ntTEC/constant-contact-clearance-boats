import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  isDraftHistoryEntry,
  isHeaderImageHistoryEntry,
  normalizeHistoryImageUrl,
  summarizeDraft,
} from "./history-data";
import type {
  DraftHistoryEntry,
  DraftHistorySummary,
  HeaderImageHistoryEntry,
} from "./history-types";

const HISTORY_LIMIT = 200;
const namespace = process.env.HISTORY_STORE_NAMESPACE?.trim() || "clearance-campaign-studio:v1";
const draftIndexKey = `${namespace}:drafts`;
const imageIndexKey = `${namespace}:header-images`;
const localStorePath = join(process.cwd(), ".data", "shared-history.json");

type LocalHistoryStore = {
  drafts: DraftHistoryEntry[];
  images: HeaderImageHistoryEntry[];
};

type RedisResponse<T> = {
  error?: string;
  result?: T;
};

type IndexedRecord<T> = {
  indexId: string;
  record: T | null;
};

let localMutation = Promise.resolve();

export class HistoryStorageConfigurationError extends Error {
  constructor(message = "Shared history storage is not configured.") {
    super(message);
    this.name = "HistoryStorageConfigurationError";
  }
}

export async function listDraftHistory(): Promise<DraftHistorySummary[]> {
  if (getRedisConfig()) {
    const entries = await listRemoteRecords(draftIndexKey, draftRecordKey, isDraftHistoryEntry);
    return entries.map(summarizeDraft);
  }

  const store = await readLocalStore();
  return store.drafts
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, HISTORY_LIMIT)
    .map(summarizeDraft);
}

export async function getDraftHistoryEntry(id: string): Promise<DraftHistoryEntry | null> {
  if (getRedisConfig()) {
    const value = await redisCommand<string | null>(["GET", draftRecordKey(id)]);
    return parseRecord(value, isDraftHistoryEntry);
  }

  const store = await readLocalStore();
  return store.drafts.find((entry) => entry.id === id) ?? null;
}

export async function saveDraftHistoryEntry(entry: DraftHistoryEntry) {
  if (getRedisConfig()) {
    await redisPipeline([
      ["SET", draftRecordKey(entry.id), JSON.stringify(entry)],
      ["ZADD", draftIndexKey, Date.parse(entry.updatedAt), entry.id],
    ]);
    return;
  }

  await mutateLocalStore((store) => {
    store.drafts = [entry, ...store.drafts.filter((item) => item.id !== entry.id)].slice(
      0,
      HISTORY_LIMIT
    );
  });
}

export async function deleteDraftHistoryEntry(id: string) {
  if (getRedisConfig()) {
    await redisPipeline([
      ["DEL", draftRecordKey(id)],
      ["ZREM", draftIndexKey, id],
    ]);
    return;
  }

  await mutateLocalStore((store) => {
    store.drafts = store.drafts.filter((entry) => entry.id !== id);
  });
}

export async function listHeaderImageHistory(): Promise<HeaderImageHistoryEntry[]> {
  if (getRedisConfig()) {
    const indexedRecords = await listRemoteIndexedRecords(
      imageIndexKey,
      imageRecordKey,
      isHeaderImageHistoryEntry,
      null
    );
    const entries = compactHeaderImageEntries(
      indexedRecords
        .map(({ record }) => record)
        .filter((record): record is HeaderImageHistoryEntry => record !== null),
      false
    ).slice(0, HISTORY_LIMIT);
    const retainedIds = new Set(entries.map((entry) => entry.id));
    const staleIds = indexedRecords
      .map(({ indexId }) => indexId)
      .filter((id) => !retainedIds.has(id));

    if (staleIds.length) {
      await deleteRemoteImageRecords(staleIds);
    }

    return entries;
  }

  const store = await readLocalStore();
  const entries = compactHeaderImageEntries(store.images, false).slice(0, HISTORY_LIMIT);

  if (!hasSameImageEntries(store.images, entries)) {
    await mutateLocalStore((currentStore) => {
      currentStore.images = compactHeaderImageEntries(currentStore.images, false).slice(
        0,
        HISTORY_LIMIT
      );
    });
  }

  return entries;
}

export async function saveHeaderImageHistoryEntries(entries: HeaderImageHistoryEntry[]) {
  const validEntries = entries.filter(isHeaderImageHistoryEntry);
  if (!validEntries.length) return;

  if (getRedisConfig()) {
    const indexedRecords = await listRemoteIndexedRecords(
      imageIndexKey,
      imageRecordKey,
      isHeaderImageHistoryEntry,
      null
    );
    const existingEntries = indexedRecords
      .map(({ record }) => record)
      .filter((record): record is HeaderImageHistoryEntry => record !== null);
    const nextEntries = compactHeaderImageEntries(
      [...validEntries, ...existingEntries],
      true
    ).slice(0, HISTORY_LIMIT);
    const retainedIds = new Set(nextEntries.map((entry) => entry.id));
    const staleIds = indexedRecords
      .map(({ indexId }) => indexId)
      .filter((id) => !retainedIds.has(id));

    await redisPipeline([
      ...nextEntries.flatMap((entry) => [
        ["SET", imageRecordKey(entry.id), JSON.stringify(entry)],
        ["ZADD", imageIndexKey, Date.parse(entry.usedAt), entry.id],
      ]),
      ...staleIds.flatMap((id) => [
        ["DEL", imageRecordKey(id)],
        ["ZREM", imageIndexKey, id],
      ]),
    ]);
    return;
  }

  await mutateLocalStore((store) => {
    store.images = compactHeaderImageEntries([...validEntries, ...store.images], true).slice(
      0,
      HISTORY_LIMIT
    );
  });
}

async function listRemoteRecords<T>(
  indexKey: string,
  recordKey: (id: string) => string,
  guard: (value: unknown) => value is T
): Promise<T[]> {
  const indexedRecords = await listRemoteIndexedRecords(
    indexKey,
    recordKey,
    guard,
    HISTORY_LIMIT
  );

  return indexedRecords
    .map(({ record }) => record)
    .filter((record): record is T => record !== null);
}

async function listRemoteIndexedRecords<T>(
  indexKey: string,
  recordKey: (id: string) => string,
  guard: (value: unknown) => value is T,
  limit: number | null
): Promise<Array<IndexedRecord<T>>> {
  const ids = await redisCommand<string[]>([
    "ZREVRANGE",
    indexKey,
    0,
    limit === null ? -1 : limit - 1,
  ]);

  if (!ids.length) return [];

  const values = await redisCommand<Array<string | null>>([
    "MGET",
    ...ids.map(recordKey),
  ]);

  return ids.map((indexId, index) => ({
    indexId,
    record: parseRecord(values[index], guard),
  }));
}

function parseRecord<T>(value: string | null | undefined, guard: (value: unknown) => value is T) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getRedisConfig(): { token: string; url: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();

  if (url && token) {
    return { token, url: url.replace(/\/$/, "") };
  }

  if (url || token) {
    throw new HistoryStorageConfigurationError(
      "Shared history storage has an incomplete Redis REST configuration."
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new HistoryStorageConfigurationError(
      "Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable shared history."
    );
  }

  return null;
}

async function redisCommand<T>(command: Array<number | string>): Promise<T> {
  const config = getRedisConfig();
  if (!config) throw new HistoryStorageConfigurationError();

  const response = await fetch(config.url, {
    body: JSON.stringify(command),
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as RedisResponse<T>;

  if (!response.ok || payload.error || payload.result === undefined) {
    throw new Error(payload.error || `History storage returned ${response.status}.`);
  }

  return payload.result;
}

async function redisPipeline(commands: Array<Array<number | string>>) {
  const config = getRedisConfig();
  if (!config) throw new HistoryStorageConfigurationError();

  const response = await fetch(`${config.url}/pipeline`, {
    body: JSON.stringify(commands),
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as Array<RedisResponse<unknown>>;
  const commandError = Array.isArray(payload) ? payload.find((item) => item.error)?.error : null;

  if (!response.ok || commandError) {
    throw new Error(commandError || `History storage returned ${response.status}.`);
  }
}

async function readLocalStore(): Promise<LocalHistoryStore> {
  await localMutation;

  try {
    const parsed = JSON.parse(await readFile(localStorePath, "utf8")) as Partial<LocalHistoryStore>;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts.filter(isDraftHistoryEntry) : [],
      images: Array.isArray(parsed.images) ? parsed.images.filter(isHeaderImageHistoryEntry) : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { drafts: [], images: [] };
    }
    throw error;
  }
}

async function mutateLocalStore(mutator: (store: LocalHistoryStore) => void) {
  const mutation = localMutation.then(async () => {
    const store = await readLocalStoreWithoutLock();
    mutator(store);
    await mkdir(dirname(localStorePath), { recursive: true });
    const temporaryPath = `${localStorePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    await rename(temporaryPath, localStorePath);
  });

  localMutation = mutation.catch(() => undefined);
  await mutation;
}

async function readLocalStoreWithoutLock(): Promise<LocalHistoryStore> {
  try {
    const parsed = JSON.parse(await readFile(localStorePath, "utf8")) as Partial<LocalHistoryStore>;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts.filter(isDraftHistoryEntry) : [],
      images: Array.isArray(parsed.images) ? parsed.images.filter(isHeaderImageHistoryEntry) : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { drafts: [], images: [] };
    }
    throw error;
  }
}

function draftRecordKey(id: string) {
  return `${namespace}:draft:${id}`;
}

function imageRecordKey(id: string) {
  return `${namespace}:header-image:${id}`;
}

function compactHeaderImageEntries(
  entries: HeaderImageHistoryEntry[],
  useStableIds: boolean
): HeaderImageHistoryEntry[] {
  const entriesByUrl = new Map<string, HeaderImageHistoryEntry>();

  for (const entry of entries) {
    const imageUrl = normalizeHistoryImageUrl(entry.imageUrl);
    if (!imageUrl) continue;

    const normalizedEntry = {
      ...entry,
      id: useStableIds ? stableImageHistoryId(imageUrl) : entry.id,
      imageUrl,
    };
    const existing = entriesByUrl.get(imageUrl);

    if (!existing || Date.parse(normalizedEntry.usedAt) > Date.parse(existing.usedAt)) {
      entriesByUrl.set(imageUrl, normalizedEntry);
    }
  }

  return [...entriesByUrl.values()].sort((left, right) =>
    right.usedAt.localeCompare(left.usedAt)
  );
}

function stableImageHistoryId(imageUrl: string) {
  const digest = createHash("sha256").update(imageUrl).digest("hex").slice(0, 40);
  return `image-${digest}`;
}

function hasSameImageEntries(
  currentEntries: HeaderImageHistoryEntry[],
  nextEntries: HeaderImageHistoryEntry[]
) {
  if (currentEntries.length !== nextEntries.length) {
    return false;
  }

  return currentEntries.every(
    (entry, index) =>
      entry.id === nextEntries[index]?.id && entry.imageUrl === nextEntries[index]?.imageUrl
  );
}

async function deleteRemoteImageRecords(ids: string[]) {
  await redisPipeline(
    ids.flatMap((id) => [
      ["DEL", imageRecordKey(id)],
      ["ZREM", imageIndexKey, id],
    ])
  );
}
