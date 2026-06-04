import type { Boat, CampaignSettings } from "./types";

const previewPlaceholderImage =
  "https://winnisquammarine.com/wp-content/uploads/2026/06/2023-Crownline-E275_-_Arch_-_Grill_-_BLOWOUT-ID04343571_1.jpg";

export function generateClearanceBoatEmailHtml(
  settings: CampaignSettings,
  selectedBoats: Boat[]
): string {
  const assets = settings.assets;
  const preheader = escapeHtml(settings.preheader ?? "");
  const boatRows = selectedBoats
    .slice(0, 10)
    .map((boat) => renderBoatBlock(boat))
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(settings.subject || settings.name || "Clearance Boat Event")}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif; color:#111827;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; line-height:1px; font-size:1px;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f4f6f8;">
      <tr>
        <td align="center" style="padding:0 10px 28px 10px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:100%; background-color:#ffffff; border-collapse:collapse;">
            ${renderTopBanner(
              resolveImageSource(assets.topBannerImageUrl, assets.topBannerImageDataUrl),
              assets.topBannerImageWidth,
              settings.name
            )}
            ${renderButtonRow([
              { label: "New Inventory", href: assets.newInventoryUrl },
              { label: "Pre-Owned Inventory", href: assets.preOwnedInventoryUrl },
            ])}
            ${renderHero(
              resolveImageSource(assets.heroImageUrl, assets.heroImageDataUrl),
              assets.heroImageWidth
            )}
            <tr>
              <td style="padding:16px 24px 6px 24px;">
                <p style="margin:0; color:#d71f2a; font-size:22px; line-height:28px; font-weight:bold; text-decoration:underline;">CLEARANCE</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 6px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  ${boatRows}
                </table>
              </td>
            </tr>
            ${renderButtonRow([
              { label: "New Inventory", href: assets.newInventoryUrl },
              { label: "Pre-Owned Inventory", href: assets.preOwnedInventoryUrl },
              { label: "Clearance Deals", href: assets.clearanceDealsUrl },
            ])}
            ${renderFooter(settings)}
          </table>
        </td>
      </tr>
    </table>
    [[trackingImage]]
  </body>
