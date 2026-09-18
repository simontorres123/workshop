import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: user } = await supabase.from('users').select('*').eq('email', 'letrasunipoli@gmail.com').single();
  if (!user) return console.log('User not found');
  
  console.log('User:', user);
  
  const { data: orgs } = await supabase.from('organization_users').select('*').eq('user_id', user.id);
  console.log('Orgs:', orgs);
  
  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].organization_id;
    const { data: branches } = await supabase.from('branches').select('*').eq('organization_id', orgId);
    console.log('Branches:', branches);
  }
}
check();
