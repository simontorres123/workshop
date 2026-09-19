import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { supabaseAdmin } from '@/lib/supabase/client';
import { verifySaleReceiptToken } from '@/lib/sales-receipt-token';

const money = (value: number) => `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Pago mixto' };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const verified = verifySaleReceiptToken(token);
    if (!verified) return NextResponse.json({ error: 'Enlace de comprobante inválido o expirado' }, { status: 404 });
    const { data: sale, error } = await supabaseAdmin.from('workshop_sales').select('*, workshop_sale_items(*)').eq('id', verified.saleId).eq('organization_id', verified.organizationId).single();
    if (error || !sale) return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 });

    const { data: organization } = await supabaseAdmin.from('organizations').select('name, tax_id').eq('id', sale.organization_id).maybeSingle();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const left = 18;
    let y = 20;
    doc.setFillColor(0, 168, 120);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text(organization?.name || 'Workshop', left, y);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('Comprobante de venta', left, y + 8);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(String(sale.sale_number), 192, y, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(new Date(sale.created_at).toLocaleString('es-MX'), 192, y + 7, { align: 'right' });
    y = 52; doc.setTextColor(30, 45, 60); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Datos de la venta', left, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); y += 8;
    doc.text(`Cliente: ${sale.client_name || 'Venta mostrador'}`, left, y);
    if (sale.client_phone) doc.text(`Teléfono: ${sale.client_phone}`, left, y + 6);
    y += sale.client_phone ? 16 : 10;
    doc.setDrawColor(220, 225, 230); doc.line(left, y, 192, y); y += 9;
    doc.setFont('helvetica', 'bold'); doc.text('Concepto', left, y); doc.text('Cant.', 130, y, { align: 'right' }); doc.text('Importe', 192, y, { align: 'right' }); y += 6;
    doc.setFont('helvetica', 'normal');
    for (const item of (sale.workshop_sale_items || [])) {
      const name = String(item.product_name || '').slice(0, 55);
      doc.text(name, left, y); doc.text(String(item.quantity), 130, y, { align: 'right' }); doc.text(money(Number(item.subtotal)), 192, y, { align: 'right' }); y += 6;
      if (item.sku) { doc.setTextColor(100, 115, 130); doc.setFontSize(8); doc.text(`SKU: ${item.sku}`, left, y); doc.setTextColor(30, 45, 60); doc.setFontSize(10); y += 5; }
    }
    y += 4; doc.line(left, y, 192, y); y += 9;
    const rows = [['Valor de productos', money(Number(sale.subtotal) - Number(sale.tax || 0))], ['Descuento', `-${money(Number(sale.discount))}`], ['IVA', money(Number(sale.tax))], ['Total', money(Number(sale.total))]];
    for (const [label, value] of rows) { doc.setFont('helvetica', label === 'Total' ? 'bold' : 'normal'); doc.text(label, 125, y, { align: 'right' }); doc.text(value, 192, y, { align: 'right' }); y += 7; }
    doc.setFont('helvetica', 'normal'); doc.text(`Método de pago: ${paymentLabel[sale.payment_method] || sale.payment_method}`, left, y + 8); doc.text(`Importe recibido: ${money(Number(sale.amount_paid))}`, left, y + 15); if (Number(sale.change_amount) > 0) doc.text(`Cambio: ${money(Number(sale.change_amount))}`, left, y + 22);
    doc.setFontSize(8); doc.setTextColor(100, 115, 130); doc.text('Comprobante interno de venta. No sustituye una factura fiscal.', left, 276);
    const pdf = doc.output('arraybuffer');
    return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="comprobante-${sale.sale_number}.pdf"`, 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    console.error('Error generando comprobante PDF:', error);
    return NextResponse.json({ error: 'No se pudo generar el comprobante' }, { status: 500 });
  }
}
