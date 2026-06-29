"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { resetPassword } from "@/server/actions/auth-actions";
import { useToast } from "@/hooks/use-toast";

function ResetPasswordForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!email || !token) {
      toast({
        title: "Invalid link",
        description: "This reset link is invalid or expired.",
        variant: "destructive",
      });
      router.push("/login");
    }
  }, [email, token, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Re-enter your new password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", email!);
    formData.append("token", token!);
    formData.append("newPassword", password);

    const result = await resetPassword(formData);
    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      toast({
        title: "Password updated",
        description: "Redirecting to sign in…",
        variant: "success",
      });
      setTimeout(() => router.push("/login"), 2500);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  if (isSuccess) {
    return (
      <div className="glass w-full max-w-[400px] rounded-xl p-6 text-center shadow-lg">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight">Password updated</h2>
        <p className="mt-1 text-sm text-muted-foreground">Redirecting to sign in…</p>
        <Button className="btn-gradient mt-5 h-10 w-full" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/logos/holaprime-dark.svg"
          alt="HolaPrime"
          width={176}
          height={103}
          unoptimized
          className="h-11 w-auto dark:hidden"
        />
        <Image
          src="/logos/holaprime-light.svg"
          alt="HolaPrime"
          width={176}
          height={103}
          unoptimized
          className="hidden h-11 w-auto dark:block"
        />
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Creative Analyzer
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick something strong — at least 8 characters.
        </p>
      </div>

      <div className="glass rounded-xl p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium text-foreground">
              New password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 pl-9 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="h-10 pl-9 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-10 w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-aurora flex min-h-[100svh] items-center justify-center bg-background px-4 py-8 text-foreground">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
