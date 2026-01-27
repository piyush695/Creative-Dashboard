const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME } = require('./db_config');
const dbName = DB_NAME;
const collectionName = "creative_data";

async function connectToDatabase() {
    const client = new MongoClient(MONGO_URI);

    try {
        console.log("Connecting to MongoDB...");
        await client.connect();
        console.log("Connected successfully!");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Fetch all documents to verify
        const count = await collection.countDocuments();
        console.log(`Found ${count} documents in ${dbName}.${collectionName}`);

        const ads = await collection.find({}).toArray();
        console.log("Available Ad IDs in Database:");
        ads.forEach(ad => {
            console.log(`- ${ad.adId}: ${ad.adName}`);
        });

        return ads;
    } catch (error) {
        console.error("Database connection error:", error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the connection test
if (require.main === module) {
    connectToDatabase()
        .then(() => console.log("Connection test complete."))
        .catch(err => console.error("Test failed:", err));
}

module.exports = { connectToDatabase };
