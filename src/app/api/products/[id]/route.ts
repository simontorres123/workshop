import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { InventoryRepository } from '@/repositories/inventory.repository';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await getTenantContext(request); if (!c) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try { const data = await new InventoryRepository(c).getProduct((await params).id); return data ? NextResponse.json({ success: true, data }) : NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 }); }
  catch { return NextResponse.json({ success: false, error: 'Error obteniendo producto' }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await getTenantContext(request); if (!c) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const b = await request.json();
    const data = await new InventoryRepository(c).updateProduct((await params).id, {
      ...(b.name !== undefined && { name: b.name }), ...(b.description !== undefined && { description: b.description }),
      ...(b.categoryId !== undefined && { category_id: b.categoryId }), ...(b.sku !== undefined && { sku: b.sku }),
      ...(b.barcode !== undefined && { barcode: b.barcode }), ...(b.brand !== undefined && { brand: b.brand }), ...(b.model !== undefined && { model: b.model }),
      ...(b.costPrice !== undefined && { cost_price: b.costPrice }), ...(b.salePrice !== undefined && { sale_price: b.salePrice }),
      ...(b.minStock !== undefined && { min_stock: b.minStock }), ...(b.maxStock !== undefined && { max_stock: b.maxStock }),
      ...(b.status !== undefined && { status: b.status }), ...((b.metadata !== undefined || b.category !== undefined || b.customCategory !== undefined || b.location !== undefined) && { metadata: { ...(b.metadata || {}), ...(b.category ? { category: b.category } : {}), ...(b.customCategory ? { customCategory: b.customCategory } : {}), ...(b.location !== undefined ? { location: b.location } : {}) } }),
    });
    return NextResponse.json({ success: true, data });
  } catch { return NextResponse.json({ success: false, error: 'Error actualizando producto' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await getTenantContext(request); if (!c) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try { const data = await new InventoryRepository(c).updateProduct((await params).id, { status: 'inactive' }); return NextResponse.json({ success: true, data }); }
  catch { return NextResponse.json({ success: false, error: 'Error desactivando producto' }, { status: 500 }); }
}
