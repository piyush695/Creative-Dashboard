"use server"

/**
 * Live AdRoll data for the dashboard — pulled from the AdRoll API for the
 * selected calendar window, NOT from MongoDB (adroll_data holds only a couple of
 * stale error docs). Feeds the AdRoll PlatformView in server-mode
 * (fetchOverview / fetchAdsPage), mirroring the Meta/Google live paths.
 * Degrades gracefully (returns empty) if the token/EIDs are missing or invalid.
 */

import type { AdData } from "@/lib/types";

const BASE = process.env.ADROLL_API_BASE || "https://api.adroll.com";
const ADV = process.env.ADROLL_ADVERTISABLE_EID || "";

const _acache = new Map<string, { at: number; data: any }>();
const ACACHE_TTL = 3 * 60 * 1000;

async function af(endpoint: string): Promise<any> {
    const token = process.env.ADROLL_ACCESS_TOKEN;
    if (!token || !ADV) return null;
    const hit = _acache.get(endpoint);
    if (hit && Date.now() - hit.at < ACACHE_TTL) return hit.data;
    try {
        const r = await fetch(`${BASE}${endpoint}`, { headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
        if (!r.ok) { console.error("[AdRoll]", r.status, (await r.text()).slice(0, 150)); return null; }
        const j = await r.json();
        _acache.set(endpoint, { at: Date.now(), data: j });
        return j;
    } catch (e: any) { console.error("[AdRoll] fetch failed:", e.message); return null; }
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function resolveWindow(dr?: { from?: string; to?: string }): { from: string; to: string } {
    const today = new Date();
    const to = dr?.to ? dr.to.slice(0, 10) : ymd(today);
    let from: string;
    if (dr?.from) from = dr.from.slice(0, 10);
    else { const s = new Date(); s.setDate(today.getDate() - 90); from = ymd(s); }
    return { from, to };
}

export interface AdrollOverview {
    kpis: { spend: number; impressions: number; reach: number; clicks: number; conversions: number; convValue: number; ctr: number; cpc: number; cpm: number; roas: number };
    series: { label: string; revenue: number; spend: number }[];
    topCampaigns: { name: string; spend: number; count: number; clicks: number; impr: number; revenue: number; ctr: number; roas: number }[];
    formats: { name: string; value: number }[];
}

export async function fetchAdrollOverview(opts?: { accountId?: string; search?: string; dateRange?: { from?: string; to?: string } }): Promise<AdrollOverview> {
    const EMPTY: AdrollOverview = { kpis: { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, convValue: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0 }, series: [], topCampaigns: [], formats: [] };
    const { from, to } = resolveWindow(opts?.dateRange);
    const [campsRes, metRes] = await Promise.all([
        af(`/api/v1/advertisable/get_campaigns?advertisable=${ADV}`),
        af(`/api/v1/report/campaign?advertisable=${ADV}&start_date=${from}&end_date=${to}`),
    ]);
    if (!campsRes && !metRes) return EMPTY;
    const nameByEid = new Map<string, string>(), typeByEid = new Map<string, string>();
    for (const c of (campsRes?.results || [])) { if (c.eid) { nameByEid.set(c.eid, c.name || "Unnamed campaign"); typeByEid.set(c.eid, c.campaign_type || c.type || "AdRoll"); } }
    let spend = 0, impressions = 0, clicks = 0, conversions = 0, convValue = 0;
    const fmtMap = new Map<string, number>();
    const campRows = (metRes?.results || []).map((m: any) => {
        const cost = +m.cost || 0, im = +m.impressions || 0, cl = +m.clicks || 0, cv = +m.total_conversions || 0, rev = +m.attributed_rev || 0;
        spend += cost; impressions += im; clicks += cl; conversions += cv; convValue += rev;
        const eid = m.eid || m.campaign;
        const type = typeByEid.get(eid) || m.type || "AdRoll";
        fmtMap.set(type, (fmtMap.get(type) || 0) + cost);
        return { name: nameByEid.get(eid) || m.campaign || "Unnamed campaign", spend: cost, count: Math.round(cv), clicks: cl, impr: im, revenue: rev, ctr: im > 0 ? (cl / im) * 100 : 0, roas: cost > 0 ? rev / cost : 0 };
    }).sort((a: any, b: any) => b.spend - a.spend);
    const kpis = {
        spend, impressions, reach: impressions, clicks, conversions, convValue,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0, roas: spend > 0 ? convValue / spend : 0,
    };
    const formats = [...fmtMap.entries()].map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    // AdRoll's range report has no per-day breakdown, so show a simple period
    // summary line (start → end) rather than a flat empty chart.
    const series = (spend > 0 || convValue > 0) ? [{ label: from.slice(5), revenue: 0, spend: 0 }, { label: to.slice(5), revenue: convValue, spend }] : [];
    return { kpis, series, topCampaigns: campRows.slice(0, 8), formats };
}

export async function fetchAdrollAdsPage(opts?: { accountId?: string; search?: string; page?: number; perPage?: number; dateRange?: { from?: string; to?: string } }): Promise<{ ads: AdData[]; total: number }> {
    const { page = 1, perPage = 10, search = "" } = opts || {};
    const { from, to } = resolveWindow(opts?.dateRange);
    const [adsRes, metRes] = await Promise.all([
        af(`/api/v1/advertisable/get_ads?advertisable=${ADV}`),
        af(`/api/v1/report/ad?advertisable=${ADV}&start_date=${from}&end_date=${to}`),
    ]);
    const mByEid = new Map<string, any>();
    for (const m of (metRes?.results || [])) { if (m.eid) mByEid.set(m.eid, m); }
    let mapped: AdData[] = (adsRes?.results || []).map((ad: any) => {
        const m = mByEid.get(ad.eid) || {};
        const cost = +m.cost || 0, im = +m.impressions || 0, cl = +m.clicks || 0, rev = +m.attributed_rev || 0;
        return {
            id: ad.eid, _id: ad.eid, adId: ad.eid,
            adName: ad.name || `AdRoll ${ad.eid}`,
            campaignName: ad.campaign_name || "", platform: "adroll", adType: ad.type || "AdRoll Ad",
            thumbnailUrl: ad.src || "", imageUrl: ad.src || "",
            spend: cost, impressions: im, clicks: cl, conversions: +m.total_conversions || 0,
            purchaseValue: rev, ctr: im > 0 ? (cl / im) * 100 : 0, cpc: cl > 0 ? cost / cl : 0, roas: cost > 0 ? rev / cost : 0,
        } as any as AdData;
    });
    // Drop pure-zero rows with no creative (avoids a wall of empty ads).
    mapped = mapped.filter((a: any) => a.spend > 0 || a.impressions > 0 || a.thumbnailUrl);
    const term = search.trim().toLowerCase();
    if (term) mapped = mapped.filter((a: any) => (a.adName || "").toLowerCase().includes(term) || (a.campaignName || "").toLowerCase().includes(term) || String(a.adId || "").includes(term));
    mapped.sort((a: any, b: any) => b.spend - a.spend);
    const total = mapped.length;
    const start = (Math.max(1, page) - 1) * perPage;
    return { ads: mapped.slice(start, start + perPage), total };
}
