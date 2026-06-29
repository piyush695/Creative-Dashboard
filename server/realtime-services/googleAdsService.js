import fs from 'fs';
const API_VERSION = 'v23';
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

// ─── Token Cache ───
let cachedToken = null;
let tokenExpiry = 0;

// ─── Query Cache ───
const queryCache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache for identical queries

// ─── Get Access Token via Refresh Token ───
export async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const body = new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
        grant_type: 'refresh_token'
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to get access token: ${err}`);
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
}

// ─── Make GAQL Query via REST (with pagination support) ───
export async function queryGoogleAds(gaqlQuery) {
    const cacheKey = gaqlQuery.trim();
    if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        if (Date.now() < cached.expiry) return cached.data;
    }

    const accessToken = await getAccessToken();
    const customerId = process.env.GOOGLE_ADS_CLIENT_CUSTOMER_ID.replace(/-/g, '');
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, '');

    const url = `${BASE_URL}/customers/${customerId}/googleAds:search`;

    let allResults = [];
    let pageToken = null;

    // Paginate through all results
    do {
        const bodyObj = { query: gaqlQuery };
        if (pageToken) bodyObj.pageToken = pageToken;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                'login-customer-id': loginCustomerId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyObj)
        });

        if (!res.ok) {
            const errBody = await res.text();
            let errMsg;
            try {
                const parsed = JSON.parse(errBody);
                const details = parsed.error?.details;
                if (details && details.length > 0) {
                    const errs = details[0]?.errors || [];
                    errMsg = errs.map(e => e.message).join('; ') || parsed.error?.message;
                } else {
                    errMsg = parsed.error?.message;
                }
            } catch {
                errMsg = errBody.substring(0, 500);
            }
            console.error('[Analyzer] Google Ads API error:', errMsg);
            throw new Error(`Google Ads API error (${res.status}): ${errMsg}`);
        }

        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0 && allResults.length === 0) {
            console.log(`[Analyzer] First row keys:`, Object.keys(results[0]));
            if (results[0].adGroupAd) console.log(`[Analyzer] First row adGroupAd keys:`, Object.keys(results[0].adGroupAd));
        }
        allResults = allResults.concat(results);
        pageToken = data.nextPageToken || null;

    } while (pageToken);

    queryCache.set(cacheKey, { data: allResults, expiry: Date.now() + CACHE_TTL });
    return allResults;
}

// ─── Parallel Query Helper ───
export async function parallelQueries(queries) {
    const promises = queries.map(q => safeQuery(q.label, q.query));
    return Promise.all(promises);
}

function logDebug(msg) {
    try {
        fs.appendFileSync("api_debug.log", `[${new Date().toISOString()}] [DEBUG_SVC] ${msg}\n`);
    } catch { }
}

// ─── Safe query wrapper (returns [] on error instead of throwing) ───
export async function safeQuery(label, gaqlQuery) {
    try {
        const rows = await queryGoogleAds(gaqlQuery);
        logDebug(`${label}: ${rows.length} rows`);
        return rows;
    } catch (err) {
        logDebug(`${label} failed: ${err.message}`);
        return [];
    }
}

// ─── Build the "cut" identifier for an ad ───
function buildCutId(campaignName, adGroupName, adType, adName) {
    return `${campaignName || 'Unknown Campaign'} > ${adGroupName || 'Unknown Ad Group'} > ${adType || 'UNKNOWN'} > ${adName || 'Unnamed'}`;
}

// ─── Fetch Campaigns ───
export async function fetchCampaigns(dateRange = 'LAST_30_DAYS') {
    const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.advertising_channel_sub_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions_value,
      metrics.interactions,
      metrics.engagement_rate,
      metrics.average_cost
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date DURING ${dateRange}
    ORDER BY metrics.impressions DESC
  `;

    const rows = await queryGoogleAds(query);

    const campMap = {};
    rows.forEach(row => {
        const id = row.campaign.id;
        if (!campMap[id]) {
            campMap[id] = {
                id,
                name: row.campaign.name,
                status: row.campaign.status,
                channelType: row.campaign.advertisingChannelType,
                channelSubType: row.campaign.advertisingChannelSubType || '',
                impressions: 0,
                clicks: 0,
                spendMicros: 0,
                conversions: 0,
                conversionsValue: 0,
                videoViews: 0,
                interactions: 0,
                dayCount: 0,
                vq25Sum: 0, vq50Sum: 0, vq75Sum: 0, vq100Sum: 0,
                engRateSum: 0
            };
        }
        campMap[id].impressions += Number(row.metrics.impressions || 0);
        campMap[id].clicks += Number(row.metrics.clicks || 0);
        campMap[id].spendMicros += Number(row.metrics.costMicros || 0);
        campMap[id].conversions += Number(row.metrics.conversions || 0);
        campMap[id].conversionsValue += Number(row.metrics.allConversionsValue || 0);
        campMap[id].videoViews += Number(row.metrics.videoViews || 0);
        campMap[id].interactions += Number(row.metrics.interactions || 0);
        campMap[id].dayCount++;
        campMap[id].vq25Sum += Number(row.metrics.videoQuartileP25Rate || 0);
        campMap[id].vq50Sum += Number(row.metrics.videoQuartileP50Rate || 0);
        campMap[id].vq75Sum += Number(row.metrics.videoQuartileP75Rate || 0);
        campMap[id].vq100Sum += Number(row.metrics.videoQuartileP100Rate || 0);
        campMap[id].engRateSum += Number(row.metrics.engagementRate || 0);
    });

    const campList = Object.values(campMap).map(c => {
        const spend = c.spendMicros / 1_000_000;
        const days = c.dayCount || 1;
        return {
            id: c.id,
            name: c.name,
            status: c.status,
            channelType: c.channelType,
            channelSubType: c.channelSubType,
            thumbnailUrl: '', // Will populate below
            impressions: c.impressions,
            clicks: c.clicks,
            spend: Math.round(spend * 100) / 100,
            conversions: Math.round(c.conversions * 100) / 100,
            conversionsValue: Math.round(c.conversionsValue * 100) / 100,
            cpm: c.impressions > 0 ? Math.round(spend / c.impressions * 1000 * 100) / 100 : 0,
            ctr: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 10000) / 100 : 0,
            cpc: c.clicks > 0 ? Math.round((spend / c.clicks) * 100) / 100 : 0,
            videoViews: c.videoViews,
            videoViewRate: c.impressions > 0 ? Math.round((c.videoViews / c.impressions) * 10000) / 100 : 0,
            videoQ25: days > 0 ? Math.round(c.vq25Sum / days * 10000) / 100 : 0,
            videoQ50: days > 0 ? Math.round(c.vq50Sum / days * 10000) / 100 : 0,
            videoQ75: days > 0 ? Math.round(c.vq75Sum / days * 10000) / 100 : 0,
            videoQ100: days > 0 ? Math.round(c.vq100Sum / days * 10000) / 100 : 0,
            engagementRate: days > 0 ? Math.round(c.engRateSum / days * 10000) / 100 : 0,
            interactions: c.interactions,
            cvr: c.clicks > 0 ? Math.round((c.conversions / c.clicks) * 10000) / 100 : 0,
            cpa: c.conversions > 0 ? Math.round((spend / c.conversions) * 100) / 100 : 0,
            roas: spend > 0 ? Math.round((c.conversionsValue / spend) * 100) / 100 : 0,
            aov: c.conversions > 0 ? Math.round((c.conversionsValue / c.conversions) * 100) / 100 : 0,
            revenue: Math.round(c.conversionsValue * 100) / 100
        };
    }).sort((a, b) => b.impressions - a.impressions);

    // Fetch thumbnails for campaigns (especially PMAX)
    try {
        const rows = await safeQuery('Campaign Thumbnails', `SELECT campaign.id, asset.image_asset.full_size.url FROM campaign_asset WHERE asset.type = 'IMAGE' LIMIT 10000`);
        rows.forEach(r => {
            const camp = campList.find(c => c.id === r.campaign.id);
            if (camp && !camp.thumbnailUrl) camp.thumbnailUrl = r.asset?.imageAsset?.fullSize?.url;
        });
    } catch { }

    return campList;
}


