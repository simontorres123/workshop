import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { CreateRepairOrderRequest, RepairOrderSearchFilters } from '@/types/repair';

const repairOrderRepository = RepositoryFactory.getRepairOrders();
const clientRepository = RepositoryFactory.getClients();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: RepairOrderSearchFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      sortBy: (searchParams.get('sortBy') as 'createdAt' | 'folio') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      filters.dateRange = {
        start: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
        end: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      };
    }

    const result = await repairOrderRepository.searchWithPagination(filters);
    
    return NextResponse.json({
      success: true,
      data: result.orders,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching repair orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo órdenes de reparación' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderData: CreateRepairOrderRequest = body;
    
    // Process repair order data

    if (!orderData.clientName || !orderData.clientPhone || !orderData.deviceType) {
      return NextResponse.json(
        { success: false, error: 'Nombre del cliente, teléfono y tipo de dispositivo son obligatorios' },
        { status: 400 }
      );
    }

    if (!orderData.deviceBrand || !orderData.deviceDescription) {
      return NextResponse.json(
        { success: false, error: 'Marca y descripción del dispositivo son obligatorios' },
        { status: 400 }
      );
    }

    if (!orderData.problemDescription || !orderData.initialDiagnosis) {
      return NextResponse.json(
        { success: false, error: 'Descripción del problema y diagnóstico inicial son obligatorios' },
        { status: 400 }
      );
    }

    // Si se proporciona teléfono, buscar cliente existente
    let clientId = orderData.clientId;
    if (!clientId && orderData.clientPhone) {
      const existingClient = await clientRepository.findByPhone(orderData.clientPhone);
      if (existingClient) {
        clientId = existingClient.id;
      }
    }

    const finalOrderData: CreateRepairOrderRequest = {
      ...orderData,
      clientId,
      status: orderData.status || 'pending_diagnosis'
    };

    const order = await repairOrderRepository.create(finalOrderData);
    
    return NextResponse.json({
      success: true,
      data: order
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating repair order:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: `Error creando orden de reparación: ${error.message}` },
      { status: 500 }
    );
  }
}