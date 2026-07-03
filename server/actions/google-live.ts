"use server"

/**
 * Live Google Ads data for the dashboard — pulled straight from the Google Ads
 * API (GAQL) for the selected calendar window, NOT from MongoDB. The stored
 * google_asset_data is a tiny stale sample (a handful of Feb docs), whereas the
 * live account has 180+ campaigns. These server actions feed the Google
 * PlatformView in server-mode (fetchOverview / fetchAdsPage) + the Keywords tab,
 * mirroring the Meta server-mode path. Date filtering is by Google's own
 * segments.date. Degrades gracefully (returns empty) if creds are missing/invalid.
 */

import type { AdData } from "@/lib/types";

const V = "v23";
let _tok: { token: string; exp: number } | null = null;

async function gToken(): Promise<string | null> {
    if (_tok && Date.now() < _tok.exp) return _tok.token;
    const cid = process.env.GOOGLE_ADS_CLIENT_ID, cs = process.env.GOOGLE_ADS_CLIENT_SECRET, rt = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    if (!cid || !cs || !rt) return null;
    try {
        const body = new URLSearchParams({ client_id: cid, client_secret: cs, refresh_token: rt, grant_type: "refresh_token" });
        const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
        const j: any = await r.json();
        if (!r.ok || !j.access_token) { console.error("[GoogleLive] token error:", JSON.stringify(j).slice(0, 200)); return null; }
        _tok = { token: j.access_token, exp: Date.now() + ((j.expires_in || 3600) - 60) * 1000 };
        return j.access_token;
    } catch (e: any) { console.error("[GoogleLive] token failed:", e.message); return null; }
}

// Cache GAQL responses by query string (which embeds the date range), so tab
// switches / re-renders / repeat visits to the same window are instant instead
// of re-hitting the Google API (the source of the 5-6s loads).
const _gcache = new Map<string, { at: number; rows: any[] }>();
const GCACHE_TTL = 3 * 60 * 1000;

async function gaql(query: string): Promise<any[]> {
    const cached = _gcache.get(query);
    if (cached && Date.now() - cached.at < GCACHE_TTL) return cached.rows;
    const token = await gToken();
    if (!token) return [];
    const cust = (process.env.GOOGLE_ADS_CLIENT_CUSTOMER_ID || "").replace(/-/g, "");
    const login = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/-/g, "");
    const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
    const url = `https://googleads.googleapis.com/${V}/customers/${cust}/googleAds:search`;
    let out: any[] = [], pageToken: string | null = null;
    try {
        do {
            const b: any = { query }; if (pageToken) b.pageToken = pageToken;
            const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "developer-token": dev, "login-customer-id": login, "Content-Type": "application/json" }, body: JSON.stringify(b) });
            if (!r.ok) { console.error("[GoogleLive] GAQL", r.status, (await r.text()).slice(0, 200)); break; }
            const j: any = await r.json();
            out = out.concat(j.results || []);
            pageToken = j.nextPageToken || null;
        } while (pageToken);
    } catch (e: any) { console.error("[GoogleLive] gaql failed:", e.message); }
    if (out.length > 0) _gcache.set(query, { at: Date.now(), rows: out }); // don't cache empty/error results
    return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// The calendar's "All time" (no range) maps to a wide window; an explicit range
// is honoured. GAQL needs bounded dates, so there is always a from/to.
function resolveWindow(dr?: { from?: string; to?: string }): { from: string; to: string } {
    const to = dr?.to ? dr.to.slice(0, 10) : ymd(new Date());
    const from = dr?.from ? dr.from.slice(0, 10) : "2024-01-01";
    return { from, to };
}
const micros = (m: any) => (+m || 0) / 1e6;

const CHANNEL_LABEL: Record<string, string> = {
    PERFORMANCE_MAX: "Performance Max", SEARCH: "Search", DISPLAY: "Display", VIDEO: "Video",
    SHOPPING: "Shopping", DISCOVERY: "Demand Gen", DEMAND_GEN: "Demand Gen", MULTI_CHANNEL: "App", LOCAL_SERVICES: "Local", SMART: "Smart",
};