// ==============================================================
//  STEP 1: BASE QUERY — All ads with generic fields
// ==============================================================
async function fetchBaseAds(dateRange, campaignId, adId = null) {
    let whereClause = `segments.date DURING ${dateRange} AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) {
        whereClause += ` AND ad_group_ad.ad.id = ${adId}`;
    }

    const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      campaign.advertising_channel_sub_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions_value,
      metrics.interactions,
      metrics.engagement_rate
    FROM ad_group_ad
    WHERE ${whereClause}
    ORDER BY metrics.impressions DESC
    LIMIT 10000
  `;

    const rows = await queryGoogleAds(query);
    const adMap = {};
    rows.forEach(row => {
        const ad = row.adGroupAd.ad;
        const adId = ad.id;
        if (!adMap[adId]) {
            adMap[adId] = {
                adId,
                adName: ad.name || `Ad ${adId}`,
                adType: ad.type || 'UNKNOWN',
                status: row.adGroupAd.status,
                adGroupId: row.adGroup.id,
                adGroupName: row.adGroup.name,
                campaignId: row.campaign.id,
                campaignName: row.campaign.name,
                campaignType: row.campaign.advertisingChannelType,
                campaignSubType: row.campaign.advertisingChannelSubType || '',
                finalUrl: (ad.finalUrls || [])[0] || '',
                headlines: [], descriptions: [], imageUrls: [], videoUrls: [], videoIds: [],
                longHeadline: '', businessName: '', callToActions: [],
                spendMicros: 0, impressions: 0, clicks: 0, conversionSum: 0, conversionValueSum: 0, dayCount: 0,
                videoViews: 0, interactions: 0, vq25Sum: 0, vq50Sum: 0, vq75Sum: 0, vq100Sum: 0, engRateSum: 0
            };
        }
        const entry = adMap[adId];
        entry.spendMicros += Number(row.metrics.costMicros || 0);
        entry.impressions += Number(row.metrics.impressions || 0);
        entry.clicks += Number(row.metrics.clicks || 0);
        entry.conversionSum += Number(row.metrics.conversions || 0);
        entry.conversionValueSum += Number(row.metrics.allConversionsValue || 0);
        entry.dayCount++;
        entry.videoViews += Number(row.metrics.videoViews || 0);
        entry.interactions += Number(row.metrics.interactions || 0);
        entry.vq25Sum += Number(row.metrics.videoQuartileP25Rate || 0);
        entry.vq50Sum += Number(row.metrics.videoQuartileP50Rate || 0);
        entry.vq75Sum += Number(row.metrics.videoQuartileP75Rate || 0);
        entry.vq100Sum += Number(row.metrics.videoQuartileP100Rate || 0);
        entry.engRateSum += Number(row.metrics.engagementRate || 0);
    });
    return adMap;
}


