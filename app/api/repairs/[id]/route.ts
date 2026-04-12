import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { UpdateRepairOrderRequest } from '@/types/repair';
import { blobStorageService } from '@/services/blob-storage.service';

const repairOrderRepository = RepositoryFactory.getRepairOrders();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const order = await repairOrderRepository.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: order
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
    const body = await request.json();
    const updateData: UpdateRepairOrderRequest = body;

    // Updating repair order

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
    
    // Deleting repair order
    
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
      // Deleting associated images
      
      // Extraer los nombres de blob de las URLs
      const blobNames = order.images.map(imageUrl => {
        // URL format: /api/images/repair-images/blobName.ext
        // o /api/images/repair-images/folder/blobName.ext (con carpeta)
        const parts = imageUrl.split('/');
        
        // Encontrar el índice de 'repair-images' y tomar todo lo que sigue
        const containerIndex = parts.findIndex(part => part === 'repair-images');
        if (containerIndex !== -1 && containerIndex < parts.length - 1) {
          // Unir todas las partes después del container (puede incluir carpetas)
          return parts.slice(containerIndex + 1).join('/');
        }
        
        return null;
      }).filter(Boolean);
      
      // Processing image deletions
      
      if (blobNames.length > 0) {
        const deleteResult = await blobStorageService.deleteMultipleImages(
          blobNames,
          'repair-images'
        );
        
        // Images deletion completed
        
        if (deleteResult.failed.length > 0) {
          console.warn('⚠️ Algunas imágenes no se pudieron eliminar:', deleteResult.failed);
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
    
    // Repair order deleted successfully
    
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