import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { UpdateRepairOrderRequest } from '@/types/repair';
import { blobStorageService } from '@/services/blob-storage.service';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getTenantContext(request);
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);
    
    const order = await repairOrderRepository.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }
    
    const { data: payment } = ctx ? await supabaseAdmin
      .from('workshop_sales')
      .select('id, sale_number, total, payment_method, created_at, status')
      .eq('organization_id', ctx.organizationId)
      .eq('repair_id', id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .maybeSingle() : { data: null };
    const data = payment ? {
      ...order,
      paymentStatus: 'paid',
      payment: {
        saleId: payment.id,
        saleNumber: payment.sale_number,
        amount: Number(payment.total || 0),
        paymentMethod: payment.payment_method,
        paidAt: new Date(payment.created_at),
      },
    } : order;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching repair order:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo orden de reparación' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getTenantContext(request);
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);
    const body = await request.json();
    const updateData: UpdateRepairOrderRequest = body;

    const updatedOrder = await repairOrderRepository.update(id, updateData);
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating repair order:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando orden de reparación' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getTenantContext(request);
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);
    
    // Primero obtener la orden para acceder a las imágenes
    const order = await repairOrderRepository.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar imágenes asociadas si existen
    if (order.images && order.images.length > 0) {
      const blobNames = order.images.map(imageUrl => {
        const parts = imageUrl.split('/');
        const containerIndex = parts.findIndex(part => part === 'repair-images');
        if (containerIndex !== -1 && containerIndex < parts.length - 1) {
          return parts.slice(containerIndex + 1).join('/');
        }
        return null;
      }).filter(Boolean) as string[];
      
      if (blobNames.length > 0) {
        try {
          await Promise.all(
            blobNames.map(path => blobStorageService.deleteImage(path, 'repair-images'))
          );
        } catch (imgError) {
          console.warn('Algunas imágenes no se pudieron eliminar:', imgError);
        }
      }
    }
    
    // Eliminar la orden de la base de datos
    const success = await repairOrderRepository.delete(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error eliminando orden' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Orden y sus imágenes eliminadas correctamente'
    });
  } catch (error) {
    console.error('Error deleting repair order:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando orden de reparación' },
      { status: 500 }
    );
  }
}
