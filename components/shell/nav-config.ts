import {
  LayoutDashboard,
  Facebook,
  Chrome,
  Target,
  Sparkles,
  Clock,
  Bookmark,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
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
      { label: "Meta Ads", href: "/legacy?platform=meta", icon: Facebook },
      { label: "Google Ads", href: "/legacy?platform=google", icon: Chrome },
      { label: "AdRoll", href: "/legacy?platform=adroll", icon: Target },
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
