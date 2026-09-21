import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { RepositoryFactory } from '@/repositories/repository.factory';

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  if (context.role !== 'technician') return NextResponse.json({ success: false, error: 'Esta vista está disponible para técnicos' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const result = await RepositoryFactory.getRepairOrders(context).searchWithPagination({
    assignedTechnicianId: context.userId,
    search: params.get('search') || undefined,
    status: params.get('status') || undefined,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  return NextResponse.json({ success: true, data: result.orders, total: result.total }, { headers: { 'Cache-Control': 'private, no-store' } });
}
