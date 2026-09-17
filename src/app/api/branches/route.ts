import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 403 });
    }

    const { data: branches, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('is_main_branch', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error en GET /api/branches:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 403 });
    }

    if (profile.role !== 'org_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, phone } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'El nombre es requerido' }, { status: 400 });
    }

    const { data: newBranch, error } = await supabaseAdmin
      .from('branches')
      .insert({
        organization_id: profile.organization_id,
        name,
        address: address || null,
        phone: phone || null,
        is_main_branch: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: newBranch }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/branches:', error);
    return NextResponse.json({ success: false, error: 'Error creando sucursal' }, { status: 500 });
  }
}