// ==============================================================
//  STEP 2: RSA QUERY
// ==============================================================
async function enrichRSA(adMap, dateRange, campaignId, adId = null) {
    let whereClause = `ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) whereClause += ` AND ad_group_ad.ad.id = ${adId}`;
    const rows = await safeQuery('RSA enrichment', `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad WHERE ${whereClause} LIMIT 10000
    `);
    rows.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const rsa = row.adGroupAd.ad.responsiveSearchAd;
            if (rsa?.headlines) {
                rsa.headlines.forEach(h => {
                    if (h.text && !adMap[adId].headlines.includes(h.text)) adMap[adId].headlines.push(h.text);
                });
            }
            if (rsa?.descriptions) {
                rsa.descriptions.forEach(d => {
                    if (d.text && !adMap[adId].descriptions.includes(d.text)) adMap[adId].descriptions.push(d.text);
                });
            }
        }
    });
}


// ==============================================================
//  STEP 3: DISPLAY QUERY
// ==============================================================
async function enrichDisplay(adMap, dateRange, campaignId, adId = null) {
    let whereClause = `ad_group_ad.ad.type = 'RESPONSIVE_DISPLAY_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) whereClause += ` AND ad_group_ad.ad.id = ${adId}`;
    const rows = await safeQuery('Display enrichment', `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_display_ad.headlines, ad_group_ad.ad.responsive_display_ad.descriptions,
           ad_group_ad.ad.responsive_display_ad.long_headline, ad_group_ad.ad.responsive_display_ad.business_name, ad_group_ad.ad.responsive_display_ad.call_to_action_text
    FROM ad_group_ad WHERE ${whereClause} LIMIT 5000`);
    rows.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const da = row.adGroupAd.ad.responsiveDisplayAd;
            if (da?.headlines) {
                da.headlines.forEach(h => {
                    if (h.text && !adMap[adId].headlines.includes(h.text)) adMap[adId].headlines.push(h.text);
                });
            }
            if (da?.descriptions) {
                da.descriptions.forEach(d => {
                    if (d.text && !adMap[adId].descriptions.includes(d.text)) adMap[adId].descriptions.push(d.text);
                });
            }
            if (da?.longHeadline?.text) adMap[adId].longHeadline = da.longHeadline.text;
            if (da?.businessName) adMap[adId].businessName = da.businessName;
            if (da?.callToActionText && !adMap[adId].callToActions.includes(da.callToActionText)) adMap[adId].callToActions.push(da.callToActionText);
        }
    });
}


