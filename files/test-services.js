const { fetchCampaigns } = require('./lib/realtime-services/googleAdsService');
const { connectDB } = require('./lib/realtime-services/mongoService');

// Mock environment variables if they are missing for the test
process.env.GOOGLE_ADS_CLIENT_CUSTOMER_ID = process.env.GOOGLE_ADS_CLIENT_CUSTOMER_ID || '1234567890';
process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '1234567890';

async function test() {
    try {
        console.log('Testing mongo connection...');
        await connectDB();
        console.log('Mongo ok');

        console.log('Testing google ads service (fetchCampaigns)...');
        // This might fail due to auth, but we want to see if it throws a SYNTAX/ENVIRONMENT error before the fetch
        try {
            await fetchCampaigns('LAST_7_DAYS');
            console.log('fetchCampaigns called ok (might have returned [] or failed due to auth)');
        } catch (err) {
            console.log('fetchCampaigns failed as expected (probably auth):', err.message);
        }

        console.log('Test complete');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

test();
