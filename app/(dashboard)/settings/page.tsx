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
  const [mounted, setMounted] = useState(false);

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

  const handleSave = () => {
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
    <div className="mx-auto max-w-3xl px-6 py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage how the dashboard looks and behaves for your account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <Card className="rounded-md border-border bg-card">
          <CardHeader className="space-y-1 px-5 pb-4 pt-5">
            <CardTitle className="text-base font-semibold">Appearance</CardTitle>
            <CardDescription className="text-xs">
              Light, dark, or follow your system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme.</p>
              </div>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors",
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
        <Card className="rounded-md border-border bg-card">
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

        {/* Accessibility — placeholder for future */}
        <Card className="rounded-md border-border bg-card">
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
          <Button variant="ghost" className="h-9" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button className="h-9" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