// ==============================================================
//  STEP 4: DEMAND GEN QUERY
// ==============================================================
async function enrichDemandGen(adMap, dateRange, campaignId, adId = null) {
    // 4a: DemandGen Multi-Asset
    let c1 = `ad_group_ad.ad.type = 'DEMAND_GEN_MULTI_ASSET_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) c1 += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) c1 += ` AND ad_group_ad.ad.id = ${adId}`;
    const r1 = await safeQuery('DemandGen Multi-Asset', `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.demand_gen_multi_asset_ad.headlines,
      ad_group_ad.ad.demand_gen_multi_asset_ad.descriptions,
      ad_group_ad.ad.demand_gen_multi_asset_ad.call_to_action_text
    FROM ad_group_ad
    WHERE ${c1}
    LIMIT 5000`);
    r1.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const dg = row.adGroupAd.ad.demandGenMultiAssetAd;
            if (dg?.headlines) {
                dg.headlines.forEach(h => { if (h.text && !adMap[adId].headlines.includes(h.text)) adMap[adId].headlines.push(h.text); });
            }
            if (dg?.descriptions) {
                dg.descriptions.forEach(d => { if (d.text && !adMap[adId].descriptions.includes(d.text)) adMap[adId].descriptions.push(d.text); });
            }
            if (dg?.longHeadlines) {
                dg.longHeadlines.forEach(lh => { if (lh.text) adMap[adId].longHeadline = lh.text; });
            }
            if (dg?.businessName) adMap[adId].businessName = dg.businessName;
            if (dg?.callToActionText && !adMap[adId].callToActions.includes(dg.callToActionText)) adMap[adId].callToActions.push(dg.callToActionText);
        }
    });

    // 4b: DemandGen Video Responsive
    let c2 = `ad_group_ad.ad.type = 'DEMAND_GEN_VIDEO_RESPONSIVE_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) c2 += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) c2 += ` AND ad_group_ad.ad.id = ${adId}`;
    const dg2Rows = await safeQuery('DemandGen Video Responsive', `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.demand_gen_video_responsive_ad.headlines, ad_group_ad.ad.demand_gen_video_responsive_ad.descriptions, ad_group_ad.ad.demand_gen_video_responsive_ad.call_to_actions, ad_group_ad.ad.demand_gen_video_responsive_ad.business_name
    FROM ad_group_ad WHERE ${c2} LIMIT 5000`);
    dg2Rows.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const dg = row.adGroupAd.ad.demandGenVideoResponsiveAd;
            if (dg?.headlines) {
                dg.headlines.forEach(h => { if (h.text && !adMap[adId].headlines.includes(h.text)) adMap[adId].headlines.push(h.text); });
            }
            if (dg?.descriptions) {
                dg.descriptions.forEach(d => { if (d.text && !adMap[adId].descriptions.includes(d.text)) adMap[adId].descriptions.push(d.text); });
            }
            if (dg?.businessName) adMap[adId].businessName = dg.businessName;
            if (dg?.callToActions) dg.callToActions.forEach(cta => {
                if (cta?.callToActionText && !adMap[adId].callToActions.includes(cta.callToActionText)) adMap[adId].callToActions.push(cta.callToActionText);
            });
        }
    });

    // 4c: DemandGen Carousel
    let c3 = `ad_group_ad.ad.type = 'DEMAND_GEN_CAROUSEL_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) c3 += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) c3 += ` AND ad_group_ad.ad.id = ${adId}`;
    const r3 = await safeQuery('DemandGen Carousel', `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.demand_gen_carousel_ad.headline, ad_group_ad.ad.demand_gen_carousel_ad.description, ad_group_ad.ad.demand_gen_carousel_ad.business_name, ad_group_ad.ad.demand_gen_carousel_ad.call_to_action_text
    FROM ad_group_ad WHERE ${c3} LIMIT 5000`);
    r3.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const dg = row.adGroupAd.ad.demandGenCarouselAd;
            if (dg?.headline?.text && !adMap[adId].headlines.includes(dg.headline.text)) adMap[adId].headlines.push(dg.headline.text);
            if (dg?.description?.text && !adMap[adId].descriptions.includes(dg.description.text)) adMap[adId].descriptions.push(dg.description.text);
            if (dg?.businessName) adMap[adId].businessName = dg.businessName;
            if (dg?.callToActionText && !adMap[adId].callToActions.includes(dg.callToActionText)) adMap[adId].callToActions.push(dg.callToActionText);
        }
    });
}


// ==============================================================
//  STEP 5: VIDEO ADS
// ==============================================================
async function enrichVideoAds(adMap, dateRange, campaignId, adId = null) {
    let whereClause = `ad_group_ad.ad.type = 'VIDEO_AD' AND ad_group_ad.status != 'REMOVED'`;
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) whereClause += ` AND ad_group_ad.ad.id = ${adId}`;
    const rows = await safeQuery('Video Ads', `
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.video_ad.video.asset, ad_group_ad.ad.video_ad.in_stream.action_headline, ad_group_ad.ad.video_ad.in_stream.action_button_label
    FROM ad_group_ad WHERE ${whereClause} LIMIT 5000`);
    rows.forEach(row => {
        const adId = row.adGroupAd.ad.id;
        if (adMap[adId]) {
            const va = row.adGroupAd.ad.videoAd;
            if (va?.video?.asset) adMap[adId].videoAssetResource = va.video.asset;
            if (va?.inStream?.actionHeadline && !adMap[adId].headlines.includes(va.inStream.actionHeadline)) adMap[adId].headlines.push(va.inStream.actionHeadline);
            if (va?.inStream?.actionButtonLabel && !adMap[adId].callToActions.includes(va.inStream.actionButtonLabel)) adMap[adId].callToActions.push(va.inStream.actionButtonLabel);
        }
    });
}


// ==============================================================
//  STEP 6: ASSET VIEW — Fetch ALL linked assets
// ==============================================================
async function enrichFromAssetView(adMap, campaignId, adId = null) {
    let whereClause = `ad_group_ad_asset_view.enabled = TRUE`;
    if (campaignId) whereClause += ` AND campaign.id = ${campaignId}`;
    if (adId && !adId.toString().startsWith('pmax_')) {
        whereClause += ` AND ad_group_ad.ad.id = ${adId}`;
    }
    const rows = await safeQuery('Asset View (all types)', `
    SELECT ad_group_ad_asset_view.ad_group_ad, ad_group_ad_asset_view.field_type, ad_group_ad_asset_view.performance_label,
           asset.id, asset.name, asset.type, asset.text_asset.text, asset.image_asset.full_size.url,
           asset.image_asset.full_size.width_pixels, asset.image_asset.full_size.height_pixels,
           asset.youtube_video_asset.youtube_video_id, asset.youtube_video_asset.youtube_video_title,
           metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions_value
    FROM ad_group_ad_asset_view WHERE ${whereClause} LIMIT 50000`);
    rows.forEach(row => {
        const resourceName = row.adGroupAdAssetView?.adGroupAd || '';
        const match = resourceName.match(/~(\d+)$/);
        const adId = match ? match[1] : null;
        if (!adId || !adMap[adId]) return;

        const entry = adMap[adId];
        const fieldType = row.adGroupAdAssetView?.fieldType || '';
        const perfLabel = row.adGroupAdAssetView?.performanceLabel || 'UNSPECIFIED';
        const asset = row.asset;
        const metrics = row.metrics || {};

        if (!entry.individualAssets) entry.individualAssets = [];
        if (!entry.imageDetails) entry.imageDetails = [];

        const cost = Number(metrics.costMicros || 0);
        const spend = cost / 1_000_000;
        const convVal = Number(metrics.allConversionsValue || 0);

        const assetObj = {
            assetId: asset?.id || '', assetName: asset?.name || '', assetType: asset?.type || '',
            fieldType, performanceLabel: perfLabel, status: 'ENABLED', content: null, imageUrl: null,
            imageWidth: null, imageHeight: null, videoId: null, videoUrl: null, videoTitle: null,
            impressions: Number(metrics.impressions || 0), clicks: Number(metrics.clicks || 0), spend: Math.round(spend * 100) / 100,
            conversions: Math.round(Number(metrics.conversions || 0) * 100) / 100, conversionsValue: Math.round(convVal * 100) / 100,
            ctr: metrics.impressions > 0 ? Math.round((metrics.clicks / metrics.impressions) * 10000) / 100 : 0,
            cpc: metrics.clicks > 0 ? Math.round((spend / metrics.clicks) * 100) / 100 : 0,
            cpm: metrics.impressions > 0 ? Math.round((spend / metrics.impressions * 1000) * 100) / 100 : 0,
            roas: spend > 0 ? Math.round((convVal / spend) * 100) / 100 : 0
        };

        if (asset?.textAsset?.text) {
            assetObj.content = asset.textAsset.text;
            if (fieldType === 'HEADLINE' && !entry.headlines.includes(asset.textAsset.text)) entry.headlines.push(asset.textAsset.text);
            else if (fieldType === 'DESCRIPTION' && !entry.descriptions.includes(asset.textAsset.text)) entry.descriptions.push(asset.textAsset.text);
            else if (fieldType === 'LONG_HEADLINE') entry.longHeadline = asset.textAsset.text;
            else if (fieldType === 'BUSINESS_NAME') entry.businessName = asset.textAsset.text;
            else if (fieldType === 'CALL_TO_ACTION_SELECTION') { if (!entry.callToActions.includes(asset.textAsset.text)) entry.callToActions.push(asset.textAsset.text); }
        }
        if (asset?.imageAsset?.fullSize?.url) {
            const url = asset.imageAsset.fullSize.url;
            assetObj.imageUrl = url;
            assetObj.imageWidth = asset.imageAsset.fullSize.widthPixels;
            assetObj.imageHeight = asset.imageAsset.fullSize.heightPixels;
            if (!entry.imageUrls.includes(url)) entry.imageUrls.push(url);
            entry.imageDetails.push({
                url, width: asset.imageAsset.fullSize.widthPixels, height: asset.imageAsset.fullSize.heightPixels,
                name: asset.name, fieldType
            });
        }
        if (asset?.youtubeVideoAsset?.youtubeVideoId) {
            assetObj.videoId = asset.youtubeVideoAsset.youtubeVideoId;
            assetObj.videoUrl = `https://www.youtube.com/watch?v=${assetObj.videoId}`;
            assetObj.videoTitle = asset.youtubeVideoAsset.youtubeVideoTitle || '';
            if (!entry.videoIds.includes(assetObj.videoId)) { entry.videoIds.push(assetObj.videoId); entry.videoUrls.push(assetObj.videoUrl); }
            if (assetObj.videoTitle) entry.videoTitle = assetObj.videoTitle;
        }
        entry.individualAssets.push(assetObj);
    });
}

