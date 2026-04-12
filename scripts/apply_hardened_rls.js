const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DIRECT_URL;

async function applyHardenedRLS() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos.');

    const sql = fs.readFileSync('supabase/migrations/20260410080000_hardened_rls_multi_tenant.sql', 'utf8');
    
    console.log('⏳ Aplicando refuerzo de seguridad RLS...');
    await client.query(sql);
    console.log('✨ Blindaje RLS aplicado con éxito. El aislamiento por sucursal está activo.');

  } catch (err) {
    console.error('❌ Error al aplicar RLS:', err.message);
  } finally {
    await client.end();
  }
}

applyHardenedRLS();
