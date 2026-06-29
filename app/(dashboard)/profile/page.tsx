"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Shield,
  Loader2,
  BadgeCheck,
  KeyRound,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/server/actions/profile-actions";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  useEffect(() => {
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "";
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
      });
    }
  }, [session]);

  const isGoogleUser = (session?.user as any)?.provider === "google";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGoogleUser) {
      toast({
        title: "Managed by Google",
        description:
          "These details are managed through your Google account and can't be changed within the application.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    const result = await updateProfile(formData);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      if (session?.user) {
        await update({
          ...session,
          user: { ...session.user, name: formData.name },
        });
      }
    }
    setIsLoading(false);
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials =
    session.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const userId = (session.user as any).id || "—";
  const provider = (session.user as any).provider || "Credentials";

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your display name and review account details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left — Avatar + Identity */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="card-premium rounded-xl">
            <CardContent className="flex flex-col items-center gap-3 px-5 py-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                <AvatarFallback className="bg-gradient-primary text-base font-semibold text-white">
                  {initials || <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-base font-semibold tracking-tight">{session.user?.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-500">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium rounded-xl">
            <CardHeader className="space-y-1 px-5 pb-2 pt-5">
              <CardTitle className="text-base font-semibold">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm">
              <UserIdRow userId={userId} />
              <Row label="Provider">
                <span className="capitalize">{provider}</span>
              </Row>
              <Row label="Status">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-500">Active</span>
                </span>
              </Row>
            </CardContent>
          </Card>
        </div>

        {/* Right — Edit profile + Security */}
        <div className="space-y-4 lg:col-span-8">
          <Card className="card-premium rounded-xl">
            <CardHeader className="space-y-1 px-5 pb-4 pt-5">
              <CardTitle className="text-base font-semibold">Personal details</CardTitle>
              <CardDescription className="text-xs">
                Your display name is shown across the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isGoogleUser && (
                  <div className="flex items-start gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      These details are managed through your Google account and can't be changed within the application. Update your name from your Google Account settings.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-10 pl-9 disabled:cursor-not-allowed disabled:opacity-60"
                        required
                        disabled={isGoogleUser}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        value={formData.email}
                        className="h-10 cursor-not-allowed pl-9 text-muted-foreground"
                        disabled
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Email can't be changed.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="btn-gradient h-9 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || isGoogleUser}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="card-premium rounded-xl">
            <CardHeader className="space-y-1 px-5 pb-4 pt-5">
              <CardTitle className="text-base font-semibold">Security</CardTitle>
              <CardDescription className="text-xs">
                Manage how you sign in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    {isGoogleUser ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isGoogleUser ? "Signed in with Google" : "Password"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isGoogleUser
                        ? "Your password is managed by Google and can't be changed here."
                        : "Last updated recently."}
                    </p>
                  </div>
                </div>
                {!isGoogleUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Change
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        email={formData.email}
      />
    </div>
  );
}

function UserIdRow({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const hasId = Boolean(userId) && userId !== "—";
  const masked =
    hasId && userId.length > 14
      ? `${userId.slice(0, 8)}…${userId.slice(-6)}`
      : userId;

  const handleCopy = async () => {
    if (!hasId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <Row label="User ID">
      <div className="flex items-center justify-end gap-1.5">
        <span
          className="truncate font-mono text-xs text-muted-foreground"
          title={hasId ? userId : undefined}
        >
          {masked}
        </span>
        {hasId && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Copy user ID"
            title={copied ? "Copied!" : "Copy user ID"}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 max-w-[60%] text-xs">{children}</div>
    </div>
  );
}
