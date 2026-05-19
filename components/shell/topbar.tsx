"use client";

import { useSession, signOut } from "next-auth/react";
import { Search, Sun, Moon, LogOut, User, Settings, Lock } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useState } from "react";
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

export function Topbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const userEmail = session?.user?.email ?? "";
  const userName = session?.user?.name ?? userEmail.split("@")[0] ?? "User";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      {/* Command palette trigger (real cmd-K wiring is M5) */}
      <button
        type="button"
        className="group flex h-8 w-full max-w-[420px] items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Search"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate text-left">Search ads, creatives, accounts…</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
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
                className="flex h-8 items-center gap-2 rounded-md px-1.5 transition-colors hover:bg-accent"
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
