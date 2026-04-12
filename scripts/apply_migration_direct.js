const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Extraer credenciales de la URL de conexión (DATABASE_URL o DIRECT_URL)
const connectionString = process.env.DIRECT_URL;

async function applyMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos remota.');

    const sql = fs.readFileSync('supabase/migrations/20260410071500_register_new_organization_rpc.sql', 'utf8');
    
    console.log('⏳ Aplicando migración SQL...');
    await client.query(sql);
    console.log('✨ Migración aplicada con éxito. La función RPC ya está disponible.');

  } catch (err) {
    console.error('❌ Error al aplicar la migración:', err.message);
  } finally {
    await client.end();
  }
}

applyMigration();
