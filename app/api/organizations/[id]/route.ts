import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { supabaseAdmin } from '@/lib/supabase/client';

async function verifySuperAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'super_admin' ? user : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params for Next.js 15+
    const isAdmin = await verifySuperAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const orgRepo = RepositoryFactory.getOrganizations();
    const updatedOrg = await orgRepo.update(id, body);

    if (!updatedOrg) {
      return NextResponse.json({ success: false, error: 'No se pudo actualizar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedOrg });
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[id]:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params for Next.js 15+
    const isAdmin = await verifySuperAdmin(request);
    if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const orgRepo = RepositoryFactory.getOrganizations();
    const success = await orgRepo.toggleActive(id, false);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[id]:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
