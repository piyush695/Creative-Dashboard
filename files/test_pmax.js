const { fetchAds } = require('./lib/realtime-services/googleAdsService');
require('dotenv').config();

async function test() {
    try {
        console.log("Fetching ads...");
        const ads = await fetchAds('LAST_30_DAYS');
        console.log(`Total ads: ${ads.length}`);
        const pmax = ads.filter(a => a.adType === 'PERFORMANCE_MAX');
        console.log(`PMAX ads: ${pmax.length}`);
        if (pmax.length > 0) {
            const first = pmax[0];
            console.log("First PMAX Ad Sample:");
            console.log(`  Name: ${first.adName}`);
            console.log(`  Thumbnail: ${first.thumbnailUrl}`);
            console.log(`  Image URLs Count: ${first.imageUrls.length}`);
            console.log(`  Individual Assets: ${first.individualAssets.length}`);
        }
    } catch (err) {
        console.error(err);
    }
}

test();
