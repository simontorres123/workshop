import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Cliente de Supabase con Service Role para operaciones administrativas
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, organizationId, branchId } = body;

    if (!email || !password || !fullName || !role || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // 1. Crear el usuario en Supabase Auth (sin confirmación de email para flujo rápido)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Crear el perfil del usuario vinculado a la organización y sucursal
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        organization_id: organizationId,
        branch_id: branchId || null,
        role: role,
        full_name: fullName
      });

    if (profileError) {
      console.error('Profile Error:', profileError);
      // Limpieza: si falla el perfil, intentamos borrar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario creado exitosamente',
      data: { userId } 
    });

  } catch (error: any) {
    console.error('Invite API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
