export type Boat = {
  id: string;
  stockNumber?: string;
  category?: string;
  year?: number;
  title: string;
  displayTitle?: string;
  make?: string;
  model?: string;
  price?: number;
  priceLabel?: string;
  salePrice?: number;
  clearancePrice?: number;
  isClearance?: boolean;
  lengthFeet?: number;
  loa?: string;
  beam?: string;
  engineSummary?: string;
  engine?: string;
  engineDisplay?: string;
  imageUrl?: string;
  primaryImageUrl?: string;
  pictures: string[];
  detailUrl?: string;
  webLink?: string;
  formattedLoa?: string;
  formattedBeam?: string;
  description?: string;
  rawFields?: Record<string, string>;
};

export type CampaignSettings = {
  name: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  assets: EmailAssets;
};

export type EmailAssets = {
  topBannerImageUrl: string;
  topBannerImageDataUrl?: string;
  topBannerImageWidth: number;
  heroImageUrl: string;
  heroImageDataUrl?: string;
  heroImageWidth: number;
  footerImageUrl: string;
  footerImageDataUrl?: string;
  newInventoryUrl: string;
  preOwnedInventoryUrl: string;
  clearanceDealsUrl: string;
  topButtonPaddingTop: number;
  topButtonPaddingBottom: number;
  contactUrl: string;
  footerHeading: string;
  footerBusinessName: string;
  footerSubtext: string;
  contactButtonLabel: string;
  clearanceHeadingText: string;
  priceLabelText: string;
};

export type SelectedBoat = {
  boat: Boat;
  headline: string;
  marketingCopy: string;
  sortOrder: number;
  callToActionLabel?: string;
};
