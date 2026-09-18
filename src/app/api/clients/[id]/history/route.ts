import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '@/lib/auth/tenant-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request);
    if (!ctx) return NextResponse.json({ success: false, error: 'No autenticado o sin organización asignada' }, { status: 401 });
    const clientRepository = RepositoryFactory.getClients(ctx);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    const client = await clientRepository.findById(id);

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const { orders } = await RepositoryFactory.getRepairOrders(ctx).searchWithPagination({
      clientId: id,
      limit: 1000,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const clientWithHistory = {
      ...client,
      repairHistory: orders.map((order) => ({
        id: order.id,
        folio: order.folio,
        deviceType: order.deviceType,
        deviceBrand: order.deviceBrand,
        deviceModel: order.deviceModel,
        status: order.status,
        totalCost: Number(order.totalCost) || 0,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
      })),
      totalRepairs: orders.length,
      totalSpent: orders.reduce((total, order) => total + (Number(order.totalPayment) || Number(order.totalCost) || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: clientWithHistory
    });
  } catch (error) {
    console.error('Error getting client history:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo historial del cliente' },
      { status: 500 }
    );
  }
}