// ==============================================================
//  STEP 7: PMAX Asset Groups
// ==============================================================
async function fetchPMAX(dateRange, campaignId, adId = null) {
    let pmaxId = null;
    if (adId && adId.toString().startsWith('pmax_')) {
        pmaxId = adId.toString().replace('pmax_', '');
    }

    let where = `campaign.advertising_channel_type = 'PERFORMANCE_MAX' AND segments.date DURING ${dateRange}`;
    if (campaignId) where += ` AND campaign.id = ${campaignId}`;
    if (pmaxId) where += ` AND asset_group.id = ${pmaxId}`;

    const query = `
    SELECT asset_group.id, asset_group.name, asset_group.status, asset_group.final_urls, campaign.id, campaign.name, campaign.advertising_channel_type,
           metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions_value
    FROM asset_group WHERE ${where} ORDER BY metrics.impressions DESC LIMIT 5000`;

    const rows = await queryGoogleAds(query);
    const pmaxMap = {};
    rows.forEach(row => {
        const id = row.assetGroup.id;
        if (!pmaxMap[id]) {
            pmaxMap[id] = {
                adId: `pmax_${id}`, assetGroupId: id, adName: row.assetGroup.name, adType: 'PERFORMANCE_MAX', status: row.assetGroup.status,
                adGroupId: `pmax_${id}`, adGroupName: row.assetGroup.name, campaignId: row.campaign.id, campaignName: row.campaign.name,
                campaignType: 'PERFORMANCE_MAX', campaignSubType: '', finalUrl: (row.assetGroup.finalUrls || [])[0] || '',
                headlines: [], descriptions: [], imageUrls: [], videoUrls: [], videoIds: [], longHeadline: '', businessName: '', callToActions: [],
                spendMicros: 0, impressions: 0, clicks: 0, conversionSum: 0, conversionValueSum: 0, dayCount: 0
            };
        }
        const entry = pmaxMap[id];
        entry.spendMicros += Number(row.metrics.costMicros || 0);
        entry.impressions += Number(row.metrics.impressions || 0);
        entry.clicks += Number(row.metrics.clicks || 0);
        entry.conversionSum += Number(row.metrics.conversions || 0);
        entry.conversionValueSum += Number(row.metrics.allConversionsValue || 0);
        entry.dayCount++;
    });
    if (Object.keys(pmaxMap).length === 0) return [];

    // Fetch PMAX Assets and Metrics in Parallel
    let assetWhere = `campaign.advertising_channel_type = 'PERFORMANCE_MAX'`;
    if (campaignId) assetWhere += ` AND campaign.id = ${campaignId}`;
    if (pmaxId) assetWhere += ` AND asset_group.id = ${pmaxId}`;

    const [assetRows, r1Rows, r2Rows] = await Promise.all([
        safeQuery('PMAX Assets', `
            SELECT asset_group_asset.asset_group, asset_group_asset.field_type,
                   asset.id, asset.name, asset.type, asset.text_asset.text, asset.image_asset.full_size.url,
                   asset.image_asset.full_size.width_pixels, asset.image_asset.full_size.height_pixels,
                   asset.youtube_video_asset.youtube_video_id, asset.youtube_video_asset.youtube_video_title
            FROM asset_group_asset WHERE ${assetWhere} LIMIT 50000`),
        safeQuery('PMAX Metrics r1', `SELECT asset.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions_value FROM campaign_asset WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX' AND segments.date DURING ${dateRange} LIMIT 50000`),
        safeQuery('PMAX Metrics r2', `SELECT asset.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions_value FROM asset_group_asset WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX' AND segments.date DURING ${dateRange} LIMIT 50000`)
    ]);

    assetRows.forEach(row => {
        const agRes = row.assetGroupAsset?.assetGroup || '';
        const match = agRes.match(/(?:assetGroups|assetGroup)\/(\d+)/) || agRes.match(/~(\d+)$/);
        const agId = match ? match[1] : null;
        if (!agId || !pmaxMap[agId]) return;
        const entry = pmaxMap[agId];
        const asset = row.asset;
        if (!entry.individualAssets) entry.individualAssets = [];
        if (!entry.imageDetails) entry.imageDetails = [];

        const ia = {
            assetId: asset?.id || '', assetName: asset?.name || '', assetType: asset?.type || '',
            fieldType: row.assetGroupAsset?.fieldType || '', performanceLabel: row.assetGroupAsset?.performanceLabel || 'UNSPECIFIED',
            status: 'ENABLED', content: null, imageUrl: null, imageWidth: null, imageHeight: null, videoId: null, videoUrl: null, videoTitle: null,
            impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionsValue: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0
        };
        if (asset?.textAsset?.text) {
            const txt = asset.textAsset.text;
            ia.content = txt;
            if (ia.fieldType === 'HEADLINE' && !entry.headlines.includes(txt)) entry.headlines.push(txt);
            else if (ia.fieldType === 'DESCRIPTION' && !entry.descriptions.includes(txt)) entry.descriptions.push(txt);
            else if (ia.fieldType === 'LONG_HEADLINE') entry.longHeadline = txt;
            else if (ia.fieldType === 'BUSINESS_NAME') entry.businessName = txt;
            else if (ia.fieldType === 'CALL_TO_ACTION_SELECTION') { if (!entry.callToActions.includes(txt)) entry.callToActions.push(txt); }
        }
        if (asset?.imageAsset?.fullSize?.url) {
            const url = asset.imageAsset.fullSize.url;
            ia.imageUrl = url;
            ia.imageWidth = asset.imageAsset.fullSize.widthPixels;
            ia.imageHeight = asset.imageAsset.fullSize.heightPixels;
            if (!entry.imageUrls.includes(url)) entry.imageUrls.push(url);
            entry.imageDetails.push({
                url, width: asset.imageAsset.fullSize.widthPixels, height: asset.imageAsset.fullSize.heightPixels,
                name: asset.name, fieldType: ia.fieldType
            });
        }
        if (asset?.youtubeVideoAsset?.youtubeVideoId) {
            ia.videoId = asset.youtubeVideoAsset.youtubeVideoId;
            ia.videoUrl = `https://www.youtube.com/watch?v=${ia.videoId}`;
            ia.videoTitle = asset.youtubeVideoAsset.youtubeVideoTitle || '';
            if (!entry.videoIds.includes(ia.videoId)) { entry.videoIds.push(ia.videoId); entry.videoUrls.push(ia.videoUrl); }
        }
        entry.individualAssets.push(ia);
    });

    // PMAX Per-Asset Metrics Enrichment
    const metricsMap = {};
    const merge = (id, met, src) => {
        if (!id) return;
        const imp = Number(met.impressions || 0), clk = Number(met.clicks || 0), cost = Number(met.costMicros || 0);
        if (imp === 0 && clk === 0 && cost === 0) return;
        if (!metricsMap[id]) metricsMap[id] = { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, convVal: 0 };
        const score = (cost > 0 ? 1000000 : 0) + imp;
        const oldScore = (metricsMap[id].costMicros > 0 ? 1000000 : 0) + metricsMap[id].impressions;
        if (score > oldScore) {
            metricsMap[id] = { impressions: imp, clicks: clk, costMicros: cost, conversions: Number(met.conversions || 0), convVal: Number(met.allConversionsValue || 0) };
        }
    };

    r1Rows.forEach(r => merge(r.asset?.id, r.metrics || {}, 'campaign_asset'));
    r2Rows.forEach(r => merge(r.asset?.id, r.metrics || {}, 'asset_group_asset'));

    Object.values(pmaxMap).forEach(entry => {
        (entry.individualAssets || []).forEach(ia => {
            const m = metricsMap[ia.assetId];
            if (m) {
                const sp = m.costMicros / 1_000_000;
                ia.impressions = m.impressions; ia.clicks = m.clicks; ia.spend = Math.round(sp * 100) / 100;
                ia.conversions = Math.round(m.conversions * 100) / 100; ia.conversionsValue = Math.round(m.convVal * 100) / 100;
                ia.ctr = m.impressions > 0 ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0;
                ia.cpc = m.clicks > 0 ? Math.round((sp / m.clicks) * 100) / 100 : 0;
                ia.cpm = m.impressions > 0 ? Math.round((sp / m.impressions * 1000) * 100) / 100 : 0;
                ia.roas = sp > 0 ? Math.round((m.convVal / sp) * 100) / 100 : 0;
            }
        });
    });
    return Object.values(pmaxMap);
}

