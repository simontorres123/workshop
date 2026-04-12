import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { StatusNote } from '@/types/repair';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folio: string }> }
) {
  try {
    const { folio } = await params;

    if (!folio) {
      return NextResponse.json(
        { success: false, error: 'Folio es requerido' },
        { status: 400 }
      );
    }

    // Validar formato básico del folio
    if (!folio.match(/^REP-\w+$/i)) {
      return NextResponse.json(
        { success: false, error: 'Formato de folio inválido' },
        { status: 400 }
      );
    }

    const order = await repairOrderRepository.findByFolio(folio.toUpperCase());

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden de reparación no encontrada' },
        { status: 404 }
      );
    }

    // Procesar notas del historial de estados
    interface PublicNote {
      _id: string;
      content: string;
      isVisibleToClient: boolean;
      createdAt: Date;
      statusChange: string;
    }

    let publicNotes: PublicNote[] = [];
    if (order.statusNotes) {
      if (Array.isArray(order.statusNotes)) {
        // Nuevo formato: array de StatusNote
        publicNotes = (order.statusNotes as StatusNote[])
          .filter(note => note.note && note.note.trim()) // Solo notas con contenido
          .map(note => ({
            _id: note.id,
            content: note.note || '',
            isVisibleToClient: true,
            createdAt: new Date(note.createdAt),
            statusChange: note.previousStatus ? `${note.previousStatus} → ${note.newStatus}` : note.newStatus
          }));
      }
    }

    // Crear respuesta pública sin información sensible
    const publicData = {
      folio: order.folio,
      status: order.status,
      device: {
        type: order.deviceType,
        brand: order.deviceBrand,
        model: order.deviceModel,
        description: order.deviceDescription
      },
      estimatedCompletionDate: order.estimatedDate,
      publicNotes: publicNotes,
      images: order.images || [],
      totalCost: order.totalCost,
      advancePayment: order.advancePayment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: publicData
    });
  } catch (error) {
    console.error('Error tracking repair order:', error);
    return NextResponse.json(
      { success: false, error: 'Error del servidor' },
      { status: 500 }
    );
  }
}