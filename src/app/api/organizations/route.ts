import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { supabaseAdmin } from '@/lib/supabase/client';
import { emailService } from '@/services/email.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const orgRepo = RepositoryFactory.getOrganizations();
    const organizations = await orgRepo.findAll();

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error('Error en GET /api/organizations:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar permisos de Super Admin
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !adminUser) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, organizerEmail, organizerName } = body;
    
    if (!name || !slug || !organizerEmail || !organizerName) {
      return NextResponse.json({ success: false, error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // 2. Obtener o crear el usuario Organizador
    let newUserId: string;
    
    // Primero verificar si el usuario ya existe para evitar error 'email_exists'
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userFound = existingUser.users.find(u => u.email === organizerEmail);

    if (userFound) {
      newUserId = userFound.id;
      console.log('Usuario existente encontrado, vinculando a nueva organización:', newUserId);
    } else {
      // Crear nuevo usuario si no existe
      const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: organizerEmail,
        email_confirm: true,
        user_metadata: { full_name: organizerName }
      });

      if (createUserError) {
        console.error('Error creando usuario organizador:', createUserError);
        return NextResponse.json({ success: false, error: `Error creando usuario: ${createUserError.message}` }, { status: 500 });
      }
      newUserId = userData.user.id;
    }

    // 3. Inicializar la organización usando la función RPC
    console.log('Calling initialize_new_organization for user:', newUserId, 'with slug:', slug);
    
    const { error: rpcError } = await supabaseAdmin.rpc('initialize_new_organization', {
      p_user_id: newUserId,
      p_org_name: name,
      p_org_slug: slug.toLowerCase(),
      p_full_name: organizerName,
    });

    if (rpcError) {
      console.error('Error inicializando organización vía RPC:', rpcError);
      
      // Si el error es que la organización ya existe (por slug), intentamos recuperar el ID
      // para al menos vincular al usuario si es una re-ejecución
      if (rpcError.message.includes('unique constraint') || rpcError.code === '23505') {
        console.log('La organización ya existe, el proceso continuará con la verificación de vínculo.');
      } else {
        if (!userFound) await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ success: false, error: `Error inicializando taller: ${rpcError.message}` }, { status: 500 });
      }
    }

    // 3.5 VERIFICACIÓN EXPLÍCITA Y VÍNCULO MANUAL (Fallback)
    // Nos aseguramos de que el perfil tenga el organization_id, ya sea por el RPC o manualmente
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (orgData) {
      const { data: branchData } = await supabaseAdmin
        .from('branches')
        .select('id')
        .eq('organization_id', orgData.id)
        .eq('is_main_branch', true)
        .single();

      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: newUserId,
          organization_id: orgData.id,
          branch_id: branchData?.id,
          role: 'org_admin',
          full_name: organizerName
        });
      
      console.log('Perfil verificado/vinculado correctamente a la organización:', orgData.id);
    } else {
      return NextResponse.json({ success: false, error: 'La organización no se pudo crear o encontrar' }, { status: 500 });
    }

    // 4. Generar Link de Acceso (Magic Link)
    // El tipo 'magiclink' es el más robusto para usuarios que ya existen en Auth
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: organizerEmail,
      options: {
        redirectTo: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin}/dashboard`
      }
    });

    if (linkError) {
      console.warn('No se pudo generar el link:', linkError);
    } else {
      // 5. Enviar correo vía Resend
      await emailService.sendOrganizerInvitation({
        email: organizerEmail,
        fullName: organizerName,
        orgName: name,
        invitationLink: linkData.properties.action_link
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: userFound 
        ? 'Taller creado y vinculado a usuario existente. Se envió acceso por correo.' 
        : 'Taller creado e invitación enviada exitosamente.',
      data: { userId: newUserId, organization: name } 
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/organizations:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
