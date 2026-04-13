import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { RepairOrderSearchFilters } from '@/types/repair';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const excludeDelivered = searchParams.get('excludeDelivered') === 'true';
    const deviceType = searchParams.get('deviceType');
    const clientName = searchParams.get('clientName');
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'folio' | 'status' | 'clientName') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const repository = RepositoryFactory.getRepairOrders();

    // Obtener todas las órdenes y filtrar localmente por ahora
    const allOrders = await repository.findAll();
    
    let filteredOrders = allOrders;
    
    // Aplicar filtros
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }
    
    if (excludeDelivered) {
      // En tu estructura, las entregadas tienen status "completed"
      filteredOrders = filteredOrders.filter(order => order.status !== 'completed');
    }
    
    if (deviceType) {
      filteredOrders = filteredOrders.filter(order => 
        order.deviceType?.toLowerCase().includes(deviceType.toLowerCase())
      );
    }
    
    if (clientName) {
      filteredOrders = filteredOrders.filter(order => 
        order.clientName?.toLowerCase().includes(clientName.toLowerCase())
      );
    }

    // Ordenamiento
    filteredOrders.sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;
      
      switch (sortBy) {
        case 'completedAt':
          aValue = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          bValue = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          break;
        case 'folio':
          aValue = a.folio;
          bValue = b.folio;
          break;
        case 'clientName':
          aValue = a.clientName?.toLowerCase() || '';
          bValue = b.clientName?.toLowerCase() || '';
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return NextResponse.json({
      success: true,
      data: filteredOrders,
      total: filteredOrders.length,
      appliedFilters: {
        status,
        excludeDelivered,
        deviceType,
        clientName,
        sortBy,
        sortOrder
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Error fetching repair orders:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}