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
  headerSections: HeaderSection[];
  featuredListing: FeaturedListingSettings;
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

export type HeaderSection = {
  id: string;
  imageUrl: string;
  imageDataUrl?: string;
  imageWidth: number;
  text: string;
};

export type FeaturedListingSettings = {
  enabled: boolean;
  boatId: string;
  headline: string;
  label: string;
  imageUrl: string;
  imageDataUrl?: string;
  imageWidth: number;
  title: string;
  body: string;
  specs: string;
  fullListingUrl: string;
  budgetBoatsUrl: string;
  scheduleViewingUrl: string;
};

export type SelectedBoat = {
  boat: Boat;
  headline: string;
  marketingCopy: string;
  sortOrder: number;
  callToActionLabel?: string;
};
