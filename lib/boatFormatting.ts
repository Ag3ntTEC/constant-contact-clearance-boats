type BoatWebLinkInput = {
  year: string | number;
  make: string;
  model: string;
  uniqueid: string | number;
};

type EngineInput = {
  engineManufacturer?: string | number | null;
  engineHp?: string | number | null;
};

export function generateBoatWebLink({
  year,
  make,
  model,
  uniqueid,
}: BoatWebLinkInput) {
  const firstModelPart = String(model).split("-")[0].trim();
  const slug = `${year}-${make}-${firstModelPart}-${uniqueid}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  return `https://winnisquammarine.com/product/${slug}/`;
}

export function formatBoatDisplayTitle(rawTitle?: string | null) {
  return String(rawTitle ?? "")
    .split(" - ")[0]
    .trim();
}

export function formatLoa(value?: string | number): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const [feetPart, inchesPart] = String(value).trim().split(".");
  const feet = Number.parseInt(feetPart, 10);

  if (!Number.isFinite(feet)) {
    return undefined;
  }

  if (!inchesPart || Number(inchesPart) === 0) {
    return `${feet}'`;
  }

  const inches = Number.parseInt(inchesPart, 10);

  if (!Number.isFinite(inches) || inches <= 0) {
    return `${feet}'`;
  }

  return `${feet}' ${inches}"`;
}

export function formatBeam(value?: string | number): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const totalInches = Number.parseInt(String(value).trim(), 10);

  if (!Number.isFinite(totalInches) || totalInches <= 0) {
    return undefined;
  }

  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (inches === 0) {
    return `${feet}'`;
  }

  return `${feet}' ${inches}"`;
}

export function formatEngineMakeAndHp({
  engineManufacturer,
  engineHp,
}: EngineInput): string | undefined {
  const manufacturer = String(engineManufacturer ?? "").trim();
  const hpRaw = String(engineHp ?? "").trim();
  const hp = hpRaw ? `${hpRaw.replace(/\s*hp$/i, "").trim()}HP` : "";
  const display = [manufacturer, hp].filter(Boolean).join(" ");

  return display || undefined;
}