export interface GoogleOverview {
    kpis: { spend: number; impressions: number; reach: number; clicks: number; conversions: number; convValue: number; ctr: number; cpc: number; cpm: number; roas: number };
    series: { label: string; revenue: number; spend: number }[];
    topCampaigns: { name: string; spend: number; count: number; clicks: number; impr: number; revenue: number; ctr: number; roas: number }[];
    formats: { name: string; value: number }[];
}

export async function fetchGoogleOverview(opts?: { accountId?: string; search?: string; dateRange?: { from?: string; to?: string } }): Promise<GoogleOverview> {
    const EMPTY: GoogleOverview = { kpis: { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, convValue: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0 }, series: [], topCampaigns: [], formats: [] };
    const { from, to } = resolveWindow(opts?.dateRange);
    const W = `segments.date BETWEEN '${from}' AND '${to}'`;
    try {
        const [daily, camps] = await Promise.all([
            gaql(`SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM customer WHERE ${W}`),
            gaql(`SELECT campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE ${W} AND metrics.cost_micros > 0`),
        ]);

        let spend = 0, impressions = 0, clicks = 0, conversions = 0, convValue = 0;
        const dayMap = new Map<string, { day: string; revenue: number; spend: number }>();
        for (const r of daily) {
            const m = r.metrics || {}; const sp = micros(m.costMicros), rev = +m.conversionsValue || 0;
            spend += sp; impressions += +m.impressions || 0; clicks += +m.clicks || 0; conversions += +m.conversions || 0; convValue += rev;
            const d = r.segments?.date || "—"; const e = dayMap.get(d) || { day: d, revenue: 0, spend: 0 }; e.spend += sp; e.revenue += rev; dayMap.set(d, e);
        }
        let series = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-14)
            .map((d) => ({ label: d.day === "—" ? "—" : new Date(d.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: d.revenue, spend: d.spend }));
        if (series.length === 1) series = [{ ...series[0], label: "" }, series[0]];

        const fmtMap = new Map<string, number>();
        const campRows = camps.map((r) => {
            const m = r.metrics || {}; const sp = micros(m.costMicros), rev = +m.conversionsValue || 0, cl = +m.clicks || 0, im = +m.impressions || 0, cv = +m.conversions || 0;
            const ch = CHANNEL_LABEL[r.campaign?.advertisingChannelType] || (r.campaign?.advertisingChannelType || "Other");
            fmtMap.set(ch, (fmtMap.get(ch) || 0) + sp);
            return { name: r.campaign?.name || "Unnamed campaign", spend: sp, count: Math.round(cv), clicks: cl, impr: im, revenue: rev, ctr: im > 0 ? (cl / im) * 100 : 0, roas: sp > 0 ? rev / sp : 0 };
        }).sort((a, b) => b.spend - a.spend);

        const kpis = {
            spend, impressions, reach: impressions, clicks, conversions, convValue,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
            cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
            roas: spend > 0 ? convValue / spend : 0,
        };
        const formats = [...fmtMap.entries()].map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
        return { kpis, series, topCampaigns: campRows.slice(0, 8), formats };
    } catch (e: any) { console.error("fetchGoogleOverview failed:", e); return EMPTY; }
}

// resource_name → CDN image URL, for resolving Display ads' marketing images. Cached.
async function imageAssetMap(): Promise<Map<string, string>> {
    const rows = await gaql(`SELECT asset.resource_name, asset.image_asset.full_size.url FROM asset WHERE asset.type = 'IMAGE'`);
    const m = new Map<string, string>();
    for (const r of rows) { const rn = r.asset?.resourceName, u = r.asset?.imageAsset?.fullSize?.url; if (rn && u) m.set(rn, u); }
    return m;
}

