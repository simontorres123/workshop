import { CosmosClient, Database, Container } from '@azure/cosmos';

const endpoint = process.env.COSMOSDB_ENDPOINT as string;
const key = process.env.COSMOSDB_KEY as string;
const databaseId = process.env.COSMOSDB_DATABASE_ID as string;

if (!endpoint || !key || !databaseId) {
  throw new Error('Please define the Cosmos DB connection details in your environment variables');
}

let client: CosmosClient | null = null;
let database: Database | null = null;

function getClient(): CosmosClient {
  if (!client) {
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

export async function getContainer(containerId: string): Promise<Container> {
  const cosmosClient = getClient();
  if (!database) {
    const { database: db } = await cosmosClient.databases.createIfNotExists({ id: databaseId });
    database = db;
  }
  const { container } = await database.containers.createIfNotExists({ id: containerId });
  return container;
}
