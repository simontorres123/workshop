import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const BUCKET = 'organization-assets';
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, logo_url')
    .eq('id', context.organizationId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, data: { id: data.id, name: data.name, logoUrl: data.logo_url } });
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context || !['org_admin', 'super_admin'].includes(context.role || '')) {
    return NextResponse.json({ error: 'Solo un administrador puede cambiar el logo' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo');
    const removeLogo = formData.get('removeLogo') === 'true';

    if (removeLogo) {
      await supabaseAdmin.storage.from(BUCKET).remove([`${context.organizationId}/logo.webp`]);
      const { error } = await supabaseAdmin.from('organizations').update({ logo_url: null }).eq('id', context.organizationId);
      if (error) throw error;
      return NextResponse.json({ success: true, logoUrl: null });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Selecciona una imagen válida' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'El logo debe ser PNG, JPG o WebP' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El logo no puede superar 2 MB' }, { status: 400 });
    }

    const path = `${context.organizationId}/logo.webp`;
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    });
    if (upload.error) throw upload.error;

    const { data: publicUrl } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const { error } = await supabaseAdmin.from('organizations').update({ logo_url: publicUrl.publicUrl }).eq('id', context.organizationId);
    if (error) throw error;
    return NextResponse.json({ success: true, logoUrl: publicUrl.publicUrl });
  } catch (error) {
    console.error('Error actualizando branding:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el logo' }, { status: 500 });
  }
}
