import { NextRequest, NextResponse } from 'next/server';
import { RepairOrderRepository } from '@/repositories/repair-order.repository';

const repairOrderRepository = new RepairOrderRepository();

// GET /api/repairs/[id]/warranty-claims/[claimId] - Obtener un reclamo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const { id, claimId } = await params;

    const order = await repairOrderRepository.getById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    const warrantyClaims = order.warrantyClaims || [];
    const claim = warrantyClaims.find(c => c.id === claimId);

    if (!claim) {
      return NextResponse.json(
        { success: false, error: 'Reclamo de garantía no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Error fetching warranty claim:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo el reclamo de garantía' },
      { status: 500 }
    );
  }
}

// PUT /api/repairs/[id]/warranty-claims/[claimId] - Actualizar un reclamo específico
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const { id, claimId } = await params;
    const body = await request.json();

    // Obtener la orden actual
    const order = await repairOrderRepository.getById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }
    const warrantyClaims = order.warrantyClaims || [];
    const claimIndex = warrantyClaims.findIndex(c => c.id === claimId);

    if (claimIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Reclamo de garantía no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el reclamo
    const updatedClaim = {
      ...warrantyClaims[claimIndex],
      ...body,
      id: claimId, // Mantener el ID original
      date: warrantyClaims[claimIndex].date // Mantener la fecha original
    };

    const updatedClaims = [...warrantyClaims];
    updatedClaims[claimIndex] = updatedClaim;

    // Actualizar la orden
    const updatedOrder = await repairOrderRepository.update(id, {
      warrantyClaims: updatedClaims
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Error actualizando el reclamo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedClaim,
      message: 'Reclamo de garantía actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating warranty claim:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/repairs/[id]/warranty-claims/[claimId] - Eliminar un reclamo específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const { id, claimId } = await params;

    // Obtener la orden actual
    const order = await repairOrderRepository.getById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }
    const warrantyClaims = order.warrantyClaims || [];
    const claimIndex = warrantyClaims.findIndex(c => c.id === claimId);

    if (claimIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Reclamo de garantía no encontrado' },
        { status: 404 }
      );
    }

    // Remover el reclamo del array
    const updatedClaims = warrantyClaims.filter(c => c.id !== claimId);

    // Actualizar la orden
    const updatedOrder = await repairOrderRepository.update(id, {
      warrantyClaims: updatedClaims
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Error eliminando el reclamo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reclamo de garantía eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting warranty claim:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}