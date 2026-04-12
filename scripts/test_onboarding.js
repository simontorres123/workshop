const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOnboarding() {
  const testEmail = `admin_test_${Date.now()}@example.com`;
  const testPass = 'Password123!';
  const orgName = 'Taller Automotriz Alfa';
  const fullName = 'Test Admin User';

  console.log(`\n🚀 Iniciando prueba de registro para: ${testEmail}`);

  try {
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPass,
      email_confirm: true
    });

    if (authError) throw authError;
    const userId = authData.user.id;
    console.log(`✅ Usuario creado en Auth: ${userId}`);

    // 2. Ejecutar RPC de inicialización
    const slug = 'taller-automotriz-alfa-' + Date.now();
    const { error: rpcError } = await supabase.rpc('initialize_new_organization', {
      p_user_id: userId,
      p_org_name: orgName,
      p_org_slug: slug,
      p_full_name: fullName
    });

    if (rpcError) throw rpcError;
    console.log(`✅ RPC 'initialize_new_organization' ejecutado con éxito.`);

    // 3. Verificar creación de registros
    // Perfil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, organizations(*), branches(*)')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    console.log('\n--- Resultados de la Verificación ---');
    console.log(`ID Organización: ${profile.organization_id}`);
    console.log(`Nombre Org: ${profile.organizations.name}`);
    console.log(`ID Sucursal: ${profile.branch_id}`);
    console.log(`Nombre Sucursal: ${profile.branches.name}`);
    console.log(`Rol Asignado: ${profile.role}`);

    if (profile.role === 'org_admin' && profile.organization_id && profile.branch_id) {
      console.log('\n✨ ¡PRUEBA EXITOSA! El flujo de onboarding funciona correctamente.');
    } else {
      console.error('\n❌ Error: Algunos campos no se inicializaron correctamente.');
    }

    // Limpieza opcional (descomentar si quieres borrar los datos de prueba)
    /*
    await supabase.from('organizations').delete().eq('id', profile.organization_id);
    await supabase.auth.admin.deleteUser(userId);
    console.log('🧹 Datos de prueba eliminados.');
    */

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:', error.message);
  }
}

testOnboarding();
