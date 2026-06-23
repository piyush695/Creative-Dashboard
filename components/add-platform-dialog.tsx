"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Check, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms } from "@/components/providers/platforms-provider";

/** Shown whenever someone tries to remove/modify an already-connected platform. */
const MANAGED_IN_SETTINGS_MESSAGE =
  "This integration is currently managed through the Settings section and cannot be modified here. Please visit Settings to make any changes.";

/**
 * Admin-only picker for adding a platform to the Analyze section. Lists every
 * catalog platform that isn't already enabled; selecting one enables it
 * globally (persisted), after which it appears in the sidebar nav for everyone.
 */
export function AddPlatformDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { availablePlatforms, enabledPlatforms, enable } = usePlatforms();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Connected (enabled) platforms stay visible here but are read-only — they're
  // managed from Settings, so any attempt to touch them is gently redirected.
  const handleConnectedClick = () => {
    toast({
      title: "Managed in Settings",
      description: MANAGED_IN_SETTINGS_MESSAGE,
    });
  };

  const handleAdd = async (id: string, label: string) => {
    setPendingId(id);
    const ok = await enable(id);
    setPendingId(null);
    if (ok) {
      toast({ title: "Platform added", description: `${label} is now available in Analyze.` });
      // Close once nothing is left to add, otherwise let them add more.
      if (availablePlatforms.length <= 1) onOpenChange(false);
    } else {
      toast({
        title: "Couldn't add platform",
        description: "Only administrators can add platforms.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border-border bg-card">
        <DialogHeader className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">Add Platform</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enable a platform to make it available across the dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto px-4 pb-4 space-y-4">
          {enabledPlatforms.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Connected
                </span>
                <span className="text-[10px] text-muted-foreground/60">· managed in Settings</span>
              </div>
              {enabledPlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={handleConnectedClick}
                    aria-disabled
                    title={MANAGED_IN_SETTINGS_MESSAGE}
                    className={cn(
                      "group flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-left transition-all cursor-default",
                      "hover:border-emerald-500/30"
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm", platform.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Read-only" />
                        <span className="truncate">{platform.label}</span>
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{platform.description}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3 shrink-0" />
                      <span className="hidden min-[400px]:inline">Connected</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {availablePlatforms.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Check className="h-6 w-6 text-emerald-500" />
              <p className="text-sm font-medium">All platforms are already enabled.</p>
              <p className="text-xs text-muted-foreground">
                You can disable any of them from Settings → Platform Management.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {enabledPlatforms.length > 0 && (
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Available to add
                  </span>
                </div>
              )}
              {availablePlatforms.map((platform) => {
                const Icon = platform.icon;
                const isPending = pendingId === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAdd(platform.id, platform.label)}
                    className={cn(
                      "group flex w-full min-w-0 items-center gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-left transition-all",
                      "hover:border-primary/40 hover:bg-accent disabled:opacity-60"
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm", platform.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{platform.label}</p>
                        {!platform.implemented && (
                          <span className="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{platform.description}</p>
                    </div>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        Add
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Applies to all users
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
