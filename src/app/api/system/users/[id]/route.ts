import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Usamos Service Role para poder modificar o eliminar perfiles y usuarios de auth saltando RLS
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { branch_id, branchIds, ...profileUpdates } = body;

    // Actualizar el perfil
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update Profile Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Actualizar las sucursales asignadas si se proporcionaron
    let branchesToAssign: string[] | null = null;
    if (branchIds && Array.isArray(branchIds)) {
      branchesToAssign = branchIds;
    } else if (branch_id !== undefined) {
      branchesToAssign = branch_id ? [branch_id] : [];
    }

    if (branchesToAssign !== null) {
      // 1. Delete existing branches
      await supabaseAdmin.from('user_branches').delete().eq('user_id', id);

      // 2. Insert new branches
      if (branchesToAssign.length > 0) {
        const branchInserts = branchesToAssign.map(bId => ({
          user_id: id,
          branch_id: bId
        }));
        await supabaseAdmin.from('user_branches').insert(branchInserts);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update User API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Borrar el usuario en Auth (esto automáticamente borra el perfil si hay cascade, pero lo hacemos explícito por si acaso)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Delete Auth User Error:', authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    // 2. Borrar el perfil en public.user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Delete Profile Error:', profileError);
      // No devolvemos error si el auth se borró, porque ya no podrá entrar
    }

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Delete User API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
