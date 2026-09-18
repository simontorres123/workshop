import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '../../route';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, note } = await request.json();

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Estado es requerido' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'pending_diagnosis',
      'diagnosis_confirmed', 
      'in_repair',
      'repaired',
      'completed',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado no válido' },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(request);
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);

    const updatedOrder = await repairOrderRepository.updateStatus(id, status, note);
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating repair order status:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando estado de la orden' },
      { status: 500 }
    );
  }
}