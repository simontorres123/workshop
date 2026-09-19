import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { InventoryRepository } from '@/repositories/inventory.repository';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await getTenantContext(request); if (!c) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  try {
    const b = await request.json(); const branchId = b.branchId || c.branchId; const quantity = Number(b.quantity);
    if (!branchId) return NextResponse.json({ success: false, error: 'branchId es obligatorio' }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 0) return NextResponse.json({ success: false, error: 'quantity debe ser entero no negativo' }, { status: 400 });
    const type = b.operation === 'add' ? 'in' : b.operation === 'subtract' ? 'out' : 'adjustment';
    const repository = new InventoryRepository(c);
    const product = await repository.getProduct((await params).id);
    if (!product) return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 });
    if (type === 'out' && quantity > Number(product.stock || 0)) {
      return NextResponse.json({ success: false, error: `No puedes retirar ${quantity} unidades; solo hay ${product.stock} disponibles` }, { status: 400 });
    }
    const data = await repository.applyMovement({ productId: (await params).id, branchId, locationId: b.locationId, type, quantity, reason: b.reason || 'manual_adjustment', reference: b.reference, metadata: { operation: b.operation || 'set' } });
    return NextResponse.json({ success: true, data });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error actualizando existencias' }, { status: 400 }); }
}
