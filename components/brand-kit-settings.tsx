"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  UploadCloud,
  FileText,
  ImageIcon,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocMeta {
  name: string;
  type: string;
  charCount: number;
  addedAt: string;
}
interface LogoMeta {
  dataUri: string;
  format: string;
  fileName: string;
}
interface PendingDoc {
  name: string;
  mimeType: string;
  base64: string;
}

const ACCEPT_DOCS = ".txt,.md,.markdown,.csv,.json,.html,.pdf,.docx";
const ACCEPT_LOGO = "image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp";

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BrandKitSettings() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [pastedText, setPastedText] = useState("");

  // Logo: existing preview + the staged change ('keep' | 'set' | 'clear').
  const [logo, setLogo] = useState<LogoMeta | null>(null);
  const [logoAction, setLogoAction] = useState<"keep" | "set" | "clear">("keep");
  const [pendingLogo, setPendingLogo] = useState<PendingDoc | null>(null);

  // Documents: server-stored list + staged adds/removes.
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);

  // ── Load current brand kit ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand-knowledge");
        const data = await res.json();
        if (data?.brand) {
          setBrandName(data.brand.brandName || "");
          setPastedText(data.brand.pastedText || "");
          setDocs(data.brand.documents || []);
          setLogo(data.brand.logo || null);
        }
      } catch {
        /* non-blocking */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPickLogo = async (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Logo too large", description: "Max 3 MB.", variant: "destructive" });
      return;
    }
    const dataUri = await readAsDataUri(file);
    setPendingLogo({ name: file.name, mimeType: file.type || "image/png", base64: dataUri });
    setLogo({ dataUri, format: file.type.includes("svg") ? "svg" : "png", fileName: file.name });
    setLogoAction("set");
  };

  const clearLogo = () => {
    setLogo(null);
    setPendingLogo(null);
    setLogoAction("clear");
  };

  const onPickDocs = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: PendingDoc[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast({ title: `"${file.name}" skipped`, description: "Max 25 MB per file.", variant: "destructive" });
        continue;
      }
      const dataUri = await readAsDataUri(file);
      added.push({ name: file.name, mimeType: file.type || "", base64: dataUri });
    }
    // De-dupe by name against existing pending
    setPendingDocs((prev) => {
      const names = new Set(prev.map((p) => p.name));
      return [...prev, ...added.filter((a) => !names.has(a.name))];
    });
  };

  const removeExistingDoc = (name: string) => {
    setRemovedDocs((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDocs((prev) => prev.filter((d) => d.name !== name));
  };
  const removePendingDoc = (name: string) => {
    setPendingDocs((prev) => prev.filter((d) => d.name !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { brandName, pastedText };
      if (pendingDocs.length) payload.addDocuments = pendingDocs;
      if (removedDocs.length) payload.removeDocumentNames = removedDocs;
      if (logoAction === "set" && pendingLogo) payload.logo = pendingLogo;
      if (logoAction === "clear") payload.logo = null;

      const res = await fetch("/api/brand-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      // Re-sync from server truth
      setBrandName(data.brand.brandName || "");
      setPastedText(data.brand.pastedText || "");
      setDocs(data.brand.documents || []);
      setLogo(data.brand.logo || null);
      setPendingDocs([]);
      setRemovedDocs([]);
      setPendingLogo(null);
      setLogoAction("keep");

      const warnings: string[] = data.warnings || [];
      toast({
        title: "Brand kit saved",
        description: warnings.length
          ? `Saved with notes: ${warnings.join(" ")}`
          : "Your brand info and logo are now used in image generation.",
      });
    } catch (err: any) {
      toast({ title: "Couldn't save brand kit", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    logoAction !== "keep" ||
    pendingDocs.length > 0 ||
    removedDocs.length > 0;

  return (
    <Card className="card-premium rounded-xl">
      <CardHeader className="space-y-1 px-5 pb-4 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Brand Kit
        </CardTitle>
        <CardDescription className="text-xs">
          Upload your brand info and logo. The Creative Studio uses this to enrich every
          prompt and to place your logo on generated ads.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading brand kit…
          </div>
        ) : (
          <>
            {/* Brand name */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-name" className="text-sm font-medium">Brand name</Label>
              <input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Hola Prime"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Brand info text */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-info" className="text-sm font-medium">Brand info</Label>
              <p className="text-xs text-muted-foreground">
                Voice, offers, pricing, colours, do's and don'ts. Anything the AI should know.
              </p>
              <textarea
                id="brand-info"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                placeholder="Hola Prime is a prop trading firm. Tone: confident, direct. CTA: 'Buy Challenge'. Colours: deep black + neon green. USPs: 1-step, 5% target, fast payouts…"
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Brand documents</Label>
              <p className="text-xs text-muted-foreground">
                Upload .txt, .md, .pdf or .docx brand guidelines. We read the text into the knowledge base.
              </p>

              <div
                onClick={() => docInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <UploadCloud className="h-4 w-4 opacity-60" />
                Click to upload documents
              </div>
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept={ACCEPT_DOCS}
                className="hidden"
                onChange={(e) => {
                  onPickDocs(e.target.files);
                  e.target.value = "";
                }}
              />

              {(docs.length > 0 || pendingDocs.length > 0) && (
                <div className="space-y-1.5 pt-1">
                  {docs.map((d) => (
                    <div key={`saved-${d.name}`} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{d.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{(d.charCount / 1000).toFixed(1)}k chars</span>
                      </div>
                      <button onClick={() => removeExistingDoc(d.name)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {pendingDocs.map((d) => (
                    <div key={`pending-${d.name}`} className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate text-xs">{d.name}</span>
                        <span className="shrink-0 text-[10px] font-medium text-primary">new — parsed on save</span>
                      </div>
                      <button onClick={() => removePendingDoc(d.name)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Brand logo</Label>
              <p className="text-xs text-muted-foreground">
                SVG or PNG (transparent background recommended). Composited onto ads when "Add brand logo" is on in the Studio.
              </p>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className={cn(
                    "relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 transition-colors hover:bg-muted/50",
                    logo ? "border-primary/40" : "border-border",
                  )}
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg,#8883 25%,transparent 25%),linear-gradient(-45deg,#8883 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#8883 75%),linear-gradient(-45deg,transparent 75%,#8883 75%)",
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
                  }}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo.dataUri} alt="logo" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => logoInputRef.current?.click()}>
                    {logo ? "Replace logo" : "Upload logo"}
                  </Button>
                  {logo && (
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={clearLogo}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept={ACCEPT_LOGO}
                className="hidden"
                onChange={(e) => {
                  onPickLogo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              {dirty && <span className="mr-auto text-[11px] font-medium text-amber-500">Unsaved changes</span>}
              <Button className="btn-gradient h-9" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {saving ? "Saving…" : "Save brand kit"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
