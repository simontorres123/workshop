import { supabaseAdmin } from '@/lib/supabase/client';
import { TenantContext } from './supabase-repair-order.repository';

export type InventoryMovementType = 'in' | 'out' | 'adjustment' | 'waste' | 'transfer';

export class InventoryRepository {
  constructor(private readonly context: TenantContext) {}

  private scope<T extends { eq: (column: string, value: unknown) => T }>(query: T) {
    return query.eq('organization_id', this.context.organizationId);
  }

  private branchScope<T extends { eq: (column: string, value: unknown) => T; in: (column: string, values: string[]) => T }>(query: T, branchId?: string | null) {
    const selected = branchId || this.context.branchId;
    if (selected) return query.eq('branch_id', selected);
    if (this.context.role !== 'org_admin' && this.context.role !== 'super_admin' && (this.context.assignedBranches || []).length) {
      return query.in('branch_id', this.context.assignedBranches || []);
    }
    return query;
  }

  private toProduct(product: any, branchId?: string | null) {
    const stocks = (product.inventory_stock || []).filter((stock: any) => !branchId || stock.branch_id === branchId);
    const stock = stocks.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
    const minStock = stocks.length ? Math.min(...stocks.map((row: any) => Number(row.min_stock || 0))) : Number(product.min_stock || 0);
    const category = product.inventory_categories?.slug || product.metadata?.category || product.category_id || 'other';
    return {
      ...product,
      name: product.name,
      description: product.description || '',
      brand: product.brand || '',
      model: product.model || '',
      category,
      customCategory: product.metadata?.customCategory || undefined,
      price: Number(product.sale_price || 0),
      cost: Number(product.cost_price || 0),
      stock,
      lowStockThreshold: minStock,
      status: product.status,
      isActive: product.status === 'active',
      location: stocks[0]?.inventory_locations?.name || product.metadata?.location || '',
      supplier: product.metadata?.supplier || undefined,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  }

  async listProducts(filters: Record<string, string | number | boolean | undefined> = {}) {
    const branchId = filters.branchId as string | undefined;
    let query: any = this.scope(supabaseAdmin.from('inventory_products').select('*, inventory_categories(name, slug), inventory_stock(*)'));
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.category) query = query.eq('inventory_categories.slug', filters.category);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((product: any) => this.toProduct(product, branchId || this.context.branchId));
  }

  async getProduct(id: string) {
    const { data, error } = await this.scope(supabaseAdmin.from('inventory_products').select('*, inventory_categories(name, slug), inventory_stock(*)').eq('id', id)).maybeSingle();
    if (error) throw error;
    return data ? this.toProduct(data, this.context.branchId) : data;
  }

  async createProduct(payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('inventory_products').insert({ ...payload, organization_id: this.context.organizationId, created_by: this.context.userId || null }).select().single();
    if (error) throw error;
    return data ? this.toProduct(data, this.context.branchId) : data;
  }

  async updateProduct(id: string, payload: Record<string, unknown>) {
    let updatePayload = payload;
    if (payload.metadata !== undefined) {
      const { data: current, error: readError } = await this.scope(supabaseAdmin.from('inventory_products').select('metadata').eq('id', id)).maybeSingle();
      if (readError) throw readError;
      updatePayload = { ...payload, metadata: { ...(current?.metadata || {}), ...(payload.metadata as Record<string, unknown>) } };
    }
    const { error } = await this.scope(supabaseAdmin.from('inventory_products').update(updatePayload).eq('id', id));
    if (error) throw error;
    return this.getProduct(id);
  }

  async applyMovement(payload: { productId: string; branchId: string; locationId?: string; type: InventoryMovementType; quantity: number; reason: string; reference?: string; transferBranchId?: string; transferLocationId?: string; unitCost?: number; metadata?: Record<string, unknown> }) {
    if (this.context.role !== 'org_admin' && this.context.role !== 'super_admin' && !(this.context.assignedBranches || []).includes(payload.branchId)) throw new Error('Sucursal no autorizada');
    const { error } = await supabaseAdmin.rpc('inventory_apply_movement', { p_organization_id: this.context.organizationId, p_product_id: payload.productId, p_branch_id: payload.branchId, p_location_id: payload.locationId || null, p_type: payload.type, p_quantity: payload.quantity, p_reason: payload.reason, p_reference: payload.reference || null, p_transfer_branch_id: payload.transferBranchId || null, p_transfer_location_id: payload.transferLocationId || null, p_unit_cost: payload.unitCost || null, p_metadata: payload.metadata || {} });
    if (error) throw error;
    return this.getProduct(payload.productId);
  }

  async listMovements(filters: { productId?: string; branchId?: string; type?: InventoryMovementType } = {}) {
    let query: any = this.branchScope(this.scope(supabaseAdmin.from('inventory_movements').select('*')), filters.branchId);
    if (filters.productId) query = query.eq('product_id', filters.productId);
    if (filters.type) query = query.eq('type', filters.type);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async listCategories() {
    const { data, error } = await this.scope(supabaseAdmin.from('inventory_categories').select('*')).order('name');
    if (error) throw error;
    return data || [];
  }

  async listLocations(branchId?: string) {
    let query: any = this.scope(supabaseAdmin.from('inventory_locations').select('*'));
    query = this.branchScope(query, branchId);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
  }
}
