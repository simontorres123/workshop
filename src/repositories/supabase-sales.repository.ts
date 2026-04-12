import { supabase } from '@/lib/supabase/client';
import { Sale, CreateSaleRequest, PaymentMethod } from '@/types/sale';
import { Product, ProductCategory, ProductStatus } from '@/types/product';
import { Database } from '@/types/supabase';
import { useAuthStore } from '@/store/auth.store';

type DBSale = Database['public']['Tables']['sales']['Row'];
type DBSaleItem = Database['public']['Tables']['sale_items']['Row'];
type DBInventory = Database['public']['Tables']['inventory']['Row'];

type DBSaleWithItems = DBSale & { 
  sale_items: (DBSaleItem & { inventory: DBInventory | null })[] 
};

export class SupabaseSalesRepository {
  /**
   * Obtiene todas las ventas de la organización
   */
  async findAll(): Promise<Sale[]> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(*, inventory(*))
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const salesData = (data as unknown) as DBSaleWithItems[];
      return (salesData || []).map(sale => this.mapToLocal(sale));
    } catch (error) {
      console.error('Error getting all sales from Supabase:', error);
      return [];
    }
  }

  /**
   * Crear venta vinculada a la Org actual
   */
  async create(data: CreateSaleRequest): Promise<Sale | null> {
    try {
      const orgId = useAuthStore.getState().getOrganizationId();
      const branchId = useAuthStore.getState().getBranchId();
      if (!orgId) throw new Error('Usuario sin organización');

      const saleNumber = `VTA-${Date.now().toString().slice(-8)}`;
      const subtotal = data.items.reduce((acc, item) => acc + (item.unitPrice || 0) * item.quantity, 0);
      const total = subtotal - (data.discount || 0);

      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          organization_id: orgId,
          branch_id: branchId,
          client_id: data.clientId,
          client_name: data.clientName,
          subtotal: subtotal,
          discount: data.discount || 0,
          total: total,
          payment_method: data.paymentMethod,
          amount_paid: data.amountPaid,
          change_amount: data.amountPaid - total,
          notes: data.notes
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const itemsToInsert = data.items.map(item => ({
        sale_id: newSale.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice || 0,
        discount: item.discount || 0,
        subtotal: (item.unitPrice || 0) * item.quantity - (item.discount || 0)
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Actualizar stock
      for (const item of data.items) {
        await supabase.rpc('increment_inventory_stock', {
          item_id: item.productId,
          quantity_change: -item.quantity
        });
      }

      return await this.findById(newSale.id);
    } catch (error) {
      console.error('Error creating sale in Supabase:', error);
      return null;
    }
  }

  async findById(id: string): Promise<Sale | null> {
    const orgId = useAuthStore.getState().getOrganizationId();
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, inventory(*))')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) return null;
    
    const saleData = (data as unknown) as DBSaleWithItems;
    return this.mapToLocal(saleData);
  }

  private mapToLocal(db: DBSaleWithItems): Sale {
    return {
      _id: db.id,
      saleNumber: db.sale_number,
      items: (db.sale_items || []).map(item => ({
        product: item.inventory ? this.mapInventoryToLocal(item.inventory) : ({} as Product),
        productId: item.product_id || '',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        discount: Number(item.discount)
      })),
      subtotal: Number(db.subtotal),
      discount: Number(db.discount),
      tax: Number(db.tax || 0),
      total: Number(db.total),
      paymentMethod: db.payment_method as PaymentMethod,
      amountPaid: Number(db.amount_paid),
      change: Number(db.change_amount),
      clientId: db.client_id || undefined,
      clientName: db.client_name || undefined,
      notes: db.notes || undefined,
      createdAt: new Date(db.created_at || ''),
      updatedAt: new Date(db.updated_at || ''),
      createdBy: db.created_by || undefined
    };
  }

  private mapInventoryToLocal(db: DBInventory): Product {
    return {
      _id: db.id,
      name: db.name,
      description: db.description || '',
      brand: db.brand || '',
      model: db.model || '',
      category: (db.category as ProductCategory) || ProductCategory.OTHER,
      price: Number(db.sale_price) || 0,
      cost: Number(db.cost_price) || 0,
      stock: db.quantity || 0,
      lowStockThreshold: db.min_stock || 0,
      location: db.location || '',
      status: (db.status as ProductStatus) || ProductStatus.ACTIVE,
      isActive: db.status === 'active',
      images: [],
      createdAt: new Date(db.created_at || ''),
      updatedAt: new Date(db.updated_at || '')
    };
  }
}
