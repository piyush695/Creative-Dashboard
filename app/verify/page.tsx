"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, XCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function VerifyContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      setStatus("error");
      setErrorMessage("Invalid or expired verification link.");
      return;
    }

    // Magic-link landing: bounce to registration view with email pre-filled
    // so user can enter the 6-digit code they got in the same email.
    router.push(`/login?view=register&email=${email}`);
    toast({
      title: "Email verified",
      description: "Enter the 6-digit code from your email to finish.",
    });
  }, [searchParams, router, toast]);

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
      </div>
      <div className="glass rounded-xl p-6 text-center shadow-lg">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">Verifying your email…</h2>
          <p className="text-sm text-muted-foreground">Hang tight while we set up your account.</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Verification failed</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="bg-aurora flex min-h-[100svh] items-center justify-center bg-background px-4 py-8 text-foreground">
      <Suspense fallback={null}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