// ==============================================================
//  MAIN: fetchAds
// ==============================================================
export async function fetchAds(dateRange = 'LAST_30_DAYS', campaignId = null, adId = null) {
    const isPmaxId = adId && adId.toString().startsWith('pmax_');

    // 1. Fetch data in parallel where possible
    const pmaxPromise = (adId && !isPmaxId) ? Promise.resolve([]) : fetchPMAX(dateRange, campaignId, adId);

    let adMap = {};
    if (!isPmaxId) {
        adMap = await fetchBaseAds(dateRange, campaignId, adId);
    }

    // 2. Parallelize enrichment for whatever standard ads we found
    const enrichmentPromises = [];
    if (Object.keys(adMap).length > 0) {
        enrichmentPromises.push(
            enrichRSA(adMap, dateRange, campaignId, adId),
            enrichDisplay(adMap, dateRange, campaignId, adId),
            enrichDemandGen(adMap, dateRange, campaignId, adId),
            enrichVideoAds(adMap, dateRange, campaignId, adId),
            enrichFromAssetView(adMap, campaignId, adId)
        );
    }

    const [pmaxEntries] = await Promise.all([
        pmaxPromise,
        Promise.allSettled(enrichmentPromises)
    ]);

    logDebug(`fetchAds: baseAds=${Object.keys(adMap).length}, pmax=${pmaxEntries.length}`);
    if (pmaxEntries.length > 0) {
        logDebug(`First PMAX ad images: ${pmaxEntries[0].imageUrls.length}`);
    }
    const ads = [...Object.values(adMap), ...pmaxEntries].map(entry => {
        const spend = entry.spendMicros / 1_000_000;
        return {
            adId: entry.adId, adName: entry.adName, adType: entry.adType, status: entry.status,
            cut: buildCutId(entry.campaignName, entry.adGroupName, entry.adType, entry.adName),
            campaignId: entry.campaignId, campaignName: entry.campaignName, campaignType: entry.campaignType, campaignSubType: entry.campaignSubType,
            adGroupId: entry.adGroupId, adGroupName: entry.adGroupName,
            headlines: entry.headlines, descriptions: entry.descriptions, longHeadline: entry.longHeadline, businessName: entry.businessName,
            callToActions: entry.callToActions, finalUrl: entry.finalUrl,
            imageUrls: entry.imageUrls || [],
            imageDetails: entry.imageDetails || [],
            videoUrls: entry.videoUrls || [],
            videoIds: entry.videoIds || [],
            thumbnailUrl: entry.imageUrls?.[0] || (entry.videoIds?.[0] ? `https://img.youtube.com/vi/${entry.videoIds[0]}/hqdefault.jpg` : ''),
            individualAssets: entry.individualAssets || [],
            spend: Math.round(spend * 100) / 100, impressions: entry.impressions, clicks: entry.clicks,
            ctr: entry.impressions > 0 ? Math.round((entry.clicks / entry.impressions) * 10000) / 100 : 0,
            cpc: entry.clicks > 0 ? Math.round((spend / entry.clicks) * 100) / 100 : 0,
            cpm: entry.impressions > 0 ? Math.round((spend / entry.impressions * 1000) * 100) / 100 : 0,
            conversions: Math.round(entry.conversionSum * 100) / 100,
            conversionRate: entry.clicks > 0 ? Math.round((entry.conversionSum / entry.clicks) * 10000) / 100 : 0,
            conversionsValue: Math.round(entry.conversionValueSum * 100) / 100,
            roas: spend > 0 ? Math.round((entry.conversionValueSum / spend) * 100) / 100 : 0,
            assetSummary: {
                headlineCount: entry.headlines.length, descriptionCount: entry.descriptions.length,
                imageCount: (entry.imageUrls || []).length, videoCount: (entry.videoIds || []).length, totalAssets: (entry.individualAssets || []).length
            }
        };
    }).sort((a, b) => b.impressions - a.impressions);

    const agMap = {};
    ads.forEach(ad => { if (!agMap[ad.adGroupId]) agMap[ad.adGroupId] = []; agMap[ad.adGroupId].push(ad); });
    ads.forEach(ad => {
        const agAds = agMap[ad.adGroupId];
        ad.adGroupAvg = computeAverages(agAds);
        const sorted = (m) => [...agAds].sort((a, b) => b[m] - a[m]);
        ad.rankCtr = sorted('ctr').findIndex(a => a.adId === ad.adId) + 1;
        ad.rankRoas = sorted('roas').findIndex(a => a.adId === ad.adId) + 1;
        ad.totalAdsInGroup = agAds.length;
    });
    return ads;
}

