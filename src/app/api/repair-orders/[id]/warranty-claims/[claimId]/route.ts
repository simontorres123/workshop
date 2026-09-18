import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '@/app/api/repairs/route';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const ctx = await getTenantContext(request);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'No autenticado o sin organización asignada' }, { status: 401 });
    }
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx);

    const resolvedParams = await context.params;
    const { id, claimId } = resolvedParams;
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ success: false, error: 'Datos JSON inválidos' }, { status: 400 });
    }

    const { status, resolution, notes } = body;

    // Verificar si existe la orden
    const order = await repairOrderRepository.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Orden de reparación no encontrada' }, { status: 404 });
    }

    // Asegurar que el método exista en el repositorio (cast a any para evitar error de ts si no se ha refrescado)
    const repo = repairOrderRepository as any;
    if (repo.updateWarrantyClaim) {
      const success = await repo.updateWarrantyClaim(claimId, { status, resolution, notes });
      if (!success) {
        return NextResponse.json({ success: false, error: 'Error al actualizar el reclamo de garantía' }, { status: 500 });
      }
    }

    // Obtener la orden actualizada para devolverla
    const updatedOrder = await repairOrderRepository.findById(id);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Reclamo de garantía actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating warranty claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
