"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BadgePercent, Loader2, Plus, Save, Trash2 } from "lucide-react";

interface OfferRow {
  text: string;
  expires: string | null; // YYYY-MM-DD or null (open-ended)
  note: string;
  live?: boolean;
}

// Settings → Active Offers. The time-limited claims (prices, promo codes,
// discount %s) the COMPLIANCE GATE accepts in generated ad copy. Anything not
// listed here (or in the evergreen brand facts) gets stripped from creatives.
// Expired entries stop validating immediately — an expired code is treated
// like an invented one.
export default function ActiveOffersSettings() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/active-offers")
      .then((r) => r.json())
      .then((d) => setOffers(Array.isArray(d.offers) ? d.offers : []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<OfferRow>) => {
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
    setDirty(true);
  };
  const remove = (i: number) => { setOffers((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const add = () => { setOffers((prev) => [...prev, { text: "", expires: null, note: "" }]); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/active-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setDirty(false);
      // Re-fetch so live/expired badges reflect the saved state.
      const fresh = await fetch("/api/active-offers").then((r) => r.json());
      setOffers(Array.isArray(fresh.offers) ? fresh.offers : []);
      toast({ title: "Active offers saved", description: `${data.count} offer${data.count === 1 ? "" : "s"} now validate in generated creatives.` });
    } catch (err: any) {
      toast({ title: "Couldn't save offers", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isLive = (o: OfferRow) => {
    if (!o.expires) return true;
    return new Date(`${o.expires}T23:59:59`).getTime() >= Date.now();
  };

  return (
    <Card className="card-premium rounded-xl">
      <CardHeader className="space-y-1 px-5 pb-4 pt-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BadgePercent className="h-4 w-4 text-muted-foreground" />
          Active Offers
        </CardTitle>
        <CardDescription className="text-xs">
          The time-limited prices, promo codes and discounts the compliance gate allows in generated creatives. Anything not listed here (or in the evergreen brand facts) is stripped automatically. Expired offers stop validating immediately — set an expiry for every campaign.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 px-5 pb-5">
        {loading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading offers…
          </div>
        ) : (
          <>
            {offers.length > 0 && (
              <div className="hidden gap-2 sm:grid sm:grid-cols-[1fr_150px_1fr_60px_28px] px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Offer text</span><span>Expires</span><span>Note</span><span>Status</span><span />
              </div>
            )}
            {offers.map((o, i) => (
              <div key={i} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border bg-background/60 p-2 sm:grid-cols-[1fr_150px_1fr_60px_28px]">
                <Input
                  value={o.text}
                  placeholder='e.g. "$39" or "WELCOME20"'
                  className="h-8 text-xs font-medium"
                  onChange={(e) => update(i, { text: e.target.value })}
                />
                <Input
                  type="date"
                  value={o.expires || ""}
                  className="h-8 text-xs"
                  title="Expiry (inclusive). Leave empty for open-ended."
                  onChange={(e) => update(i, { expires: e.target.value || null })}
                />
                <Input
                  value={o.note}
                  placeholder="Campaign note (optional)"
                  className="h-8 text-xs"
                  onChange={(e) => update(i, { note: e.target.value })}
                />
                <span
                  className={`justify-self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold ${isLive(o)
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                    }`}
                >
                  {isLive(o) ? "Live" : "Expired"}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-400" title="Remove offer" onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {offers.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                No active offers — generated creatives can only use evergreen brand facts and figures typed in the prompt.
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={add}>
                <Plus className="mr-1.5 h-3 w-3" /> Add offer
              </Button>
              <Button size="sm" className="h-8 text-xs" disabled={!dirty || saving} onClick={save}>
                {saving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                Save changes
              </Button>
              {dirty && <span className="text-[10px] text-amber-500">Unsaved changes</span>}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Takes effect on the next generation — no restart needed. Evergreen claims (payout speed, rewards %, Trustpilot rating) are managed in the approved brand-facts list, not here.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
