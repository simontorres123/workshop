import { NextRequest, NextResponse } from 'next/server';
import { RepairOrderRepository } from '@/repositories/repair-order.repository';
import { createWarrantyClaimSchema } from '@/schemas/warranty.schema';
import { v4 as uuidv4 } from 'uuid';
import { WarrantyClaim } from '@/types/repair';

const repairOrderRepository = new RepairOrderRepository();

// GET /api/repairs/[id]/warranty-claims - Obtener reclamos de garantía de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await repairOrderRepository.getById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    const warrantyClaims = order.warrantyClaims || [];

    return NextResponse.json({
      success: true,
      data: warrantyClaims.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching warranty claims:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo reclamos de garantía' },
      { status: 500 }
    );
  }
}

// POST /api/repairs/[id]/warranty-claims - Crear nuevo reclamo de garantía
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validar datos de entrada
    const validationResult = createWarrantyClaimSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { reason, technician, notes } = validationResult.data;

    // Obtener la orden actual
    const order = await repairOrderRepository.getById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden esté entregada (solo órdenes entregadas pueden tener reclamos)
    if (order.status !== 'delivered' && order.status !== 'repaired') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solo se pueden registrar reclamos de garantía en órdenes entregadas o reparadas' 
        },
        { status: 400 }
      );
    }

    // Crear nuevo reclamo de garantía
    const newClaim: WarrantyClaim = {
      id: uuidv4(),
      date: new Date(),
      reason,
      technician,
      notes,
      createdBy: 'current-user' // TODO: Obtener del contexto de autenticación
    };

    // Agregar el reclamo al array existente
    const existingClaims = order.warrantyClaims || [];
    const updatedClaims = [...existingClaims, newClaim];

    // Actualizar la orden con el nuevo reclamo
    const updatedOrder = await repairOrderRepository.update(id, {
      warrantyClaims: updatedClaims
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Error actualizando la orden con el reclamo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newClaim,
      message: 'Reclamo de garantía registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating warranty claim:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}