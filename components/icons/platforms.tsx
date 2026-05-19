/**
 * Real platform brand logos — SVG components.
 *
 * These render the actual brand marks (Meta/Facebook, Google, etc.) instead
 * of generic Lucide glyphs. The feedback document specifically called this
 * out: "use the original logos of the particular platforms" so users can
 * recognize them at a glance.
 *
 * Each icon takes a standard `className` and inherits `currentColor` so
 * monochrome rendering is easy. When you need the brand color, pass it via
 * Tailwind text class (e.g. text-[#1877F2]).
 */

import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function MetaLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4Zm1.5 21.94v-7.86h2.65l.4-3.08H17.5v-1.97c0-.89.25-1.5 1.53-1.5h1.63V9.06c-.28-.04-1.25-.12-2.38-.12-2.36 0-3.97 1.44-3.97 4.08v2.26H11.6v3.08h2.71v7.86c-4.68-.74-8.25-4.79-8.25-9.67C6.06 10.55 10.55 6.06 16 6.06s9.94 4.49 9.94 9.94c0 4.88-3.57 8.93-8.44 9.94Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FacebookLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.955.925-1.955 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12Z"
        fill="#1877F2"
      />
    </svg>
  );
}

export function InstagramLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="26%" stopColor="#F47133" />
          <stop offset="61%" stopColor="#BC3081" />
          <stop offset="100%" stopColor="#4C63D2" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="white" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}

export function GoogleLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.73.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function TikTokLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52V6.72a4.85 4.85 0 0 1-1.84-.03Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function YouTubeLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M23.5 6.51a3.01 3.01 0 0 0-2.12-2.13C19.5 4 12 4 12 4s-7.5 0-9.38.38A3.01 3.01 0 0 0 .5 6.51 31.5 31.5 0 0 0 .12 12c0 1.93.12 3.62.38 5.49a3.01 3.01 0 0 0 2.12 2.13C4.5 20 12 20 12 20s7.5 0 9.38-.38a3.01 3.01 0 0 0 2.12-2.13c.26-1.87.38-3.56.38-5.49 0-1.93-.12-3.62-.38-5.49Z"
        fill="#FF0000"
      />
      <path d="M9.75 15.5V8.5l6 3.5-6 3.5Z" fill="white" />
    </svg>
  );
}

export function LinkedInLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
        fill="#0A66C2"
      />
    </svg>
  );
}

export function AdRollLogo({ className, ...rest }: IconProps) {
  // AdRoll wordmark uses a square + dot. Approximation that reads as "AR".
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#FF6633" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif" fill="white">
        AR
      </text>
    </svg>
  );
}

export function XLogo({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...rest}>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"
        fill="currentColor"
      />
    </svg>
  );
}

export type PlatformId = "meta" | "facebook" | "instagram" | "google" | "tiktok" | "youtube" | "linkedin" | "adroll" | "x";

export const PLATFORM_LOGO: Record<PlatformId, (p: IconProps) => ReactElement> = {
  meta: MetaLogo,
  facebook: FacebookLogo,
  instagram: InstagramLogo,
  google: GoogleLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  adroll: AdRollLogo,
  x: XLogo,
};
