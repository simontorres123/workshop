import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.COSMOSDB_URI as string;
const MONGODB_DB = process.env.COSMOSDB_DB_NAME as string;

if (!MONGODB_URI) {
  throw new Error('Please define the COSMOSDB_URI environment variable');
}

if (!MONGODB_DB) {
  throw new Error('Please define the COSMOSDB_DB_NAME environment variable');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(MONGODB_URI);

  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return db;
}
