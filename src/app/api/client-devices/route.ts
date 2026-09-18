import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '@/lib/auth/tenant-context';

export async function GET(request: NextRequest) {
  const ctx = await getTenantContext(request);
  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!ctx || !clientId) return NextResponse.json({ success: false, error: 'Cliente no especificado' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: await RepositoryFactory.getDevices().listClientDevices(clientId, ctx.organizationId) });
  } catch (error) {
    console.error('Error fetching client devices:', error);
    return NextResponse.json({ success: false, error: 'Error obteniendo aparatos del cliente' }, { status: 500 });
  }
}
