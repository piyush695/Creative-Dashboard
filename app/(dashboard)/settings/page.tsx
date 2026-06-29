"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Moon,
  Sun,
  Monitor,
  Bell,
  RefreshCw,
  Eye,
  Globe,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePlatforms } from "@/components/providers/platforms-provider";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import BrandKitSettings from "@/components/brand-kit-settings";

type ThemeMode = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const { catalog, enabledIds, setEnabled, isAdmin } = usePlatforms();
  const { notificationIconEnabled, setNotificationIconEnabled } = useUiSettings();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Platform toggles are staged locally and only committed on "Save changes".
  // Until then nothing is persisted or reflected elsewhere in the app.
  const [platformDraft, setPlatformDraft] = useState<string[]>(enabledIds);

  // Sync the draft to the live config on initial load and after a successful
  // save (both change `enabledIds`). It does NOT fire while the user edits,
  // because editing only touches the local draft — so unsaved edits are safe.
  useEffect(() => {
    setPlatformDraft(enabledIds);
  }, [enabledIds]);

  const platformsDirty =
    platformDraft.length !== enabledIds.length ||
    platformDraft.some((id) => !enabledIds.includes(id));

  const togglePlatformDraft = (id: string, next: boolean) => {
    setPlatformDraft((prev) =>
      next ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((p) => p !== id)
    );
  };

  const [prefs, setPrefs] = useState({
    refreshInterval: "manual",
    language: "en",
    notifications: false,
    realtimeSearch: true,
  });

  useEffect(() => {
    setMounted(true);
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "";
  }, []);

  // Reflect the saved notification-icon preference in the toggle (on load and
  // after a save). The toggle is a draft until "Save changes" is clicked.
  useEffect(() => {
    setPrefs((p) => ({ ...p, notifications: notificationIconEnabled }));
  }, [notificationIconEnabled]);

  const handleSave = async () => {
    // Apply the notification-icon visibility — only now does the header update.
    setNotificationIconEnabled(prefs.notifications);

    // Commit staged platform changes (admins only; no-op when unchanged).
    if (isAdmin && platformsDirty) {
      setSaving(true);
      const ok = await setEnabled(platformDraft);
      setSaving(false);
      if (!ok) {
        toast({
          title: "Couldn't save platforms",
          description: "Only administrators can manage platforms.",
          variant: "destructive",
        });
        return;
      }
    }
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  if (!mounted) return null;

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage how the dashboard looks and behaves for your account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-5 pb-4 pt-5">
            <CardTitle className="text-base font-semibold">Appearance</CardTitle>
            <CardDescription className="text-xs">
              Light, dark, or follow your system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme.</p>
              </div>
              <div className="inline-flex w-full rounded-md border border-border bg-background p-0.5 sm:w-auto">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:flex-none",
                      theme === value
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={theme === value}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-5 pb-4 pt-5">
            <CardTitle className="text-base font-semibold">Behavior</CardTitle>
            <CardDescription className="text-xs">
              How the dashboard polls and reacts to your input.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sync-interval" className="flex items-center gap-1.5 text-sm font-medium">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  Sync interval
                </Label>
                <Select
                  value={prefs.refreshInterval}
                  onValueChange={(val) => setPrefs({ ...prefs, refreshInterval: val })}
                >
                  <SelectTrigger id="sync-interval" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="30s">Every 30 seconds</SelectItem>
                    <SelectItem value="60s">Every minute</SelectItem>
                    <SelectItem value="300s">Every 5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="language" className="flex items-center gap-1.5 text-sm font-medium">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Language
                </Label>
                <Select
                  value={prefs.language}
                  onValueChange={(val) => setPrefs({ ...prefs, language: val })}
                >
                  <SelectTrigger id="language" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">Alerts for new analysis results.</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.notifications}
                  onCheckedChange={(v) => setPrefs({ ...prefs, notifications: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Search as you type</Label>
                    <p className="text-xs text-muted-foreground">Filter ads instantly while typing.</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.realtimeSearch}
                  onCheckedChange={(v) => setPrefs({ ...prefs, realtimeSearch: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Kit — brand info + logo knowledge base used by the Creative Studio */}
        <BrandKitSettings />

        {/* Platform Management — admin only. Enabling/disabling here applies
            globally and hides the platform across the whole dashboard. */}
        {isAdmin && (
          <Card className="card-premium rounded-xl">
            <CardHeader className="space-y-1 px-5 pb-4 pt-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Platform Management
              </CardTitle>
              <CardDescription className="text-xs">
                Enable or disable advertising platforms, then click{" "}
                <span className="font-medium text-foreground">Save changes</span> to apply.
                Disabled platforms are hidden everywhere — navigation, filters and selectors
                — for all users.
              </CardDescription>
              {platformsDirty && (
                <p className="text-[11px] font-medium text-amber-500">
                  You have unsaved platform changes.
                </p>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {catalog.map((platform) => {
                  const Icon = platform.icon;
                  const isEnabled = platformDraft.includes(platform.id);
                  return (
                    <div
                      key={platform.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md border p-3 transition-colors",
                        isEnabled ? "border-border bg-background/40" : "border-border bg-muted/30 opacity-70"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card", platform.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{platform.label}</p>
                            {!platform.implemented && (
                              <span className="rounded-sm border border-border bg-muted px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {isEnabled ? "Active" : "Disabled"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        disabled={saving}
                        onCheckedChange={(v) => togglePlatformDraft(platform.id, v)}
                        aria-label={`${isEnabled ? "Disable" : "Enable"} ${platform.label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accessibility — placeholder for future */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-5 pb-4 pt-5">
            <CardTitle className="text-base font-semibold">Accessibility</CardTitle>
            <CardDescription className="text-xs">
              Reduce motion and improve readability.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">High contrast</Label>
                  <p className="text-xs text-muted-foreground">Coming soon.</p>
                </div>
              </div>
              <Switch checked={false} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Action row */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            className="h-9"
            disabled={saving}
            onClick={() => {
              // Discard any staged platform edits, then leave.
              setPlatformDraft(enabledIds);
              router.push("/");
            }}
          >
            Cancel
          </Button>
          <Button className="btn-gradient h-9" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
