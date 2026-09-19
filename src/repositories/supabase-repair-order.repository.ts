import { supabase } from '@/lib/supabase/client';
import { 
  RepairOrder, 
  CreateRepairOrderRequest, 
  RepairOrderSearchFilters,
  UpdateRepairOrderRequest
} from '@/types/repair';
import { Database } from '@/types/supabase';
import { useAuthStore } from '@/store/auth.store';

type DBRepairOrder = Database['public']['Tables']['repair_orders']['Row'];
type DBStatusHistory = Database['public']['Tables']['repair_status_history']['Row'];
type DBWarrantyClaim = Database['public']['Tables']['warranty_claims']['Row'];

type DBRepairWithRelations = DBRepairOrder & {
  status_notes: DBStatusHistory[];
  warranty_claims: DBWarrantyClaim[];
};

export interface TenantContext {
  userId?: string;
  organizationId: string;
  branchId: string | null;
  assignedBranches?: string[];
  role: string | null;
}

export class SupabaseRepairOrderRepository {
  private context: TenantContext | null = null;

  constructor(context?: TenantContext) {
    this.context = context || null;
  }

  private async getEffectiveContext(): Promise<TenantContext> {
    if (this.context) return this.context;
    
    // Fallback al store (Cliente)
    const state = useAuthStore.getState();
    return {
      organizationId: state.getOrganizationId(),
      branchId: state.getBranchId(),
      role: state.getRole()
    };
  }