</html>`;
}

function renderTopBanner(imageUrl: string | undefined, width: number, title: string): string {
  const src = normalizeImageSource(imageUrl);
  const imageWidth = clampImageWidth(width);

  if (!src) {
    return `<tr>
      <td style="background-color:#071c45; padding:12px 18px; text-align:center; color:#ffffff;">
        <p style="margin:0; font-size:22px; line-height:26px; font-weight:bold; letter-spacing:1px;">WINNISQUAM MARINE</p>
        <p style="margin:2px 0 0 0; font-size:11px; line-height:16px;">Making Waves Since 1933</p>
      </td>
    </tr>`;
  }

  return `<tr>
    <td align="center" style="padding:10px 0 0 0;">
      <img src="${escapeAttribute(src)}" width="${imageWidth}" alt="${escapeAttribute(title || "Winnisquam Marine")}" style="display:block; width:${imageWidth}px; max-width:100%; height:auto; border:0;" />
    </td>
  </tr>`;
}

function renderHero(imageUrl: string | undefined, width: number): string {
  const src = normalizeImageSource(imageUrl);
  const imageWidth = clampImageWidth(width);

  if (!src) {
    return `<tr>
      <td align="center" style="background-color:#dcecff; padding:34px 24px 40px 24px; text-align:center;">
        <p style="margin:0; color:#e5486d; font-size:34px; line-height:38px; font-weight:bold;">CHECKOUT OUR</p>
        <p style="margin:0; color:#e5486d; font-size:34px; line-height:38px; font-weight:bold;">CLEARANCE DEALS</p>
        <p style="margin:10px 0 0 0; color:#ffffff; font-size:17px; line-height:22px; font-weight:bold;">DO NOT MISS THE BOAT!</p>
      </td>
    </tr>`;
  }

  return `<tr>
    <td align="center" style="padding:0 0 6px 0;">
      <img src="${escapeAttribute(src)}" width="${imageWidth}" alt="Checkout our clearance deals" style="display:block; width:${imageWidth}px; max-width:100%; height:auto; border:0; border-radius:14px;" />
    </td>
  </tr>`;
}

function renderButtonRow(buttons: Array<{ label: string; href: string }>): string {
  const cells = buttons
    .map(
      (button) => `<td align="center" style="padding:0 6px;">
        <a href="${escapeAttribute(button.href)}" style="display:inline-block; border:1px solid #111827; padding:5px 12px; color:#111827; font-size:11px; line-height:14px; text-decoration:none; background-color:#ffffff;">${escapeHtml(button.label)}</a>
      </td>`
    )
    .join("");

  return `<tr>
    <td align="center" style="padding:12px 12px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
        <tr>${cells}</tr>
      </table>
    </td>
  </tr>`;
}

function renderBoatBlock(boat: Boat): string {
  const imageUrl = escapeAttribute(
    boat.primaryImageUrl || boat.imageUrl || previewPlaceholderImage
  );
  const detailUrl = escapeAttribute(boat.webLink || boat.detailUrl || "#");
  const specs = buildSpecsHtml(boat);
  const displayTitle = boat.displayTitle || boat.title;

  return `<tr>
    <td style="padding:10px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate; border-spacing:0; background-color:#f7f7f7; border-radius:10px;">
        <tr>
          <td width="176" valign="top" style="width:176px; padding:10px 12px;">
            <a href="${detailUrl}" style="text-decoration:none;">
              <img src="${imageUrl}" width="155" alt="${escapeAttribute(displayTitle)}" style="display:block; width:155px; height:auto; border:0; border-radius:8px;" />
            </a>
          </td>
          <td valign="top" style="padding:12px 12px 12px 4px;">
            <p style="margin:0 0 7px 0; font-size:16px; line-height:21px; color:#111827; font-weight:bold;">${escapeHtml(displayTitle)}</p>
            <p style="margin:0 0 7px 0; font-size:13px; line-height:18px; color:#d71f2a; font-weight:bold;">Clearance Price: ${escapeHtml(boat.priceLabel ?? "Call for price")}</p>
            <p style="margin:0 0 8px 0; font-size:12px; line-height:17px; color:#111827; font-weight:bold;">${specs}</p>
            <a href="${detailUrl}" style="font-size:12px; line-height:16px; color:#006eb6; text-decoration:underline; font-weight:bold;">View All Details</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderFooter(settings: CampaignSettings): string {
  const assets = settings.assets;
  const footerImage = normalizeImageSource(
    resolveImageSource(assets.footerImageUrl, assets.footerImageDataUrl)
  );

  return `<tr>
    <td style="padding:20px 24px 26px 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td width="150" align="center" valign="middle" style="width:150px; padding:0 18px 0 0;">
            ${
              footerImage
                ? `<img src="${escapeAttribute(footerImage)}" width="120" alt="${escapeAttribute(assets.footerBusinessName)}" style="display:block; width:120px; height:120px; border-radius:60px; object-fit:cover; border:0;" />`
                : `<div style="width:120px; height:120px; border-radius:60px; background-color:#dbeafe; line-height:120px; text-align:center; color:#0b5f95; font-size:13px; font-weight:bold;">Marina</div>`
            }
          </td>
          <td align="center" valign="middle" style="padding:0; color:#111827;">
            <p style="margin:0 0 6px 0; font-size:13px; line-height:18px;">${escapeHtml(assets.footerHeading)}</p>
            <p style="margin:0 0 4px 0; font-size:16px; line-height:21px; font-weight:bold;">${escapeHtml(assets.footerBusinessName)}</p>
            <p style="margin:0 0 10px 0; font-size:12px; line-height:17px;">${escapeHtml(assets.footerSubtext)}</p>
            <a href="${escapeAttribute(assets.contactUrl)}" style="display:inline-block; border:1px solid #111827; padding:5px 15px; color:#111827; font-size:11px; line-height:14px; text-decoration:none; background-color:#ffffff;">${escapeHtml(assets.contactButtonLabel)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildSpecsHtml(boat: Boat): string {
  return escapeHtml(
    [
      boat.formattedLoa ? `LOA ${boat.formattedLoa}` : undefined,
      boat.formattedBeam ? `Beam ${boat.formattedBeam}` : undefined,
      boat.engineDisplay ?? boat.engine,
    ]
      .filter(Boolean)
      .join(" [[bullet]] ")
  ).replace(/\s\[\[bullet\]\]\s/g, " &bull; ");
}

function resolveImageSource(publicUrl?: string, importedDataUrl?: string): string | undefined {
  return publicUrl?.trim() || importedDataUrl?.trim() || undefined;
}

function normalizeImageSource(value?: string): string | undefined {
  if (value?.startsWith("data:image/")) {
    return value;
  }

  return normalizeOptionalUrl(value);
}

function normalizeOptionalUrl(value?: string): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function clampImageWidth(value?: number): number {
  if (!value || !Number.isFinite(value)) {
    return 520;
  }

  return Math.min(600, Math.max(180, Math.round(value)));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