export async function fetchGoogleAdsPage(opts?: { accountId?: string; search?: string; page?: number; perPage?: number; dateRange?: { from?: string; to?: string } }): Promise<{ ads: AdData[]; total: number }> {
    const { page = 1, perPage = 10, search = "" } = opts || {};
    const { from, to } = resolveWindow(opts?.dateRange);
    const W = `segments.date BETWEEN '${from}' AND '${to}'`;
    try {
        const [rows, imgMap] = await Promise.all([
            gaql(`SELECT ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_display_ad.headlines, ad_group_ad.ad.responsive_display_ad.marketing_images, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE ${W} AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC`),
            imageAssetMap(),
        ]);
        let mapped: AdData[] = rows.map((r) => {
            const ad = r.adGroupAd?.ad || {};
            const m = r.metrics || {}; const sp = micros(m.costMicros), rev = +m.conversionsValue || 0, im = +m.impressions || 0, cl = +m.clicks || 0;
            const id = String(ad.id || "");
            const type = String(ad.type || "").replace(/_/g, " ");
            // Real ad copy as the card title (Search + Display headlines).
            const headlines: string[] = (ad.responsiveSearchAd?.headlines || ad.responsiveDisplayAd?.headlines || []).map((h: any) => h.text).filter(Boolean);
            // Real creative image for Display ads (resolve the first marketing image asset → CDN URL).
            const imgRef = ad.responsiveDisplayAd?.marketingImages?.[0]?.asset;
            const thumb = imgRef ? (imgMap.get(imgRef) || "") : "";
            return {
                id, _id: id, adId: id,
                adName: headlines[0] || `${type || "Ad"} ${id}`,
                headline: headlines[0] || "", adCopy: headlines.slice(0, 3).join(" · "),
                campaignName: r.campaign?.name || "", platform: "google", adType: type,
                thumbnailUrl: thumb, imageUrl: thumb,
                spend: sp, impressions: im, clicks: cl, conversions: +m.conversions || 0,
                purchaseValue: rev, ctr: im > 0 ? (cl / im) * 100 : 0, cpc: cl > 0 ? sp / cl : 0, roas: sp > 0 ? rev / sp : 0,
            } as any as AdData;
        });
        const term = search.trim().toLowerCase();
        if (term) mapped = mapped.filter((a: any) => (a.adName || "").toLowerCase().includes(term) || (a.campaignName || "").toLowerCase().includes(term) || String(a.adId || "").includes(term));
        const total = mapped.length;
        const start = (Math.max(1, page) - 1) * perPage;
        return { ads: mapped.slice(start, start + perPage), total };
    } catch (e: any) { console.error("fetchGoogleAdsPage failed:", e); return { ads: [], total: 0 }; }
}

export interface GoogleKeyword { term: string; spend: number; impressions: number; clicks: number; ctr: number }
export async function fetchGoogleKeywords(opts?: { search?: string; dateRange?: { from?: string; to?: string } }): Promise<{ terms: GoogleKeyword[]; error?: string }> {
    const { from, to } = resolveWindow(opts?.dateRange);
    const W = `segments.date BETWEEN '${from}' AND '${to}'`;
    try {
        const rows = await gaql(`SELECT search_term_view.search_term, metrics.cost_micros, metrics.impressions, metrics.clicks FROM search_term_view WHERE ${W} AND metrics.cost_micros > 0`);
        const map = new Map<string, GoogleKeyword>();
        for (const r of rows) {
            const t = (r.searchTermView?.searchTerm || "").trim(); if (!t) continue;
            const m = r.metrics || {}; const e = map.get(t) || { term: t, spend: 0, impressions: 0, clicks: 0, ctr: 0 };
            e.spend += micros(m.costMicros); e.impressions += +m.impressions || 0; e.clicks += +m.clicks || 0;
            map.set(t, e);
        }
        let terms = [...map.values()].map((k) => ({ ...k, ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : 0 })).sort((a, b) => b.spend - a.spend).slice(0, 50);
        const term = (opts?.search || "").trim().toLowerCase();
        if (term) terms = terms.filter((k) => k.term.toLowerCase().includes(term));
        return { terms };
    } catch (e: any) { console.error("fetchGoogleKeywords failed:", e); return { terms: [], error: e.message }; }
}
