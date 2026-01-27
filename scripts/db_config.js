const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

// Central database configuration
// It now looks for environment variables exclusively.
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
}

async function getDb() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    return { client, db: client.db(DB_NAME || "reddit_data") };
}

module.exports = { MONGO_URI, DB_NAME, getDb };
