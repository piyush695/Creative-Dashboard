const BASE_URL = process.env.ADROLL_API_BASE || 'https://api.adroll.com';
const ACCESS_TOKEN = process.env.ADROLL_ACCESS_TOKEN;
const ADVERTISABLE_EID = process.env.ADROLL_ADVERTISABLE_EID;

// ─── Core Fetch ───────────────────────────────────────────────
async function adrollFetch(endpoint) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Token ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`AdRoll API error (${response.status}): ${err}`);
    }

    return response.json();
}

// ─── Campaigns ────────────────────────────────────────────────
export async function fetchCampaigns() {
    const data = await adrollFetch(`/api/v1/advertisable/get_campaigns?advertisable=${ADVERTISABLE_EID}`);
    return data.results || [];
}

// ─── Single Campaign Detail ───────────────────────────────────
export async function fetchCampaignDetail(campaignEid) {
    const data = await adrollFetch(`/api/v1/campaign/get?campaign=${campaignEid}`);
    if (!data.results) return null;
    return Array.isArray(data.results) ? data.results[0] : data.results;
}

// ─── All Ads for Advertisable (cached 5 min) ──────────────────
let _adsCache = null;
let _adsCacheTime = 0;
const ADS_CACHE_TTL = 5 * 60 * 1000;

export async function fetchAllAds() {
    const now = Date.now();
    if (_adsCache && (now - _adsCacheTime) < ADS_CACHE_TTL) {
        return _adsCache;
    }
    const data = await adrollFetch(`/api/v1/advertisable/get_ads?advertisable=${ADVERTISABLE_EID}`);
    _adsCache = data.results || [];
    _adsCacheTime = now;
    return _adsCache;
}

// ─── Ads for a Campaign (via adgroup matching) ────────────────
// Link: Campaign.adgroups[] → Ad.adgroups[].id
export async function fetchAdsForCampaign(campaignEid) {
    const campaign = await fetchCampaignDetail(campaignEid);
    if (!campaign || !campaign.adgroups || campaign.adgroups.length === 0) {
        return [];
    }
    const campaignAdgroupIds = new Set(campaign.adgroups.map(ag => ag.eid || ag));

    const allAds = await fetchAllAds();
    const matchedAds = allAds.filter(ad => {
        if (!ad.adgroups || !Array.isArray(ad.adgroups)) return false;
        return ad.adgroups.some(ag => campaignAdgroupIds.has(ag.eid || ag.id || ag));
    });

    return matchedAds;
}

// ─── Single Ad Detail ─────────────────────────────────────────
export async function fetchAdDetail(adEid) {
    const data = await adrollFetch(`/api/v1/ad/get?ad=${adEid}`);
    if (!data.results) return null;
    return Array.isArray(data.results) ? data.results[0] : data.results;
}

// ─── Ad Performance Metrics ───────────────────────────────────
export async function fetchAdMetrics(startDate, endDate) {
    const data = await adrollFetch(
        `/api/v1/report/ad?advertisable=${ADVERTISABLE_EID}&start_date=${startDate}&end_date=${endDate}`
    );
    return data.results || [];
}

// ─── Campaign Performance Metrics ─────────────────────────────
export async function fetchCampaignMetrics(startDate, endDate) {
    const data = await adrollFetch(
        `/api/v1/report/campaign?advertisable=${ADVERTISABLE_EID}&start_date=${startDate}&end_date=${endDate}`
    );
    return data.results || [];
}

// ─── Helpers ──────────────────────────────────────────────────
function formatDateRange(dateRange) {
    const now = new Date();
    let start = new Date();

    switch (dateRange) {
        case 'LAST_7_DAYS':
            start.setDate(now.getDate() - 7);
            break;
        case 'LAST_14_DAYS':
            start.setDate(now.getDate() - 14);
            break;
        case 'LAST_30_DAYS':
        default:
            start.setDate(now.getDate() - 30);
            break;
        case 'THIS_MONTH':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'LAST_MONTH':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            };
    }

    return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
    };
}

// ─── Campaigns with Metrics ───────────────────────────────────
export async function fetchCampaignsWithMetrics(dateRangeStr) {
    const { startDate, endDate } = formatDateRange(dateRangeStr);
    const [campaigns, metrics] = await Promise.all([
        fetchCampaigns(),
        fetchCampaignMetrics(startDate, endDate)
    ]);

    const metricsMap = {};
    metrics.forEach(m => {
        const key = m.eid || m.campaign || m.campaign_eid;
        if (!key) return;
        if (!metricsMap[key]) {
            metricsMap[key] = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
        }
        metricsMap[key].impressions += (m.impressions || 0);
        metricsMap[key].clicks += (m.clicks || 0);
        metricsMap[key].cost += (m.cost || 0);
        metricsMap[key].conversions += (m.total_conversions || 0);
        metricsMap[key].revenue += (m.attributed_rev || 0);
    });

    return campaigns.map(c => {
        const m = metricsMap[c.eid] || {};
        const impressions = m.impressions || 0;
        const clicks = m.clicks || 0;
        const cost = m.cost || 0;
        return {
            id: c.eid,
            adName: c.name,
            status: c.status,
            isActive: c.is_active,
            platform: 'adroll',
            impressions,
            clicks,
            spend: cost.toFixed(2),
            ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
            cpc: clicks > 0 ? (cost / clicks).toFixed(2) : '0.00',
            roas: cost > 0 ? ((m.revenue || 0) / cost).toFixed(2) : '0.00',
            campaignName: c.name, // In campaigns view, campaign name is the name
            adType: c.campaign_type || 'AdRoll Campaign'
        };
    });
}

// ─── Ads with Metrics ─────────────────────────────────────────
export async function fetchAdsWithMetrics(dateRangeStr, campaignEid = null) {
    const { startDate, endDate } = formatDateRange(dateRangeStr);
    const [ads, adMetrics] = await Promise.all([
        campaignEid ? fetchAdsForCampaign(campaignEid) : fetchAllAds(),
        fetchAdMetrics(startDate, endDate)
    ]);

    const metricsMap = {};
    adMetrics.forEach(m => {
        const key = m.eid;
        if (!key) return;
        if (!metricsMap[key]) {
            metricsMap[key] = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
        }
        metricsMap[key].impressions += (m.impressions || 0);
        metricsMap[key].clicks += (m.clicks || 0);
        metricsMap[key].cost += (m.cost || 0);
        metricsMap[key].conversions += (m.total_conversions || 0);
        metricsMap[key].revenue += (m.attributed_rev || 0);
    });

    return ads.map(ad => {
        const m = metricsMap[ad.eid] || {};
        const impressions = m.impressions || 0;
        const clicks = m.clicks || 0;
        const cost = m.cost || 0;
        return {
            id: ad.eid,
            adName: ad.name,
            status: ad.status,
            isActive: ad.is_active,
            platform: 'adroll',
            impressions,
            clicks,
            spend: cost.toFixed(2),
            ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
            cpc: clicks > 0 ? (cost / clicks).toFixed(2) : '0.00',
            roas: cost > 0 ? ((m.revenue || 0) / cost).toFixed(2) : '0.00',
            thumbnailUrl: ad.src,
            adType: ad.type || 'AdRoll Ad',
            campaignName: ad.campaign_name || 'AdRoll Campaign' // Note: ad object from get_ads doesn't always have campaign_name
        };
    });
}