function computeAverages(ads) {
    const len = ads.length || 1;
    const sum = (m) => ads.reduce((s, a) => s + (a[m] || 0), 0);
    return {
        spend: Math.round((sum('spend') / len) * 100) / 100,
        impressions: Math.round(sum('impressions') / len),
        clicks: Math.round(sum('clicks') / len),
        ctr: Math.round((sum('ctr') / len) * 100) / 100,
        roas: Math.round((sum('roas') / len) * 100) / 100,
        cpm: Math.round((sum('cpm') / len) * 100) / 100
    };
}

export async function fetchAdAssets(adId, dateRange = 'LAST_30_DAYS', campaignId = null) {
    const ads = await fetchAds(dateRange, campaignId, adId);
    const ad = ads.find(a => String(a.adId) === String(adId));
    if (!ad) return null;
    const assets = ad.individualAssets || [];
    return {
        ...ad,
        assets: assets,
        summary: ad.assetSummary,
        groupedAssets: {
            headlines: assets.filter(a => a.fieldType === 'HEADLINE'),
            descriptions: assets.filter(a => a.fieldType === 'DESCRIPTION'),
            longHeadlines: assets.filter(a => a.fieldType === 'LONG_HEADLINE'),
            images: assets.filter(a => a.imageUrl),
            videos: assets.filter(a => a.videoId),
            callToActions: assets.filter(a => a.fieldType === 'CALL_TO_ACTION_SELECTION'),
            businessNames: assets.filter(a => a.fieldType === 'BUSINESS_NAME'),
            other: assets.filter(a =>
                !['HEADLINE', 'DESCRIPTION', 'LONG_HEADLINE', 'CALL_TO_ACTION_SELECTION', 'BUSINESS_NAME'].includes(a.fieldType) &&
                !a.imageUrl && !a.videoId
            )
        }
    };
}


// Exports handled via named exports above
