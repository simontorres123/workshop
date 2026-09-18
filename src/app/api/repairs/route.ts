import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { CreateRepairOrderRequest, RepairOrderSearchFilters } from '@/types/repair';
import { supabaseAdmin } from '@/lib/supabase/client';
import { TenantContext } from '@/repositories/supabase-repair-order.repository';

/**
 * Extrae el access_token de las cookies de la request.
 * Busca primero 'auth_token' (custom), luego las cookies nativas del SDK de Supabase.
 */
function extractToken(request: NextRequest): string | null {
  // 1. Cookie personalizada que se pone en el login
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken) return authToken;

  // 2. Cookies nativas del SDK de Supabase (sb-<ref>-auth-token)
  // El SDK guarda el token como JSON: [access_token, refresh_token] o { access_token, ... }
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        // Puede ser array [access_token, refresh_token] o objeto { access_token }
        if (Array.isArray(parsed)) return parsed[0];
        if (parsed?.access_token) return parsed.access_token;
      } catch {
        // El valor puede ser directamente el token
        if (cookie.value.startsWith('eyJ')) return cookie.value;
      }
    }
  }

  return null;
}

/**
 * Obtiene el contexto de tenant (organización/sucursal) del usuario autenticado.
 */
export async function getTenantContext(request: NextRequest): Promise<TenantContext | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return null;

    const { data: profileRaw, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, role, user_branches(branch_id)')
      .eq('id', user.id)
      .single();

    if (profileError || !profileRaw?.organization_id) return null;

    const profile = profileRaw as any;
    const branches = profile.user_branches || [];
    const assignedBranches = branches.map((b: any) => b.branch_id);

    return {
      organizationId: profile.organization_id as string,
      branchId: assignedBranches.length > 0 ? assignedBranches[0] : null,
      assignedBranches,
      role: (profile.role as string | null) || null,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request);
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);

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
    const ctx = await getTenantContext(request);
    
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: 'No autenticado o sin organización asignada' },
        { status: 401 }
      );
    }

    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx);
    const clientRepository = RepositoryFactory.getClients();

    const body = await request.json();
    const orderData: CreateRepairOrderRequest = body;

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

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Error creando orden de reparación en la base de datos' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: order
    }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating repair order:', err);
    return NextResponse.json(
      { success: false, error: `Error creando orden de reparación: ${err.message}` },
      { status: 500 }
    );
  }
}