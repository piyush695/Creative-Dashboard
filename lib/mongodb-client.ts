import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri && process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    throw new Error('Please add your Mongo URI to environment variables');
}

const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    if (!uri) throw new Error('MONGODB_URI is missing in development');
    if (!(global as any)._mongoClientPromise) {
        client = new MongoClient(uri, options);
        (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise;
} else {
    // In production (including build), only create client if URI exists
    if (uri) {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    } else {
        // Fallback for build phase
        clientPromise = Promise.resolve() as any;
    }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
