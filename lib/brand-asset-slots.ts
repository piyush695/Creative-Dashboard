// The recurring creative assets the generator composites onto every creative
// (brand furniture). Managed in Settings → Brand Assets; stored in public/brand/
// where the template engine (server/ai-studio/brand-assets.ts) reads them.
//
// Shared by the API route (key → file whitelist) and the Settings UI (labels +
// which background to preview on, since white assets are invisible on white).

export interface BrandAssetSlot {
  key: string;
  label: string;
  file: string;
  darkPreview: boolean; // true → the asset is light-coloured, preview on a dark swatch
  group: "Logo" | "Trust";
}

export const BRAND_ASSET_SLOTS: BrandAssetSlot[] = [
  { key: "logo-light", label: "Logo — white (for dark backgrounds)", file: "logo-light.png", darkPreview: true, group: "Logo" },
  { key: "logo-dark", label: "Logo — black (for light backgrounds)", file: "logo-dark.png", darkPreview: false, group: "Logo" },
  { key: "trustpilot-light", label: "Trustpilot — white", file: "trustpilot-light.png", darkPreview: true, group: "Trust" },
  { key: "trustpilot-dark", label: "Trustpilot — dark", file: "trustpilot-dark.png", darkPreview: false, group: "Trust" },
  { key: "deloitte-light", label: "Deloitte line — white", file: "deloitte-light.png", darkPreview: true, group: "Trust" },
  { key: "deloitte-dark", label: "Deloitte line — dark", file: "deloitte-dark.png", darkPreview: false, group: "Trust" },
  { key: "stamp", label: "Zero Payout Denial stamp", file: "stamp.png", darkPreview: true, group: "Trust" },
];

// key → filename whitelist (guards the write endpoint against arbitrary paths).
export const BRAND_ASSET_FILE: Record<string, string> = Object.fromEntries(
  BRAND_ASSET_SLOTS.map((s) => [s.key, s.file]),
);
