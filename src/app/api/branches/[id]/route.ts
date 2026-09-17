import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

async function getAuthProfile(request: NextRequest): Promise<{ organization_id: string; role: string } | null> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) return null;
  return { organization_id: profile.organization_id, role: profile.role };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getAuthProfile(request);
    if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (profile.role !== 'org_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, address, phone, is_active } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es requerido' }, { status: 400 });
    }

    // Verificar que la sucursal pertenece a la organización del usuario
    const { data: existing } = await supabaseAdmin
      .from('branches')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('branches')
      .update({
        name,
        address: address || null,
        phone: phone || null,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error en PUT /api/branches/[id]:', error);
    return NextResponse.json({ success: false, error: 'Error actualizando sucursal' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getAuthProfile(request);
    if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (profile.role !== 'org_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar que la sucursal pertenece a la org y no es la matriz
    const { data: existing } = await supabaseAdmin
      .from('branches')
      .select('id, organization_id, is_main_branch')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Sucursal no encontrada' }, { status: 404 });
    }

    if (existing.is_main_branch) {
      return NextResponse.json({ success: false, error: 'No se puede eliminar la sucursal matriz' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/branches/[id]:', error);
    return NextResponse.json({ success: false, error: 'Error eliminando sucursal' }, { status: 500 });
  }
}
