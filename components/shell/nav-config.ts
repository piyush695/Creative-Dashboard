import {
  LayoutDashboard,
  Sparkles,
  Bookmark,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconLike = LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export type NavItem = {
  label: string;
  href: string;
  icon: IconLike;
  badge?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Standalone primary items rendered above the grouped sections. These are
// always visible and never tucked inside a collapsible group — Overview is the
// dashboard's home and must stay a first-class navigation target.
export const TOP_NAV: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
];

// The "Analyze" section is rendered dynamically from the globally-enabled
// platforms (see PlatformsProvider + sidebar.tsx), so it is intentionally NOT
// listed here. Only static sections live in PRIMARY_NAV.
export const PRIMARY_NAV: NavSection[] = [
  {
    label: "Creative Studio",
    items: [
      { label: "Studio", href: "/studio", icon: Sparkles },
      { label: "Saved", href: "/saved", icon: Bookmark },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
];
