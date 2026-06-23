"use client";

import { useSession, signOut } from "next-auth/react";
import { Search, Sun, Moon, LogOut, User, Settings, Lock, X, Menu, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { notificationIconEnabled } = useUiSettings();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // ─── Global search — pushes ?q= into the URL so legacy page picks it up.
  // Cmd+K / Ctrl+K focuses the input. Esc clears + blurs.
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(searchParams?.get("q") || "");

  // Keep input synced with URL ?q= when navigation happens elsewhere.
  useEffect(() => {
    setSearchValue(searchParams?.get("q") || "");
  }, [searchParams]);

  // Cmd+K / Ctrl+K global shortcut to focus the search input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pushQuery = (q: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    // Always route searches to the legacy dashboard so the ads grid sees them
    const targetPath = pathname?.startsWith("/legacy") ? pathname : "/legacy";
    const qs = params.toString();
    router.push(qs ? `${targetPath}?${qs}` : targetPath, { scroll: false });
  };

  const userEmail = session?.user?.email ?? "";
  // Google/OAuth accounts have no local password — the change-password flow is
  // only meaningful for credentials accounts.
  const isCredentialsUser = (session?.user as any)?.provider === "credentials";
  const userName = session?.user?.name ?? userEmail.split("@")[0] ?? "User";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/70 px-3 backdrop-blur-xl backdrop-saturate-150 sm:gap-3 sm:px-4">
      {/* Mobile menu toggle — opens the off-canvas sidebar drawer below lg */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global search input — debounced via Enter / blur. Filters the ads grid by name or ID. */}
      {/* suppressHydrationWarning: security extensions (e.g. Bitdefender) inject a
          `bis_skin_checked` attribute onto this div before React hydrates. */}
      <div suppressHydrationWarning className="group relative flex h-9 w-full min-w-0 max-w-[420px] items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm transition-all duration-200 focus-within:bg-background focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_oklch(0.58_0.21_264_/_0.12)]">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-colors group-focus-within:text-primary" />
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              pushQuery(searchValue);
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              setSearchValue("");
              pushQuery("");
              inputRef.current?.blur();
            }
          }}
          onBlur={() => {
            // Auto-commit on blur so users don't have to press Enter
            const urlQ = searchParams?.get("q") || "";
            if (searchValue.trim() !== urlQ) pushQuery(searchValue);
          }}
          placeholder="Search ads by name or ID…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none"
          aria-label="Search ads"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              pushQuery("");
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Clear search"
            title="Clear (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex shrink-0">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <div suppressHydrationWarning className="ml-auto flex items-center gap-1.5">
        {notificationIconEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[230px] text-center">
              <p className="font-semibold">Notifications are on the way 🔔</p>
              <p className="mt-0.5 opacity-80">
                We&rsquo;re crafting real-time alerts — this feature is currently under development.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-accent"
                aria-label="Account menu"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session.user.image ?? ""} alt={userName} />
                  <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                    {initials || <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="truncate text-sm font-medium">{userName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer text-sm">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer text-sm">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
              </Link>
              {isCredentialsUser && (
                <DropdownMenuItem
                  className="cursor-pointer text-sm"
                  onSelect={(e) => {
                    e.preventDefault();
                    setPasswordDialogOpen(true);
                  }}
                >
                  <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                  Change password
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-sm text-destructive focus:text-destructive"
                onSelect={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} email={userEmail} />
    </header>
  );
}
