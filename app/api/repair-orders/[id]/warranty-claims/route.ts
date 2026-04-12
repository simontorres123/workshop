import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { v4 as uuidv4 } from 'uuid';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

// POST /api/repair-orders/[id]/warranty-claims - Agregar reclamo de garantía
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('POST warranty claim - awaiting params...');
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    console.log('POST warranty claim - id:', id);
    
    let body;
    try {
      body = await request.json();
      console.log('POST warranty claim - received body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json(
        { success: false, error: 'Datos JSON inválidos' },
        { status: 400 }
      );
    }

    // Extraer datos directamente (sin validación por ahora para debug)
    const { reason, technician, notes, resolution, status, clientSignature, technicianSignature, supervisorSignature } = body;
    
    console.log('Extracted data:', { reason, technician, notes, resolution, status });
    
    // Validación básica manual
    if (!reason || !technician) {
      console.log('Basic validation failed: missing reason or technician');
      return NextResponse.json(
        { success: false, error: 'Motivo y técnico son requeridos' },
        { status: 400 }
      );
    }

    // Obtener la orden actual
    console.log('Getting repair order with id:', id);
    const order = await repairOrderRepository.findById(id);
    console.log('Retrieved order:', order ? 'found' : 'not found');
    
    if (!order) {
      console.log('Order not found for id:', id);
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    // Crear nuevo reclamo de garantía
    const newClaim = {
      id: uuidv4(),
      date: new Date(),
      reason: reason.trim(),
      technician: technician.trim(),
      notes: notes?.trim(),
      resolution: resolution?.trim(),
      status: status || 'pending',
      clientSignature,
      technicianSignature,
      supervisorSignature,
      createdBy: 'system' // TODO: Obtener del usuario autenticado
    };

    // Agregar el reclamo al array de warranty claims
    const updatedClaims = [...(order.warrantyClaims || []), newClaim];

    // Actualizar la orden con el nuevo reclamo
    console.log('Updating order with new warranty claim. Claims count:', updatedClaims.length);
    const updatedOrder = await repairOrderRepository.update(id, {
      warrantyClaims: updatedClaims,
      updatedAt: new Date()
    });

    console.log('Update result:', updatedOrder ? 'success' : 'failed');
    if (!updatedOrder) {
      console.log('Failed to update order with warranty claim');
      return NextResponse.json(
        { success: false, error: 'Error actualizando orden de reparación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        claim: newClaim,
        order: updatedOrder
      },
      message: 'Reclamo de garantía registrado exitosamente'
    });

  } catch (error) {
    console.error('Error creating warranty claim:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/repair-orders/[id]/warranty-claims - Obtener reclamos de garantía
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const order = await repairOrderRepository.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    const claims = order.warrantyClaims || [];

    return NextResponse.json({
      success: true,
      data: claims,
      message: `${claims.length} reclamos de garantía encontrados`
    });

  } catch (error) {
    console.error('Error getting warranty claims:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}