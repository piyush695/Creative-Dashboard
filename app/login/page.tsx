"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Sun, Moon, Loader2, ArrowLeft } from "lucide-react";
import { GoogleLogo } from "@/components/icons/platforms";
import {
  sendVerificationCode,
  verifyAndRegister,
  sendPasswordResetCode,
  verifyResetOTP,
  resetPassword,
} from "@/actions/auth-actions";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

type View = "login" | "register" | "forgot";
type RegStep = "details" | "otp";
type ForgotStep = "email" | "otp" | "reset";

export default function LoginPage() {
  const { toast } = useToast();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [view, setView] = useState<View>("login");
  const [isLoading, setIsLoading] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);

  // Registration
  const [regStep, setRegStep] = useState<RegStep>("details");
  const [regData, setRegData] = useState({ name: "", email: "", password: "" });
  const [regOtp, setRegOtp] = useState("");

  // Forgot password
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") window.location.replace("/");
  }, [status]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    let title = "Sign-in failed";
    let description = "An unexpected error occurred. Please try again.";
    if (error === "CredentialsSignin") description = "Invalid email or password.";
    else if (error === "AccessDenied" || error === "Configuration") {
      title = "Access restricted";
      description = "This dashboard is for @holaprime.com team members only.";
    }
    toast({ title, description, variant: "destructive", duration: 5000 });
    const timer = setTimeout(() => router.replace("/login"), 5000);
    return () => clearTimeout(timer);
  }, [searchParams, toast, router]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleRegisterStep1 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await sendVerificationCode(formData);
    setIsLoading(false);
    if (result.error === "AccountAlreadyExists") {
      setView("login");
      toast({ title: "Account exists", description: "This email is already registered. Please sign in." });
    } else if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setRegData({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });
      setRegStep("otp");
      toast({ title: "Code sent", description: "Verification code sent to your inbox.", variant: "success" });
    }
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOtp) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append("name", regData.name);
    formData.append("email", regData.email);
    formData.append("password", regData.password);
    formData.append("otp", regOtp);
    const result = await verifyAndRegister(formData);
    setIsLoading(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Welcome", description: "Account verified — taking you in.", variant: "success" });
      window.location.replace("/?loggedIn=true&welcome=true");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = ((formData.get("email") as string) || "").trim().toLowerCase();
    const password = formData.get("password") as string;
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        const msg = result.error === "EmailNotVerified" ? "Please verify your email first." : "Invalid email or password.";
        toast({ title: "Sign-in failed", description: msg, variant: "destructive" });
      } else {
        window.location.replace("/?loggedIn=true");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signIn("google", { callbackUrl: "/?loggedIn=true", redirect: false });
      if (result?.url) window.location.replace(result.url);
    } catch {
      toast({ title: "Connection error", description: "Failed to initialize Google sign-in.", variant: "destructive" });
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", forgotEmail);
    const result = await sendPasswordResetCode(formData);
    setIsLoading(false);
    if (result.error === "UserNotFound") {
      toast({ title: "Account not found", description: "Create an account first." });
      setView("register");
    } else if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setForgotStep("otp");
      toast({ title: "Code sent", description: "Recovery code sent to your email.", variant: "success" });
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", forgotEmail);
    formData.append("otp", forgotOtp);
    const result = await verifyResetOTP(formData);
    setIsLoading(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setForgotStep("reset");
      toast({ title: "Verified", description: "Set your new password below.", variant: "success" });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResetPassword || !confirmResetPassword) return;
    if (newResetPassword !== confirmResetPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your new password.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", forgotEmail);
    formData.append("otp", forgotOtp);
    formData.append("newPassword", newResetPassword);
    const result = await resetPassword(formData);
    setIsLoading(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Please sign in with your new password.", variant: "success" });
      setView("login");
      setForgotStep("email");
      setForgotEmail("");
      setForgotOtp("");
      setNewResetPassword("");
      setConfirmResetPassword("");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (!mounted) return <div className="min-h-screen bg-background" />;

  const headerTitle =
    view === "login" ? "Sign in" : view === "register" ? "Create account" : "Reset password";
  const headerSubtitle =
    view === "login"
      ? "Welcome back. Sign in to your HolaPrime dashboard."
      : view === "register"
      ? "Use your @holaprime.com email to register."
      : "We'll send a one-time code to your inbox.";

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-[13px] font-semibold">
            h
          </div>
          <div className="text-sm font-semibold tracking-tight">hola prime</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      {/* Centered auth card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          {/* Title block */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{headerTitle}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{headerSubtitle}</p>
          </div>

          <div className="rounded-md border border-border bg-card p-6">
            {/* ── LOGIN ──────────────────────────────────────────────── */}
            {view === "login" && (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-center gap-2"
                  onClick={handleGoogleLogin}
                >
                  <GoogleLogo className="h-4 w-4" />
                  <span className="text-sm font-medium">Continue with Google</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@holaprime.com"
                        className="h-10 pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-medium text-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-10 pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="h-10 w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </div>
            )}

            {/* ── REGISTER ───────────────────────────────────────────── */}
            {view === "register" && regStep === "details" && (
              <form onSubmit={handleRegisterStep1} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-xs font-medium text-foreground">
                    Name
                  </Label>
                  <Input id="reg-name" name="name" placeholder="Full name" className="h-10" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="reg-email"
                    name="email"
                    type="email"
                    placeholder="name@holaprime.com"
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-xs font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      name="password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      className="h-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="h-10 w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Sending code…" : "Send verification code"}
                </Button>
              </form>
            )}

            {view === "register" && regStep === "otp" && (
              <form onSubmit={handleRegisterStep2} className="space-y-5">
                <div className="rounded-md border border-border bg-muted/40 p-4 text-center">
                  <div className="text-sm font-medium">Check your inbox</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We sent a 6-digit code to <span className="text-foreground">{regData.email}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-otp" className="text-xs font-medium text-foreground">
                    Verification code
                  </Label>
                  <Input
                    id="reg-otp"
                    value={regOtp}
                    onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    className="h-12 text-center text-xl font-semibold tracking-[0.5em] tabular-nums"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={isLoading || regOtp.length < 6}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Verifying…" : "Verify and create account"}
                </Button>
                <button
                  type="button"
                  onClick={() => setRegStep("details")}
                  className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Edit details
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD ────────────────────────────────────── */}
            {view === "forgot" && forgotStep === "email" && (
              <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-email" className="text-xs font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="f-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@holaprime.com"
                    className="h-10"
                    required
                  />
                </div>
                <Button type="submit" className="h-10 w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Sending code…" : "Send recovery code"}
                </Button>
              </form>
            )}

            {view === "forgot" && forgotStep === "otp" && (
              <form onSubmit={handleForgotOtpSubmit} className="space-y-5">
                <div className="rounded-md border border-border bg-muted/40 p-4 text-center">
                  <div className="text-sm font-medium">Check your inbox</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recovery code sent to <span className="text-foreground">{forgotEmail}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-otp" className="text-xs font-medium text-foreground">
                    Recovery code
                  </Label>
                  <Input
                    id="f-otp"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    className="h-12 text-center text-xl font-semibold tracking-[0.5em] tabular-nums"
                    required
                  />
                </div>
                <Button type="submit" className="h-10 w-full" disabled={isLoading || forgotOtp.length < 6}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Verifying…" : "Verify code"}
                </Button>
              </form>
            )}

            {view === "forgot" && forgotStep === "reset" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass" className="text-xs font-medium text-foreground">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showResetPassword ? "text" : "password"}
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showResetPassword ? "Hide password" : "Show password"}
                    >
                      {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass" className="text-xs font-medium text-foreground">
                    Confirm new password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirmResetPassword ? "text" : "password"}
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="h-10 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmResetPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmResetPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="h-10 w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}

            {view === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setForgotStep("email");
                }}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            )}
          </div>

          {/* Footer toggle between login and register */}
          {view !== "forgot" && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {view === "login" ? (
                <>
                  No account?{" "}
                  <button
                    onClick={() => setView("register")}
                    className="font-medium text-primary hover:underline"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setView("login");
                      setRegStep("details");
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
