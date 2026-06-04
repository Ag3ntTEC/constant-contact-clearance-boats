import type { Boat } from "./types";
import {
  formatBoatDisplayTitle,
  formatBeam,
  formatEngineMakeAndHp,
  formatLoa,
  generateBoatWebLink,
} from "./boatFormatting";

export const BOAT_FEED_URL =
  process.env.BOAT_FEED_URL ??
  "https://motomarinedigital.com/feeds/winnisquammarine-feed/WinboatsWebXMLAllRevA.xml";

const DEFAULT_IMAGE_HOST = "https://winnisquammarine.com/wp-content/uploads";

type XmlNode = {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
};

type FieldMap = Record<string, string[]>;

const candidateNodeNames = new Set([
  "boat",
  "boats",
  "item",
  "inventory",
  "listing",
  "node",
  "record",
  "unit",
  "vehicle",
  "vessel",
]);

export async function fetchBoats(): Promise<{
  boats: Boat[];
  fieldNames: string[];
  fetchedAt: string;
}> {
  const response = await fetch(BOAT_FEED_URL, {
    headers: {
      "User-Agent": "constant-contact-clearance-boats/0.1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Boat feed returned ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parseBoatsXml(xml);

  return {
    ...parsed,
    fetchedAt: new Date().toISOString(),
  };
}

export function parseBoatsXml(xml: string): {
  boats: Boat[];
  fieldNames: string[];
} {
  const root = parseXml(xml);
  const candidates = collectCandidateNodes(root);
  const fieldNames = new Set<string>();
  const seenIds = new Set<string>();

  const boats = candidates
    .map((node, index) => {
      const fields = flattenNode(node);
      Object.keys(fields).forEach((fieldName) => fieldNames.add(fieldName));
      return normalizeBoat(fields, index);
    })
    .filter((boat): boat is Boat => Boolean(boat))
    .filter((boat) => {
      if (seenIds.has(boat.id)) {
        return false;
      }

      seenIds.add(boat.id);
      return true;
    });

  return {
    boats,
    fieldNames: Array.from(fieldNames).sort(),
  };
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = {
    name: "root",
    attributes: {},
    children: [],
    text: "",
  };
  const stack = [root];
  const cleaned = xml
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const tokens = cleaned.match(/<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g) ?? [];

  for (const token of tokens) {
    const current = stack[stack.length - 1];

    if (token.startsWith("<![CDATA[")) {
      current.text += token.slice(9, -3);
      continue;
    }

    if (!token.startsWith("<")) {
      current.text += decodeXml(token);
      continue;
    }

    if (token.startsWith("</") || token.startsWith("<!")) {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    const isSelfClosing = token.endsWith("/>");
    const inner = token.slice(1, isSelfClosing ? -2 : -1).trim();
    const spaceIndex = inner.search(/\s/);
    const name = spaceIndex === -1 ? inner : inner.slice(0, spaceIndex);
    const attributeText = spaceIndex === -1 ? "" : inner.slice(spaceIndex + 1);
    const node: XmlNode = {
      name,
      attributes: parseAttributes(attributeText),
      children: [],
      text: "",
    };

    current.children.push(node);

    if (!isSelfClosing) {
      stack.push(node);
    }
  }

  return root;
}

function parseAttributes(attributeText: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const matches = attributeText.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g);

  for (const match of matches) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }

  return attributes;
}

function collectCandidateNodes(root: XmlNode): XmlNode[] {
  const nodes: XmlNode[] = [];

  function walk(node: XmlNode) {
    const normalizedName = normalizeKey(node.name);
    const fields = flattenNode(node);
    const fieldKeys = Object.keys(fields);
    const score = scoreFields(fieldKeys);

    if (
      candidateNodeNames.has(normalizedName) &&
      score >= 3 &&
      fieldKeys.length >= 4 &&
      fieldKeys.length <= 160
    ) {
      nodes.push(node);
      return;
    }

    node.children.forEach(walk);
  }

  walk(root);

  if (nodes.length > 0) {
    return nodes;
  }

  const fallback: XmlNode[] = [];

  function collectFallback(node: XmlNode) {
    const fields = flattenNode(node);
    const fieldKeys = Object.keys(fields);

    if (scoreFields(fieldKeys) >= 4 && fieldKeys.length >= 4 && fieldKeys.length <= 160) {
      fallback.push(node);
      return;
    }

    node.children.forEach(collectFallback);
  }

  collectFallback(root);
  return fallback;
}

function flattenNode(node: XmlNode): FieldMap {
  const fields: FieldMap = {};

  function add(key: string, value: string) {
    const cleaned = value.trim();

    if (!cleaned) {
      return;
    }

    const normalized = normalizeKey(key);
    fields[normalized] = [...(fields[normalized] ?? []), cleaned];
  }

  function walk(current: XmlNode, path: string[]) {
    const nextPath = [...path, current.name];
    const text = current.text.trim().replace(/\s+/g, " ");

    if (text) {
      add(nextPath.join("."), text);
      add(current.name, text);
    }

    Object.entries(current.attributes).forEach(([key, value]) => {
      add([...nextPath, key].join("."), value);
      add(key, value);
    });

    current.children.forEach((child) => walk(child, nextPath));
  }

  walk(node, []);
  return fields;
}

function normalizeBoat(fields: FieldMap, index: number): Boat | null {
  const stockNumber = pick(fields, [
    "stocknumber",
    "stockno",
    "stock",
    "stk",
    "unitnumber",
  ]);
  const id = pick(fields, [
    "uniqueid",
    "id",
    "boatid",
    "inventoryid",
  ]) ?? stockNumber;
  const category = pick(fields, ["category", "type"]);

  if (category?.toLowerCase() === "outboard motor") {
    return null;
  }

  const year = parseNumber(
    pick(fields, ["year", "modelyear", "boatyear", "inventoryyear"])
  );
  const make = pick(fields, ["make", "manufacturer", "brand", "builder"]);
  const model = pick(fields, ["model", "modelname", "boatmodel"]);
  const generatedTitle = [year, make, model].filter(Boolean).join(" ");
  const title =
    generatedTitle || pick(fields, ["title", "boatname", "displayname", "name"]);
  const displayTitle = formatBoatDisplayTitle(title || stockNumber || `Boat ${index + 1}`);

  if (!title && !stockNumber) {
    return null;
  }

  const price =
    parsePrice(
      pick(fields, [
        "clearanceprice",
        "saleprice",
        "specialprice",
        "internetprice",
        "webprice",
        "currentprice",
        "total",
        "msrp",
        "retailprice",
        "askingprice",
        "price",
      ])
    ) ?? undefined;
  const salePrice =
    parsePrice(pick(fields, ["saleprice", "specialprice", "internetprice", "webprice"])) ??
    undefined;
  const clearancePrice = parsePrice(pick(fields, ["clearanceprice"])) ?? undefined;
  const pictures = collectPictures(fields);
  const rawLoa = pick(fields, ["loa", "lengthoverall", "length", "boatlength"]);
  const rawBeam = pick(fields, ["beam", "boatbeam"]);
  const engineDisplay = formatEngineMakeAndHp({
    engineManufacturer: pick(fields, [
      "enginemanufacturer",
      "enginemanfacturer",
      "motormanufacturer",
      "motor manufacturer",
    ]),
    engineHp: pick(fields, ["enginehp", "enghp", "horsepower", "hp"]),
  });
  const webLink =
    year && make && model && id
      ? generateBoatWebLink({
          year,
          make,
          model,
          uniqueid: id,
        })
      : undefined;

  return {
    id: id ?? `boat-${index + 1}`,
    stockNumber,
    category,
    year,
    title: title || stockNumber || `Boat ${index + 1}`,
    displayTitle,
    make,
    model,
    price,
    priceLabel: price ? formatCurrency(price) : pick(fields, ["pricedisplay", "pricecallout"]),
    salePrice,
    clearancePrice,
    isClearance: parseBoolean(pick(fields, ["clearance"])),
    lengthFeet: parseNumber(rawLoa) ?? undefined,
    loa: rawLoa,
    beam: rawBeam,
    engineSummary: pick(fields, [
      "enginesummary",
      "engine",
      "engines",
      "motors",
      "motor",
      "propulsion",
    ]),
    engine: engineDisplay,
    engineDisplay,
    detailUrl: webLink ?? pickUrl(fields, ["detailurl", "detailsurl", "url", "link", "permalink", "websiteurl"]),
    webLink,
    formattedLoa: formatLoa(rawLoa),
    formattedBeam: formatBeam(rawBeam),
    pictures,
    imageUrl: pictures[0],
    primaryImageUrl: pictures[0],
    description: pick(fields, ["description", "comments", "remarks", "shortdescription"]),
    rawFields: compactFields(fields),
  };
}

function scoreFields(keys: string[]): number {
  const joined = keys.join("|");
  const checks = [
    /stock|unit|inventory|boatid|id/.test(joined),
    /title|name|make|manufacturer|brand|model/.test(joined),
    /year/.test(joined),
    /price|msrp|retail|sale|clearance/.test(joined),
    /loa|length|beam|engine|motor/.test(joined),
    /photo|picture|image|media/.test(joined),
  ];

  return checks.filter(Boolean).length;
}

function pick(fields: FieldMap, names: string[]): string | undefined {
  for (const name of names) {
    const exact = fields[name]?.find(Boolean);

    if (exact) {
      return exact;
    }
  }

  for (const name of names) {
    const found = Object.entries(fields).find(
      ([key, values]) =>
        key.includes(name) &&
        !key.includes("sheet") &&
        !key.includes("units") &&
        values[0]
    );

    if (found) {
      return found[1][0];
    }
  }

  return undefined;
}

function pickUrl(fields: FieldMap, names: string[]): string | undefined {
  const value = pick(fields, names);

  if (!value) {
    return undefined;
  }

  return value.startsWith("http") ? value : undefined;
}

function collectPictures(fields: FieldMap): string[] {
  const values = Object.entries(fields)
    .filter(([key]) => /photo|picture|image|media|pic/.test(key))
    .flatMap(([, fieldValues]) => fieldValues)
    .flatMap((value) => value.split(/[,\n|;]/g))
    .map((value) => value.trim())
    .filter((value) => /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(value))
    .map(resolveImageUrl);

  return Array.from(new Set(values));
}

function resolveImageUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const imageBaseUrl = process.env.BOAT_IMAGE_BASE_URL ?? getDefaultImageBaseUrl();
  const filename = value.split(/[\\/]/).filter(Boolean).pop() ?? value;

  return `${imageBaseUrl}/${encodeURIComponent(filename)}`;
}

function getDefaultImageBaseUrl(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${DEFAULT_IMAGE_HOST}/${year}/${month}`;
}

function compactFields(fields: FieldMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, values]) => [key, values[0]])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parsePrice(value?: string): number | null {
  if (!value) {
    return null;
  }

  return parseNumber(value);
}

function parseBoolean(value?: string): boolean {
  return ["y", "yes", "true", "1"].includes(value?.trim().toLowerCase() ?? "");
}

function parseNumber(value?: string): number | null {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
