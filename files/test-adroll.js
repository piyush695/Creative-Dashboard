require('dotenv').config();
const { fetchCampaigns, fetchAllAds } = require('./lib/realtime-services/adrollService');

async function testAdRoll() {
    console.log('--- AdRoll Service Test ---');
    console.log('ADROLL_ADVERTISABLE_EID:', process.env.ADROLL_ADVERTISABLE_EID);

    try {
        console.log('\n1. Fetching Campaigns...');
        const campaigns = await fetchCampaigns();
        console.log(`Success! Found ${campaigns.length} campaigns.`);
        if (campaigns.length > 0) {
            console.log('First Campaign Example:', {
                eid: campaigns[0].eid,
                name: campaigns[0].name,
                status: campaigns[0].status
            });
        }

        console.log('\n2. Fetching All Ads...');
        const ads = await fetchAllAds();
        console.log(`Success! Found ${ads.length} ads.`);
        if (ads.length > 0) {
            console.log('First Ad Example:', {
                eid: ads[0].eid,
                name: ads[0].name,
                type: ads[0].type,
                src: ads[0].src
            });
        }

        console.log('\n--- Test Passed ---');
    } catch (err) {
        console.error('\n--- Test Failed ---');
        console.error('Error:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

testAdRoll();
