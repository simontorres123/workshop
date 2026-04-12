import { supabase } from '@/lib/supabase/client';
import { 
  InventoryItem, 
  CreateInventoryItemRequest, 
  UpdateInventoryItemRequest, 
  InventorySearchFilters 
} from '@/types/inventory';
import { Database } from '@/types/supabase';
import { useAuthStore } from '@/store/auth.store';

type DBInventory = Database['public']['Tables']['inventory']['Row'];

export class SupabaseInventoryRepository {
  /**
   * Obtiene todo el inventario de la organización
   */
  async findAll(): Promise<InventoryItem[]> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map(db => this.mapToLocal(db));
    } catch (error) {
      console.error('Error getting all inventory from Supabase:', error);
      return [];
    }
  }

  /**
   * Crear item de inventario vinculado a Org y Branch
   */
  async create(data: CreateInventoryItemRequest): Promise<InventoryItem | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      const branchId = useAuthStore.getState().getBranchId();
      if (!orgId) throw new Error('Usuario sin organización');

      const { data: newItem, error } = await supabase
        .from('inventory')
        .insert([{
          name: data.name,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory,
          brand: data.brand,
          model: data.model,
          sku: data.sku,
          barcode: data.barcode,
          quantity: data.quantity,
          min_stock: data.minStock,
          max_stock: data.maxStock,
          location: data.location,
          cost_price: data.costPrice,
          sale_price: data.salePrice,
          wholesale_price: data.wholesalePrice,
          condition: data.condition || 'new',
          supplier_id: data.supplierId,
          supplier_name: data.supplierName,
          supplier_contact: data.supplierContact,
          warranty_months: data.warrantyMonths,
          service_type: data.serviceType || 'both',
          notes: data.notes,
          organization_id: orgId,
          branch_id: branchId
        }])
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocal(newItem);
    } catch (error) {
      console.error('Error creating inventory item in Supabase:', error);
      return null;
    }
  }

  async findById(id: string): Promise<InventoryItem | null> {
    const orgId = useAuthStore.getState().getOrganizationId();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (error || !data) return null;
    return this.mapToLocal(data);
  }

  async update(id: string, updates: UpdateInventoryItemRequest): Promise<InventoryItem | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      const supabaseUpdates: Database['public']['Tables']['inventory']['Update'] = {};
      
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.category) supabaseUpdates.category = updates.category;
      if (updates.sku) supabaseUpdates.sku = updates.sku;
      if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
      if (updates.salePrice !== undefined) supabaseUpdates.sale_price = updates.salePrice;
      if (updates.status) supabaseUpdates.status = updates.status;

      const { data, error } = await supabase
        .from('inventory')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocal(data);
    } catch (error) {
      console.error(`Error updating inventory item ${id} in Supabase:`, error);
      return null;
    }
  }

  async search(filters: InventorySearchFilters): Promise<InventoryItem[]> {
    const orgId = useAuthStore.getState().getOrganizationId();
    if (!orgId) return [];

    let query = supabase.from('inventory').select('*').eq('organization_id', orgId);
    
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    if (filters.category) query = query.eq('category', filters.category);
    if ((filters as any).branchId) query = query.eq('branch_id', (filters as any).branchId);
    
    const sortCol = filters.sortBy === 'quantity' ? 'quantity' : 
                   filters.sortBy === 'salePrice' ? 'sale_price' : 'name';
    
    query = query.order(sortCol, { ascending: filters.sortOrder !== 'desc' });
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(db => this.mapToLocal(db));
  }

  async updateStock(id: string, quantityChange: number): Promise<boolean> {
    try {
      // Nota: RPC debe manejar internamente la validación de organización por seguridad
      const { error } = await supabase.rpc('increment_inventory_stock', {
        item_id: id,
        quantity_change: quantityChange
      });
      return !error;
    } catch (error) {
      console.error('Error updating stock in Supabase:', error);
      return false;
    }
  }

  private mapToLocal(db: DBInventory): InventoryItem {
    return {
      id: db.id,
      type: 'inventory',
      name: db.name,
      description: db.description || undefined,
      category: db.category,
      subcategory: db.subcategory || undefined,
      brand: db.brand || undefined,
      model: db.model || undefined,
      sku: db.sku || undefined,
      barcode: db.barcode || undefined,
      quantity: db.quantity,
      minStock: db.min_stock,
      maxStock: db.max_stock || undefined,
      location: db.location || undefined,
      costPrice: Number(db.cost_price) || undefined,
      salePrice: Number(db.sale_price) || undefined,
      wholesalePrice: Number(db.wholesale_price) || undefined,
      status: db.status as any,
      condition: db.condition as any,
      supplierId: db.supplier_id || undefined,
      supplierName: db.supplier_name || undefined,
      supplierContact: db.supplier_contact || undefined,
      warrantyMonths: db.warranty_months || undefined,
      serviceType: db.service_type as any,
      lastRestockDate: db.last_restock_date ? new Date(db.last_restock_date) : undefined,
      expiryDate: db.expiry_date ? new Date(db.expiry_date) : undefined,
      images: db.images as string[] || [],
      notes: db.notes || undefined,
      createdAt: new Date(db.created_at || ''),
      updatedAt: new Date(db.updated_at || ''),
      createdBy: db.created_by || undefined
    };
  }
}
