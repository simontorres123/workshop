import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Icon } from '@iconify/react';

type SaleItem = { product_name: string; sku?: string; quantity: number; unit_price: number; subtotal: number };
type Sale = { sale_number: string; client_name?: string; client_phone?: string; subtotal: number; discount: number; tax: number; total: number; amount_paid: number; change_amount: number; payment_method: string; status: string; created_at: string; workshop_sale_items?: SaleItem[] };

const money = (value: number) => `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Pago mixto' };

type Props = {
  sale: Sale | null;
  branchName?: string;
  onClose: () => void;
  onWhatsApp: () => void;
};

export function SaleReceiptDialog({ sale, branchName, onClose, onWhatsApp }: Props) {
  const itemCount = sale?.workshop_sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const netValue = Math.max(0, (sale?.total || 0) - (sale?.tax || 0));
  const statusLabel = sale?.status === 'paid' ? 'Pagada' : sale?.status === 'cancelled' ? 'Cancelada' : 'Pendiente';
  const statusColor = sale?.status === 'paid' ? 'success' : sale?.status === 'cancelled' ? 'error' : 'warning';
  const printReceipt = () => {
    const previousTitle = document.title;
    if (sale) document.title = `Comprobante ${sale.sale_number}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 500);
  };

  return <Dialog open={Boolean(sale)} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="sale-receipt-title" PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 }, overflow: 'hidden' } }}>
    <DialogTitle component="div" sx={{ p: 0 }}>
      <Box className="sale-receipt-print" sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2.5, sm: 3.5 }, pb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.18)' }}><Icon icon="eva:shopping-bag-outline" width={24} /></Box>
              <Box><Typography variant="h5" component="h2" fontWeight={800}>Workshop</Typography><Typography variant="body2" sx={{ opacity: .82 }}>Comprobante de venta</Typography></Box>
            </Stack>
          </Box>
          {sale && <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}><Typography variant="overline" sx={{ opacity: .82 }}>Folio</Typography><Typography variant="h5" fontWeight={800}>{sale.sale_number}</Typography><Typography variant="body2" sx={{ opacity: .82 }}>{new Date(sale.created_at).toLocaleString('es-MX')}</Typography></Box>}
        </Stack>
      </Box>
    </DialogTitle>
    <DialogContent dividers sx={{ p: 0 }}>
      {sale && <Box className="sale-receipt-print" sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2, sm: 3 } }}>
        {sale.status === 'cancelled' && <Alert severity="error" sx={{ mb: 2 }}>Esta venta está cancelada. Las existencias fueron devueltas al inventario.</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2.5 }}>
          <Box><Typography variant="overline" color="text.secondary">Cliente</Typography><Typography fontWeight={700}>{sale.client_name || 'Venta mostrador'}</Typography>{sale.client_phone && <Typography variant="body2" color="text.secondary">{sale.client_phone}</Typography>}</Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}><Typography variant="overline" color="text.secondary">Sucursal</Typography><Typography fontWeight={700}>{branchName || 'Sucursal no especificada'}</Typography><Chip size="small" color={statusColor} variant="outlined" label={statusLabel} sx={{ mt: .5 }} /></Box>
        </Stack>
        <Divider />
        <Box sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 500, mt: 1 }}><TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>Concepto</TableCell><TableCell sx={{ fontWeight: 800 }}>SKU</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Cant.</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Precio</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Importe</TableCell></TableRow></TableHead><TableBody>{sale.workshop_sale_items?.map((item, index) => <TableRow key={`${item.sku || item.product_name}-${index}`}><TableCell>{item.product_name}</TableCell><TableCell color="text.secondary">{item.sku || '—'}</TableCell><TableCell align="right">{item.quantity}</TableCell><TableCell align="right">{money(item.unit_price)}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{money(item.subtotal)}</TableCell></TableRow>)}</TableBody></Table></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={3} sx={{ mt: 3 }}>
          <Box sx={{ flex: 1 }}><Typography variant="overline" color="text.secondary">Resumen de pago</Typography><Typography variant="body2">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'} · {paymentLabel[sale.payment_method] || sale.payment_method}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Gracias por tu compra.</Typography></Box>
          <Stack spacing={.75} sx={{ width: { xs: '100%', sm: 280 } }}><Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Subtotal</Typography><Typography>{money(sale.subtotal)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Descuento</Typography><Typography color="error.main">-{money(sale.discount)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Valor de productos</Typography><Typography>{money(netValue)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">IVA</Typography><Typography>{money(sale.tax)}</Typography></Stack><Divider /><Stack direction="row" justifyContent="space-between"><Typography variant="h6" fontWeight={800}>Total</Typography><Typography variant="h6" color="primary.main" fontWeight={800}>{money(sale.total)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Importe recibido</Typography><Typography variant="body2">{money(sale.amount_paid)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Cambio</Typography><Typography variant="body2">{money(sale.change_amount)}</Typography></Stack></Stack>
        </Stack>
        <Box sx={{ mt: 3, p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50' }}><Typography variant="caption" color="text.secondary">Este documento es un comprobante interno de venta. Para solicitar una factura fiscal, consulta con el taller.</Typography></Box>
      </Box>}
    </DialogContent>
    <DialogActions className="sale-receipt-actions" sx={{ flexWrap: 'wrap', gap: 1, px: { xs: 2, sm: 4 }, py: 2 }}><Button onClick={onWhatsApp} startIcon={<Icon icon="logos:whatsapp-icon" />}>Enviar por WhatsApp</Button><Button variant="outlined" onClick={printReceipt} startIcon={<Icon icon="eva:printer-outline" />}>Imprimir</Button><Button variant="contained" onClick={onClose}>Cerrar</Button></DialogActions>
    <style>{`@page { margin: 0; } @media print { body * { visibility: hidden !important; } .sale-receipt-print, .sale-receipt-print * { visibility: visible !important; } .sale-receipt-print { position: static !important; width: 100% !important; } .sale-receipt-actions, .MuiDialogTitle-root, .MuiDialogContent-root { overflow: visible !important; } .MuiDialog-container, .MuiDialog-paper, .MuiDialogContent-root { padding: 0 !important; margin: 0 !important; max-width: none !important; box-shadow: none !important; } }`}</style>
  </Dialog>;
}
