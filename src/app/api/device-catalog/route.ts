import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '@/lib/auth/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'No autenticado o sin organización asignada' }, { status: 401 });
    return NextResponse.json({ success: true, data: await RepositoryFactory.getDevices().listCatalog(ctx.organizationId) });
  } catch (error) {
    console.error('Error fetching device catalog:', error);
    return NextResponse.json({ success: false, error: 'Error obteniendo catálogo de dispositivos' }, { status: 500 });
  }
}
