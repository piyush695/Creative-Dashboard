"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { BRAND_ASSET_SLOTS, type BrandAssetSlot } from "@/lib/brand-asset-slots";

const ACCEPT = "image/png,image/svg+xml,image/webp,image/jpeg,.png,.svg,.webp,.jpg,.jpeg";

function readAsDataUri(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Settings → Brand Assets. Manages the recurring creative furniture the Studio
// composites onto every ad (logo variants, Trustpilot, Deloitte, ZPD stamp).
// Uploads are written to public/brand/ where the template engine reads them, so
// a replacement takes effect on the next generation with no redeploy.
export default function BrandAssetsSettings() {
  const { toast } = useToast();
  const [ver, setVer] = useState<Record<string, number>>({}); // cache-bust preview per slot
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const onPick = async (slot: BrandAssetSlot, file?: File) => {
    if (!file) return;
    setBusy(slot.key);
    try {
      const dataUri = await readAsDataUri(file);
      const res = await fetch("/api/brand-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: slot.key, dataUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setVer((v) => ({ ...v, [slot.key]: Date.now() }));
      toast({ title: "Brand asset updated", description: `${slot.label} is now used on new creatives.` });
    } catch (err: any) {
      toast({ title: "Couldn't update asset", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const groups: Array<{ id: BrandAssetSlot["group"]; title: string }> = [
    { id: "Logo", title: "Logo" },
    { id: "Trust", title: "Trust marks" },
  ];

  return (
    <Card className="card-premium rounded-xl">
      <CardHeader className="space-y-1 px-5 pb-4 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Brand Assets
        </CardTitle>
        <CardDescription className="text-xs">
          The recurring elements the Studio composites onto every creative — logo, Trustpilot, Deloitte and the Zero Payout Denial stamp. Replace any of them here; new creatives use the update immediately.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5">
        {groups.map((g) => (
          <div key={g.id} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {BRAND_ASSET_SLOTS.filter((s) => s.group === g.id).map((slot) => {
                const v = ver[slot.key];
                const src = `/brand/${slot.file}${v ? `?v=${v}` : ""}`;
                return (
                  <div key={slot.key} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2.5">
                    <div
                      className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
                      style={{ background: slot.darkPreview ? "#0a0a12" : "#ffffff" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={slot.label}
                        className="h-full w-full object-contain p-1.5"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-foreground">{slot.label}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1.5 h-7 text-xs"
                        disabled={busy === slot.key}
                        onClick={() => inputs.current[slot.key]?.click()}
                      >
                        {busy === slot.key ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <UploadCloud className="mr-1.5 h-3 w-3" />}
                        Replace
                      </Button>
                      <input
                        ref={(el) => { inputs.current[slot.key] = el; }}
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        onChange={(e) => { onPick(slot, e.target.files?.[0]); e.target.value = ""; }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          Tip: transparent PNGs work best. White versions sit on dark ads, dark versions on light ads — the engine picks the right one per background automatically.
        </p>
      </CardContent>
    </Card>
  );
}
