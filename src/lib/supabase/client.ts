import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isServer = typeof window === 'undefined';

// Usar la Service Role Key solo en el servidor para operaciones administrativas (repositorios)
// En el cliente, seguimos usando la Anon Key para seguridad
const keyToUse = isServer && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;

if (!supabaseUrl || !keyToUse) {
  console.warn('Supabase credentials missing in environment variables');
}

// Crear cliente estándar para uso general (respeta RLS si usa Anon Key)
export const supabase = createClient<Database>(supabaseUrl, keyToUse);

// Cliente administrativo con Service Role Key (solo servidor)
// NUNCA usar esto en el lado del cliente
export const supabaseAdmin = isServer && supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback al cliente estándar si no estamos en servidor
