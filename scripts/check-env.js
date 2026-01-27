// Quick environment check script
// Run this with: node scripts/check-env.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const requiredVars = [
    'MONGODB_URI',
    'MONGODB_DB',
    'AUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
];

console.log('🔍 Checking environment variables...\n');

let allPresent = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== 'your-generated-secret-here' && value !== 'your-google-client-id.apps.googleusercontent.com' && value !== 'your-client-secret') {
        console.log(`✅ ${varName}: Set`);
    } else {
        console.log(`❌ ${varName}: Missing or using placeholder`);
        allPresent = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allPresent) {
    console.log('✅ All environment variables are configured!');
} else {
    console.log('⚠️  Some environment variables are missing.');
    console.log('\nTo fix:');
    console.log('1. Copy env_template.txt to .env.local');
    console.log('2. Generate AUTH_SECRET: npx auth secret');
    console.log('3. Set up Google OAuth credentials (see AUTH_SETUP.md)');
}

console.log('='.repeat(50) + '\n');
