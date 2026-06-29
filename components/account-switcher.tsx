"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface AccountStat {
  id: string;
  name: string;
  count: number;
}

export interface AccountSwitcherProps {
  selectedAccountId: string;
  accountStats: AccountStat[];
  totalAds: number;
  onSelectAccount: (id: string) => void;
  /** Visual style — `pill` matches the platform header chips (next to Live). */
  variant?: "pill" | "inline";
  className?: string;
}

/**
 * Ad-account switcher. Previously lived in the breadcrumb; now rendered in the
 * platform header next to the Live status. Lists accounts that have ads first,
 * then accounts that aren't synced yet (greyed out with a 0 badge).
 */
export function AccountSwitcher({
  selectedAccountId,
  accountStats,
  totalAds,
  onSelectAccount,
  variant = "pill",
  className,
}: AccountSwitcherProps) {
  const withAds = accountStats.filter((a) => a.count > 0);
  const empty = accountStats.filter((a) => a.count === 0);

  const label =
    selectedAccountId === "all"
      ? "All accounts"
      : accountStats.find((a) => a.id === selectedAccountId)?.name || "All accounts";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group inline-flex items-center gap-1.5 transition-colors",
            variant === "pill"
              ? "rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted/60"
              : "text-xs font-medium text-foreground hover:text-primary",
            className,
          )}
          title="Switch ad account"
          aria-label="Switch ad account"
        >
          <span className="max-w-[120px] truncate sm:max-w-[160px] lg:max-w-none">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-72 overflow-y-auto rounded-md p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
          Switch account
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onSelectAccount("all")}
          className={cn(
            "flex items-center justify-between rounded-md p-2 cursor-pointer",
            selectedAccountId === "all" && "bg-primary/10 text-primary",
          )}
        >
          <span className="text-xs font-semibold">All accounts</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{totalAds}</span>
        </DropdownMenuItem>
        {accountStats.length > 0 && <DropdownMenuSeparator />}
        {withAds.map((acc) => (
          <DropdownMenuItem
            key={acc.id}
            onClick={() => onSelectAccount(acc.id)}
            className={cn(
              "flex items-center justify-between rounded-md p-2 cursor-pointer",
              selectedAccountId === acc.id && "bg-primary/10 text-primary",
            )}
          >
            <span className="truncate pr-2 text-xs">{acc.name}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{acc.count}</span>
          </DropdownMenuItem>
        ))}
        {empty.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/70">
              Not synced yet ({empty.length})
            </DropdownMenuLabel>
            {empty.map((acc) => (
              <DropdownMenuItem
                key={acc.id}
                onClick={() => onSelectAccount(acc.id)}
                className={cn(
                  "flex items-center justify-between rounded-md p-2 cursor-pointer opacity-60",
                  selectedAccountId === acc.id && "bg-primary/10 text-primary opacity-100",
                )}
              >
                <span className="truncate pr-2 text-xs">{acc.name}</span>
                <span className="shrink-0 font-mono text-[9px] italic text-muted-foreground">0 ads</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountSwitcher;