  /**
   * Obtiene todas las órdenes de reparación de la organización
   */
  async findAll(): Promise<RepairOrder[]> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) return [];

      let query = supabase
        .from('repair_orders')
        .select(`
          *,
          status_notes:repair_status_history(*),
          warranty_claims(*)
        `)
        .eq('organization_id', ctx.organizationId);

      // AISLAMIENTO POR SUCURSAL: Si es técnico o admin de sucursal, filtrar por branch_id
      if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
        if (ctx.branchId) {
          query = query.eq('branch_id', ctx.branchId);
        } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
          query = query.in('branch_id', ctx.assignedBranches);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      const repairData = (data as unknown) as DBRepairWithRelations[];
      return (repairData || []).map(db => this.mapToLocal(db));
    } catch (error) {
      console.error('Error getting all repair orders from Supabase:', error);
      return [];
    }
  }

  /**
   * Crear nueva orden vinculada a Org y Branch
   */
  async create(data: CreateRepairOrderRequest): Promise<RepairOrder | null> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) throw new Error('Usuario sin organización');

      const folio = `REP-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: newOrder, error } = await supabase
        .from('repair_orders')
        .insert([{
          folio: folio,
          organization_id: ctx.organizationId,
          branch_id: ctx.branchId || null,
          client_id: data.clientId,
          client_name: data.clientName,
          client_phone: data.clientPhone,
          client_email: data.clientEmail,
          client_device_id: data.clientDeviceId || null,
          device_type: data.deviceType,
          device_brand: data.deviceBrand,
          device_model: data.deviceModel,
          device_serial: data.deviceSerial,
          device_description: data.deviceDescription,
          problem_description: data.problemDescription,
          initial_diagnosis: data.initialDiagnosis,
          required_parts: data.requiredParts || [],
          status: data.status || 'pending_diagnosis',
          estimated_date: data.estimatedDate?.toISOString(),
          advance_payment: data.advancePayment || 0,
          total_cost: data.totalCost || 0,
          images: data.images || [],
          notes: data.notes || [],
          warranty_period_months: data.warrantyPeriodMonths || 3,
          storage_period_months: data.storagePeriodMonths || 1
        }])
        .select()
        .single();

      if (error) throw error;

      await this.addStatusNote(newOrder.id, null, newOrder.status, 'Orden creada');

      return await this.findById(newOrder.id);
    } catch (error) {
      console.error('Error creating repair order in Supabase:', error);
      throw error;
    }
  }

  /**
   * Obtener orden por ID restringido a la Org y Sucursal (si aplica)
   */
  async findById(id: string): Promise<RepairOrder | null> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) return null;
      
      let query = supabase
        .from('repair_orders')
        .select(`
          *,
          status_notes:repair_status_history(*),
          warranty_claims(*)
        `)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId);

      // Aislamiento por sucursal
      if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
        if (ctx.branchId) {
          query = query.eq('branch_id', ctx.branchId);
        } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
          query = query.in('branch_id', ctx.assignedBranches);
        }
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return this.mapToLocal((data as unknown) as DBRepairWithRelations);
    } catch (error) {
      console.error(`Error getting repair order by id ${id} from Supabase:`, error);
      return null;
    }
  }

  /**
   * Obtener orden por Folio (Para seguimiento público)
   * No requiere contexto de organización
   */
  async findByFolio(folio: string): Promise<RepairOrder | null> {
    try {
      // Usamos admin para saltar RLS si es necesario, ya que el tracking es público
      // y no hay usuario autenticado. En el backend supabase se resuelve a admin role.
      const query = supabase
        .from('repair_orders')
        .select(`
          *,
          status_notes:repair_status_history(*),
          warranty_claims(*)
        `)
        .ilike('folio', folio)
        .single();

      const { data, error } = await query;

      if (error) throw error;
      return this.mapToLocal((data as unknown) as DBRepairWithRelations);
    } catch (error) {
      console.error(`Error getting repair order by folio ${folio} from Supabase:`, error);
      return null;
    }
  }

  /**
   * Actualizar orden con filtro de Org y Sucursal (si aplica)
   */
  async update(id: string, updates: UpdateRepairOrderRequest & { warrantyClaims?: any[] }): Promise<RepairOrder | null> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) return null;

      // Manejar reclamos de garantía
      if (updates.warrantyClaims && Array.isArray(updates.warrantyClaims) && updates.warrantyClaims.length > 0) {
        // En lugar de tomar solo el último, insertamos los reclamos que no tienen ID o cuyo ID no está en DB.
        // Dado el flujo actual, normalmente es el último elemento.
        const latestClaim = updates.warrantyClaims[updates.warrantyClaims.length - 1];
        if (latestClaim && latestClaim.reason) {
          // Always try to insert the latest claim if passed in the update block
          // It's safe since the API explicitly passes the new list to update
          const { error: insertError } = await supabase.from('warranty_claims').insert({
            id: latestClaim.id,
            repair_id: id,
            reason: String(latestClaim.reason),
            technician: String(latestClaim.technician || ''),
            notes: String(latestClaim.notes || ''),
            resolution: String(latestClaim.resolution || ''),
            status: String(latestClaim.status || 'pending')
          } as any);
          
          if (insertError) {
            console.error('Error insertando warranty_claim:', insertError);
            // Ignore error if it already exists, otherwise throw
            if (insertError.code !== '23505') { // 23505 is unique violation
              throw insertError;
            }
          }
        }
      }

      const dbUpdates: Database['public']['Tables']['repair_orders']['Update'] = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost;
      if (updates.confirmedDiagnosis) dbUpdates.confirmed_diagnosis = updates.confirmedDiagnosis;
      if (updates.images !== undefined) dbUpdates.images = updates.images;
      if (updates.trackingUrl !== undefined) (dbUpdates as any).tracking_url = updates.trackingUrl;

      if (Object.keys(dbUpdates).length > 0) {
        let query = supabase
          .from('repair_orders')
          .update(dbUpdates)
          .eq('id', id)
          .eq('organization_id', ctx.organizationId);

        // Aislamiento por sucursal
        if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
          if (ctx.branchId) {
            query = query.eq('branch_id', ctx.branchId);
          } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
            query = query.in('branch_id', ctx.assignedBranches);
          }
        }

        const { error } = await query;
        if (error) throw error;
      }

      return await this.findById(id);
    } catch (error) {
      console.error(`Error updating repair order ${id}:`, error);
      return null;
    }
  }

  /**
   * Actualizar un reclamo de garantía específico
   */
  async updateWarrantyClaim(claimId: string, updates: any): Promise<boolean> {
    try {
      const dbUpdates: any = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.resolution !== undefined) dbUpdates.resolution = updates.resolution;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      if (Object.keys(dbUpdates).length === 0) return true;

      const { error } = await supabase
        .from('warranty_claims')
        .update(dbUpdates)
        .eq('id', claimId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error updating warranty claim ${claimId}:`, error);
      return false;
    }
  }

  /**
   * Buscar órdenes restringidas a la organización y sucursal
   */
  async searchWithPagination(filters: RepairOrderSearchFilters): Promise<{ orders: RepairOrder[]; total: number }> {
    const ctx = await this.getEffectiveContext();
    if (!ctx.organizationId) return { orders: [], total: 0 };

    let query = supabase
      .from('repair_orders')
      .select('*, status_notes:repair_status_history(*), warranty_claims(*)', { count: 'exact' })
      .eq('organization_id', ctx.organizationId);

    // Aislamiento por sucursal
    if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
      if (ctx.branchId) {
        query = query.eq('branch_id', ctx.branchId);
      } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
        query = query.in('branch_id', ctx.assignedBranches);
      }
    }

    if (filters.search) query = query.or(`folio.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.clientId) query = query.eq('client_id', filters.clientId);
    if (filters.branchId) query = query.eq('branch_id', filters.branchId);

    if (filters.dateRange) {
      if (filters.dateRange.start) query = query.gte('created_at', filters.dateRange.start.toISOString());
      if (filters.dateRange.end) query = query.lte('created_at', filters.dateRange.end.toISOString());
    }

    const sortCol = filters.sortBy === 'folio' ? 'folio' : 'created_at';
    query = query.order(sortCol, { ascending: filters.sortOrder === 'asc' });

    if (filters.limit) {
      const from = filters.offset || 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) return { orders: [], total: 0 };
    
    const repairData = (data as unknown) as DBRepairWithRelations[];
    return { 
      orders: (repairData || []).map(o => this.mapToLocal(o)), 
      total: count || 0 
    };
  }

  /**
   * Obtiene órdenes reparadas no entregadas de la Org/Sucursal actual
   */
  async getRepairedNotDelivered(): Promise<RepairOrder[]> {
    const ctx = await this.getEffectiveContext();
    if (!ctx.organizationId) return [];

    let query = supabase
      .from('repair_orders')
      .select('*, status_notes:repair_status_history(*), warranty_claims(*)')
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'repaired')
      .is('delivered_at', null);

    // Aislamiento por sucursal
    if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
      if (ctx.branchId) {
        query = query.eq('branch_id', ctx.branchId);
      } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
        query = query.in('branch_id', ctx.assignedBranches);
      }
    }

    const { data, error } = await query;
    if (error) return [];
    const repairData = (data as unknown) as DBRepairWithRelations[];
    return (repairData || []).map(o => this.mapToLocal(o));
  }

  /**
   * Actualizar el estado de una orden de reparación
   */
  async updateStatus(id: string, status: string, note?: string): Promise<RepairOrder | null> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) return null;

      // Obtener el estado actual primero
      const current = await this.findById(id);
      const previousStatus = current?.status || null;

      const lifecycleNow = new Date().toISOString();
      const statusUpdate: Record<string, string> = { status };

      // Registrar las fechas base del ciclo de vida. Estas fechas alimentan
      // las alertas y reportes de garantía y almacenamiento del dashboard.
      if (status === 'repaired' && !current?.completedAt) {
        statusUpdate.completed_at = lifecycleNow;
      }
      if (status === 'delivered') {
        if (!current?.deliveredAt) statusUpdate.delivered_at = lifecycleNow;
        if (!current?.completedAt) statusUpdate.completed_at = lifecycleNow;
      }
      if (status === 'completed' && !current?.deliveredAt) {
        statusUpdate.delivered_at = lifecycleNow;
        if (!current?.completedAt) statusUpdate.completed_at = lifecycleNow;
      }

      let query = supabase
        .from('repair_orders')
        .update(statusUpdate as any)
        .eq('id', id)
        .eq('organization_id', ctx.organizationId);

      if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
        if (ctx.branchId) {
          query = query.eq('branch_id', ctx.branchId);
        } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
          query = query.in('branch_id', ctx.assignedBranches);
        }
      }

      const { error } = await query;
      if (error) throw error;

      // Registrar en el historial
      await this.addStatusNote(id, previousStatus, status, note);

      return await this.findById(id);
    } catch (error) {
      console.error(`Error updating status of repair order ${id}:`, error);
      return null;
    }
  }

  /**
   * Eliminar una orden de reparación
   */
  async delete(id: string): Promise<boolean> {
    try {
      const ctx = await this.getEffectiveContext();
      if (!ctx.organizationId) return false;

      let query = supabase
        .from('repair_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', ctx.organizationId);

      if (ctx.role === 'technician' || ctx.role === 'branch_admin') {
        if (ctx.branchId) {
          query = query.eq('branch_id', ctx.branchId);
        } else if (ctx.assignedBranches && ctx.assignedBranches.length > 0) {
          query = query.in('branch_id', ctx.assignedBranches);
        }
      }

      const { error } = await query;
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting repair order ${id}:`, error);
      return false;
    }
  }

  private async addStatusNote(repairId: string, oldStatus: string | null, newStatus: string, note?: string) {
    return supabase
      .from('repair_status_history')
      .insert([{
        repair_id: repairId,
        previous_status: oldStatus,
        new_status: newStatus,
        note: note
      }]);
  }

  private mapToLocal(db: DBRepairWithRelations): RepairOrder {
    return {
      id: db.id,
      type: 'repair_order',
      folio: db.folio,
      trackingUrl: db.tracking_url || undefined,
      organizationId: db.organization_id || undefined,
      branchId: db.branch_id || undefined,
      clientId: db.client_id || undefined,
      clientDeviceId: (db as any).client_device_id || undefined,
      clientName: db.client_name,
      clientPhone: db.client_phone,
      clientEmail: db.client_email || undefined,
      deviceType: db.device_type,
      deviceBrand: db.device_brand,
      deviceModel: db.device_model || undefined,
      deviceSerial: db.device_serial || undefined,
      deviceDescription: db.device_description || '',
      problemDescription: db.problem_description || '',
      initialDiagnosis: db.initial_diagnosis || '',
      confirmedDiagnosis: db.confirmed_diagnosis || undefined,
      requiredParts: db.required_parts as string[] || [],
      laborCost: Number(db.labor_cost) || 0,
      partsCost: Number(db.parts_cost) || 0,
      totalCost: Number(db.total_cost) || 0,
      status: db.status,
      paymentStatus: db.payment_status || undefined,
      estimatedDate: db.estimated_date ? new Date(db.estimated_date) : undefined,
      completedAt: db.completed_at ? new Date(db.completed_at) : undefined,
      deliveredAt: db.delivered_at ? new Date(db.delivered_at) : undefined,
      advancePayment: Number(db.advance_payment) || 0,
      totalPayment: Number(db.total_payment) || 0,
      remainingPayment: Number(db.remaining_payment) || 0,
      notes: db.notes as string[] || [],
      statusNotes: (db.status_notes || []).map(sn => ({
        id: sn.id,
        previousStatus: sn.previous_status || undefined,
        newStatus: sn.new_status,
        note: sn.note || undefined,
        createdAt: new Date(sn.created_at || '')
      })),
      warrantyClaims: (db.warranty_claims || []).map(wc => ({
        id: wc.id,
        date: new Date(wc.date || ''),
        reason: wc.reason,
        technician: wc.technician || '',
        notes: wc.notes || undefined,
        resolution: wc.resolution || undefined,
        status: wc.status as 'pending' | 'in_review' | 'resolved' | 'rejected',
        createdBy: wc.created_by || undefined
      })),
      images: db.images as string[] || [],
      warrantyPeriodMonths: db.warranty_period_months || 3,
      storagePeriodMonths: db.storage_period_months || 1,
      createdAt: new Date(db.created_at || ''),
      updatedAt: new Date(db.updated_at || ''),
      createdBy: db.created_by || undefined
    };
  }
}
