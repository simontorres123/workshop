import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { CreateRepairOrderRequest, RepairOrderSearchFilters } from '@/types/repair';
import { TenantContext } from '@/repositories/supabase-repair-order.repository';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/utils/phone';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const normalizeStatus = (value: string | null) => {
  const aliases: Record<string, string> = {
    pending: 'pending_diagnosis',
    pending_repair: 'pending_diagnosis',
    diagnostic_pending: 'pending_diagnosis',
    diagnosis: 'diagnosis_confirmed',
    accepted: 'repair_accepted',
    in_progress: 'in_repair',
    complete: 'completed',
  };
  const normalized = value?.trim().toLowerCase() || '';
  return aliases[normalized] || normalized || undefined;
};

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'No autenticado o sin organización asignada' }, { status: 401 });
    }
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);

    const { searchParams } = new URL(request.url);
    
    const filters: RepairOrderSearchFilters = {
      search: searchParams.get('search') || undefined,
      status: normalizeStatus(searchParams.get('status')),
      clientId: searchParams.get('clientId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      assignedTechnicianId: searchParams.get('assignedTechnicianId') || undefined,
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
    const assigneeIds = Array.from(new Set(result.orders.map(order => order.assignedTechnicianId).filter(Boolean))) as string[];
    const { data: assignees, error: assigneesError } = assigneeIds.length
      ? await supabaseAdmin.from('user_profiles').select('id, full_name').eq('organization_id', ctx?.organizationId || '').in('id', assigneeIds)
      : { data: [], error: null };
    if (assigneesError) throw assigneesError;
    const assigneeNames = new Map((assignees || []).map(assignee => [assignee.id, assignee.full_name]));
    const repairIds = result.orders.map(order => order.id);
    const { data: payments, error: paymentsError } = repairIds.length
      ? await supabaseAdmin
        .from('workshop_sales')
        .select('id, repair_id, sale_number, total, payment_method, created_at, status')
        .eq('organization_id', ctx?.organizationId || '')
        .in('repair_id', repairIds)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
      : { data: [], error: null };
    if (paymentsError) throw paymentsError;
    const paymentByRepair = new Map((payments || []).map(payment => [payment.repair_id, payment]));
    const orders = result.orders.map(order => {
      const payment = paymentByRepair.get(order.id);
      const withAssignee = order.assignedTechnicianId ? { ...order, assignedTechnicianName: assigneeNames.get(order.assignedTechnicianId) || 'Técnico asignado' } : order;
      return payment ? {
        ...withAssignee,
        paymentStatus: 'paid',
        payment: {
          saleId: payment.id,
          saleNumber: payment.sale_number,
          amount: Number(payment.total || 0),
          paymentMethod: payment.payment_method,
          paidAt: new Date(payment.created_at),
        },
      } : withAssignee;
    });
    
    return NextResponse.json({
      success: true,
      data: orders,
      total: result.total
    }, { headers: { 'Cache-Control': 'private, no-store' } });
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
    const clientRepository = RepositoryFactory.getClients(ctx);

    const body = await request.json();
    const orderData: CreateRepairOrderRequest = body;

    if (!orderData.clientName?.trim() || !orderData.clientPhone?.trim() || !orderData.deviceType) {
      return NextResponse.json(
        { success: false, error: 'Nombre del cliente, teléfono y tipo de dispositivo son obligatorios' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(orderData.clientPhone);
    if (!isValidPhoneNumber(orderData.clientPhone)) {
      return NextResponse.json(
        { success: false, error: 'El teléfono debe contener entre 10 y 15 dígitos válidos' },
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

    if (orderData.assignedTechnicianId) {
      const { data: technician } = await supabaseAdmin.from('user_profiles').select('id, role, branch_id')
        .eq('id', orderData.assignedTechnicianId).eq('organization_id', ctx.organizationId).in('role', ['technician', 'branch_admin']).maybeSingle();
      if (!technician) return NextResponse.json({ success: false, error: 'El técnico seleccionado no pertenece a este taller.' }, { status: 400 });
      const targetBranch = ctx.branchId || orderData.branchId;
      const { data: membership } = targetBranch ? await supabaseAdmin.from('user_branches').select('user_id').eq('user_id', technician.id).eq('branch_id', targetBranch).maybeSingle() : { data: null };
      if (targetBranch && technician.branch_id !== targetBranch && !membership) return NextResponse.json({ success: false, error: 'El técnico no está asignado a la sucursal de esta orden.' }, { status: 400 });
    }

    // El flujo de la orden conserva el teléfono original como snapshot histórico,
    // pero usa la clave normalizada para vincular o crear el cliente en segundo plano.
    let clientId = orderData.clientId;
    if (clientId && !(await clientRepository.findById(clientId))) {
      return NextResponse.json(
        { success: false, error: 'El cliente no pertenece a la organización actual' },
        { status: 400 }
      );
    }
    if (!clientId && orderData.clientPhone) {
      const existingClient = await clientRepository.findByPhone(normalizedPhone);
      const client = existingClient || await clientRepository.create({
        fullName: orderData.clientName.trim(),
        phone: normalizedPhone,
        email: orderData.clientEmail?.trim() || undefined
      });

      // A concurrent order may have created the same client between the lookup
      // and insert; retry the lookup before failing the order creation.
      const linkedClient = client || await clientRepository.findByPhone(normalizedPhone);
      if (!linkedClient) throw new Error('No se pudo vincular o crear el cliente');
      clientId = linkedClient.id;
    }

    const finalOrderData: CreateRepairOrderRequest = {
      ...orderData,
      clientId,
      status: orderData.status || 'pending_diagnosis'
    };

    if (orderData.saveDeviceForClient && clientId) {
      const clientDevice = await RepositoryFactory.getDevices().upsertClientDevice({
        clientId,
        deviceType: orderData.deviceType,
        brand: orderData.deviceBrand,
        model: orderData.deviceModel,
        serial: orderData.deviceSerial,
      }, ctx.organizationId);
      finalOrderData.clientDeviceId = clientDevice.id;
    }

    const order = await repairOrderRepository.create(finalOrderData);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Error creando orden de reparación en la base de datos' },
        { status: 500 }
      );
    }
    if (order.assignedTechnicianId) {
      await supabaseAdmin.from('repair_assignment_history').insert({ organization_id: ctx.organizationId, branch_id: order.branchId || null, repair_id: order.id, assigned_technician_id: order.assignedTechnicianId, assigned_by: ctx.userId || null });
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
