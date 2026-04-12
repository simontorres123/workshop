import { NextResponse } from 'next/server';
import { cosmosClient } from '@/lib/cosmos/client';
import { COSMOS_CONFIG } from '@/lib/cosmos/config';

// GET /api/test-connection - Probar conexión con tu container "workshop"
export async function GET() {
  try {
    // Testing connection with Cosmos DB
    
    // Force reinitializing connection
    await cosmosClient.reinitialize();
    
    // Esperar un poco para que se complete la inicialización
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Probar conexión básica
    const connectionTest = await cosmosClient.testConnection();
    const connectionInfo = cosmosClient.getConnectionInfo();
    const isReady = cosmosClient.isReady();

    return NextResponse.json({
      success: true,
      message: 'Connection test completed',
      data: {
        database: {
          name: COSMOS_CONFIG.DATABASE_NAME,
          endpoint: COSMOS_CONFIG.ENDPOINT ? COSMOS_CONFIG.ENDPOINT.split('/')[2] : 'Not configured',
          ready: isReady,
          connectionString: !!COSMOS_CONFIG.CONNECTION_STRING
        },
        containers: {
          initialized: connectionInfo.containersCount,
          list: connectionInfo.containers || [],
          autoCreateEnabled: Object.values(COSMOS_CONFIG.CONTAINERS)
            .filter(c => c.autoCreate).length
        },
        connectionTest: {
          success: connectionTest.success,
          error: connectionTest.error
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasEndpoint: !!process.env.COSMOSDB_ENDPOINT,
          hasKey: !!process.env.COSMOSDB_KEY,
          hasDatabaseId: !!process.env.COSMOSDB_DATABASE_ID
        }
      }
    });

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
      data: {
        database: {
          name: COSMOS_CONFIG.DATABASE_NAME,
          ready: false
        },
        configuration: {
          endpoint: COSMOS_CONFIG.ENDPOINT ? 'Configured' : 'Missing',
          key: COSMOS_CONFIG.KEY ? 'Configured' : 'Missing',
          connectionString: COSMOS_CONFIG.CONNECTION_STRING ? 'Configured' : 'Missing'
        },
        troubleshooting: [
          'Check your .env file contains COSMOSDB_ENDPOINT, COSMOSDB_KEY, and COSMOSDB_DATABASE_ID',
          'Verify your Azure Cosmos DB account is running',
          'Confirm the endpoint URL is correct',
          'Make sure the access key is valid',
          'Check if the database "workshop" exists in your Cosmos account'
        ]
      }
    }, { status: 500 });
  }
}