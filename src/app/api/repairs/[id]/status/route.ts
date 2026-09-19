import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, note } = await request.json();

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Estado es requerido' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'pending_diagnosis',
      'diagnosis_confirmed', 
      'repair_accepted',
      'in_repair',
      'repaired',
      'delivered',
      'completed',
      'repair_rejected',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado no válido' },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(request);
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: 'Sesión expirada o usuario sin organización asignada' },
        { status: 401 }
      );
    }
    const repairOrderRepository = RepositoryFactory.getRepairOrders(ctx || undefined);

    if (status === 'completed') {
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('workshop_sales')
        .select('id')
        .eq('organization_id', ctx.organizationId)
        .eq('repair_id', id)
        .eq('status', 'paid')
        .maybeSingle();
      if (paymentError) throw paymentError;
      if (!payment) {
        return NextResponse.json(
          { success: false, error: 'La orden no puede marcarse como completada hasta registrar el pago total.' },
          { status: 400 }
        );
      }
    }

    const reservedPartIds: string[] = [];

    const releaseReservedParts = async () => {
      for (const partId of reservedPartIds) {
        await supabaseAdmin.rpc('release_repair_part', {
          p_part_id: partId,
          p_organization_id: ctx.organizationId,
        });
      }
    };

    if (status === 'repair_accepted') {
      const { data: proposedParts, error: partsError } = await supabaseAdmin.from('repair_parts').select('id').eq('repair_id', id).eq('organization_id', ctx.organizationId).eq('status', 'proposed');
      if (partsError) throw partsError;
      for (const part of proposedParts || []) {
        const { error } = await supabaseAdmin.rpc('reserve_repair_part', { p_part_id: part.id, p_organization_id: ctx.organizationId });
        if (error) {
          await releaseReservedParts();
          return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        reservedPartIds.push(part.id);
      }
    }

    const updatedOrder = await repairOrderRepository.updateStatus(id, status, note);

    if (!updatedOrder) {
      await releaseReservedParts();
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el estado de la orden' },
        { status: 500 }
      );
    }

    if (['repair_rejected', 'cancelled'].includes(status)) {
      const { data: activeParts } = await supabaseAdmin.from('repair_parts').select('id').eq('repair_id', id).eq('organization_id', ctx.organizationId).in('status', ['proposed', 'reserved']);
      for (const part of activeParts || []) await supabaseAdmin.rpc('release_repair_part', { p_part_id: part.id, p_organization_id: ctx.organizationId });
    } else if (['repaired', 'delivered', 'completed'].includes(status)) {
      const { error } = await supabaseAdmin.rpc('use_repair_parts', { p_repair_id: id, p_organization_id: ctx.organizationId });
      if (error) console.error('Error registrando refacciones usadas:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating repair order status:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando estado de la orden' },
      { status: 500 }
    );
  }
}
