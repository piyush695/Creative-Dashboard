import {
  LayoutDashboard,
  Sparkles,
  Clock,
  Bookmark,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { MetaLogo, GoogleLogo, AdRollLogo } from "@/components/icons/platforms";

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

export const PRIMARY_NAV: NavSection[] = [
  {
    label: "Analyze",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Meta Ads", href: "/legacy?platform=meta", icon: MetaLogo },
      { label: "Google Ads", href: "/legacy?platform=google", icon: GoogleLogo },
      { label: "AdRoll", href: "/legacy?platform=adroll", icon: AdRollLogo },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Studio", href: "/studio", icon: Sparkles },
      { label: "History", href: "/history", icon: Clock },
      { label: "Saved", href: "/saved", icon: Bookmark },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
];
