import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { InventoryRepository } from '@/repositories/inventory.repository';

export async function GET(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autenticado o sin organización asignada' }, { status: 401 });
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const data = await new InventoryRepository(context).listProducts(params);
    return NextResponse.json({ success: true, data, total: data.length }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error(error); return NextResponse.json({ success: false, error: 'Error obteniendo productos' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const b = await request.json();
    if (!b.name) return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 });
    const repository = new InventoryRepository(context);
    const initialStock = Number(b.stock || 0);
    const branchId = b.branchId || context.branchId;
    await repository.assertBranchAccess(branchId);
    const data = await repository.createProduct({
      name: b.name, description: b.description || null, category_id: b.categoryId || null,
      sku: b.sku || null, barcode: b.barcode || null, brand: b.brand || null, model: b.model || null,
      unit: b.unit || 'unit', cost_price: b.costPrice ?? b.cost ?? 0, sale_price: b.salePrice ?? b.price ?? 0,
      min_stock: b.minStock ?? b.lowStockThreshold ?? 0, max_stock: b.maxStock ?? null,
      status: b.status || (b.isActive === false ? 'inactive' : 'active'), metadata: { ...(b.metadata || {}), ...(b.category ? { category: b.category } : {}), ...(b.customCategory ? { customCategory: b.customCategory } : {}), ...(b.location ? { location: b.location } : {}) },
    });
    if (initialStock > 0 && branchId) {
      await repository.applyMovement({ productId: data.id, branchId, type: 'in', quantity: initialStock, reason: 'initial_stock' });
    }
    return NextResponse.json({ success: true, data: await repository.getProduct(data.id) }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ success: false, error: 'Error creando producto' }, { status: 500 }); }
}
