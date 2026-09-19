"use client";

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/store/auth.store';
import { PRODUCT_CATEGORY_CONFIG, Product } from '@/types/product';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { esES } from '@mui/x-date-pickers/locales';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { SaleReceiptDialog } from '@/components/sales/SaleReceiptDialog';
import RepairCollectionPanel from '@/components/sales/RepairCollectionPanel';

type CartItem = Product & { quantity: number };
type Sale = { id: string; branch_id?: string; sale_number: string; client_name?: string; client_phone?: string; subtotal: number; discount: number; tax: number; total: number; amount_paid: number; change_amount: number; payment_method: string; status: string; created_at: string; workshop_sale_items?: Array<{ product_name: string; sku?: string; quantity: number; unit_price: number; subtotal: number }> };
type SalesReport = { totalSales: number; grossTotal: number; cancelledSales: number; averageTicket: number; byPayment: Record<string, number> };
const money = (value: number) => `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Pago mixto' };
const dateValue = (value: string) => value ? new Date(`${value}T12:00:00`) : null;
const dateString = (value: Date | null) => value ? format(value, 'yyyy-MM-dd') : '';

export default function SalesPage() {
  const { products, loading: productsLoading, fetchProducts } = useProducts();
  const { activeBranchId } = useAuthStore();
  const [branchId, setBranchId] = useState(activeBranchId || '');
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [salePendingCancellation, setSalePendingCancellation] = useState<Sale | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saleTab, setSaleTab] = useState<'new' | 'repairs' | 'history'>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'repairs' ? 'repairs' : 'new');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [repairFolio, setRepairFolio] = useState('');
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState(0.16);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getPeriodParams = () => { const params = new URLSearchParams(); if (dateFrom) params.set('from', `${dateFrom}T00:00:00`); if (dateTo) { const end = new Date(`${dateTo}T00:00:00`); end.setDate(end.getDate() + 1); params.set('to', end.toISOString()); } return params.toString(); };
  const loadSales = async (period = getPeriodParams()) => { const response = await fetch(`/api/sales${period ? `?${period}` : ''}`); const json = await response.json(); if (json.success) setSales(json.data || []); };
  const loadReport = async (period = getPeriodParams()) => { const response = await fetch(`/api/sales/report${period ? `?${period}` : ''}`); const json = await response.json(); if (json.success) setReport(json.data); };
  useEffect(() => {
    fetchProducts({ isActive: true });
    fetch('/api/branches').then(response => response.json()).then(json => { if (json.success) { setBranches(json.data || []); if (!branchId && json.data?.[0]?.id) setBranchId(json.data[0].id); } });
    fetch('/api/system/configuration').then(response => response.json()).then(json => { const configuredRate = Number(json.data?.tax?.rate); if (json.success && json.data?.tax?.enabled !== false && Number.isFinite(configuredRate)) setTaxRate(Math.min(1, Math.max(0, configuredRate))); if (json.success && json.data?.tax?.enabled === false) setTaxRate(0); }).catch(() => undefined);
    void loadSales();
    void loadReport();
  }, [fetchProducts]);
  useEffect(() => { if (activeBranchId) setBranchId(activeBranchId); }, [activeBranchId]);

  const categories = useMemo(() => Array.from(new Set(products.filter(product => product.stock > 0).map(product => product.category))).sort(), [products]);
  const filteredProducts = useMemo(() => { const query = search.trim().toLowerCase(); return products.filter(product => product.stock > 0 && (categoryFilter === 'all' || product.category === categoryFilter) && (!query || [product.name, product.sku, product.brand, product.model].some(value => value?.toLowerCase().includes(query)))).slice(0, 30); }, [products, search, categoryFilter]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discount || 0)));
  const total = Math.max(0, subtotal - discountAmount);
  const tax = taxRate > 0 ? total - total / (1 + taxRate) : 0;
  const productValue = total - tax;
  const change = Math.max(0, Number(amountPaid || 0) - total);
  const getCartQuantity = (productId: string) => cart.find(item => item.id === productId)?.quantity || 0;
  const addToCart = (product: Product) => setCart(current => {
    const availableStock = Math.max(0, Number(product.stock) || 0);
    const existing = current.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= availableStock) return current;
      return current.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, availableStock) } : item);
    }
    return availableStock > 0 ? [...current, { ...product, quantity: 1 }] : current;
  });
  const updateQuantity = (id: string, quantity: number) => setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(Number.isFinite(quantity) ? quantity : 1, Number(item.stock) || 0)) } : item));
  const removeFromCart = (id: string) => setCart(current => current.filter(item => item.id !== id));
  const clearSale = () => { setCart([]); setClientName(''); setClientPhone(''); setRepairFolio(''); setDiscount('0'); setAmountPaid(''); };
  const saveSale = async () => {
    if (!cart.length) return setMessage({ type: 'error', text: 'Agrega al menos un producto.' });
    if (!branchId) return setMessage({ type: 'error', text: 'Selecciona una sucursal.' });
    if (cart.some(item => item.quantity > (Number(item.stock) || 0))) return setMessage({ type: 'error', text: 'La cantidad de un producto supera las existencias disponibles.' });
    setSaving(true); setMessage(null);
    try {
      const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId, clientName, clientPhone, repairFolio, discount: discountAmount, paymentMethod, amountPaid: Number(amountPaid || total), items: cart.map(item => ({ productId: item.id, quantity: item.quantity, unitPrice: item.price })) }) });
      const json = await response.json(); if (!response.ok) throw new Error(json.error || 'No se pudo registrar la venta');
      setMessage({ type: 'success', text: `Venta ${json.data.sale_number} registrada correctamente.` }); clearSale(); await Promise.all([fetchProducts({ isActive: true }), loadSales(), loadReport()]);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo registrar la venta' }); } finally { setSaving(false); }
  };
  const cancelSale = (sale: Sale) => {
    if (sale.status === 'cancelled') return;
    setSalePendingCancellation(sale);
  };
  const confirmCancelSale = async () => {
    const sale = salePendingCancellation;
    if (!sale || sale.status === 'cancelled') return setSalePendingCancellation(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/sales/${sale.id}/cancel`, { method: 'POST' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'No se pudo cancelar la venta');
      setMessage({ type: 'success', text: `Venta ${sale.sale_number} cancelada y existencias devueltas.` });
      await Promise.all([fetchProducts({ isActive: true }), loadSales(), loadReport()]);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cancelar la venta' }); }
    finally { setSalePendingCancellation(null); }
  };
  const sendSaleWhatsApp = (sale: Sale) => {
    if (!sale.client_phone) return setMessage({ type: 'error', text: 'Esta venta no tiene teléfono del cliente.' });
    const digits = sale.client_phone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `52${digits}` : digits;
    const message = `Hola ${sale.client_name || ''}, te compartimos el comprobante de tu venta ${sale.sale_number}. Total: ${money(sale.total)}. Gracias por tu compra.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  const applyPeriod = async () => { const period = getPeriodParams(); await Promise.all([loadSales(period), loadReport(period)]); };
  const clearPeriod = async () => { setDateFrom(''); setDateTo(''); await Promise.all([loadSales(''), loadReport('')]); };

  if (saleTab === 'repairs') return <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es} localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}><Container maxWidth="xl"><Box sx={{ py: 3 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 3 }}><Box><Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>Cobrar reparaciones</Typography><Typography color="text.secondary">Consulta órdenes reparadas, revisa sus conceptos y registra el cobro.</Typography></Box><Button variant="outlined" onClick={() => setSaleTab('new')} startIcon={<Icon icon="eva:arrow-back-outline" />}>Nueva venta</Button></Stack><RepairCollectionPanel taxRate={taxRate} onSaleCreated={async () => { await Promise.all([fetchProducts({ isActive: true }), loadSales(), loadReport()]); }} /></Box></Container></LocalizationProvider>;

  return <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es} localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}><Container maxWidth="xl"><Box sx={{ py: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 3 }}><Box><Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Ventas</Typography><Typography color="text.secondary">Refacciones, materiales y servicios del taller.</Typography></Box><Chip icon={<Icon icon="eva:checkmark-circle-2-outline" />} label="Operación activa" color="success" variant="outlined" /></Stack>
    {message && <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
    <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}><Tabs value={saleTab} onChange={(_, value) => setSaleTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ px: { xs: 0.5, sm: 2 }, '& .MuiTab-root': { minHeight: 56, fontWeight: 700 } }}><Tab value="new" label="Nueva venta" /><Tab value="repairs" label="Cobrar reparaciones" /><Tab value="history" label="Historial de ventas" /></Tabs></Card>
    {saleTab === 'new' ? <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 7 }}><Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>Productos disponibles</Typography><Typography variant="body2" color="text.secondary">Busca y agrega artículos al carrito.</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { md: 390 } }}><TextField size="small" fullWidth value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto o SKU" InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="eva:search-outline" /></InputAdornment> }} /><FormControl size="small" sx={{ minWidth: { sm: 150 } }}><InputLabel>Categoría</InputLabel><Select label="Categoría" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><MenuItem value="all">Todas</MenuItem>{categories.map(category => <MenuItem key={category} value={category}>{PRODUCT_CATEGORY_CONFIG[category as keyof typeof PRODUCT_CATEGORY_CONFIG]?.label || category}</MenuItem>)}</Select></FormControl></Stack></Stack><Grid container spacing={1.5}>{productsLoading ? <Grid size={12}><Typography color="text.secondary">Cargando productos…</Typography></Grid> : filteredProducts.length === 0 ? <Grid size={12}><Alert severity="info">No hay productos con existencias que coincidan con los filtros.</Alert></Grid> : filteredProducts.map(product => { const cartQuantity = getCartQuantity(product.id); const stockLimitReached = cartQuantity >= Number(product.stock); return <Grid key={product.id} size={{ xs: 12, sm: 6 }}><Button fullWidth variant="outlined" disabled={stockLimitReached} onClick={() => addToCart(product)} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', textAlign: 'left', minHeight: { xs: 116, sm: 96 }, py: 1.25, px: 1.5, overflow: 'visible', color: 'text.primary', borderColor: 'divider', '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' }, '&.Mui-disabled': { borderColor: 'divider', color: 'text.disabled' } }}><Box sx={{ minWidth: 0, flex: 1, pr: 1, overflow: 'hidden' }}><Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.35 }}><Icon icon="eva:cube-outline" width={17} color="currentColor" style={{ flexShrink: 0, marginTop: 2 }} /><Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.25, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere' }}>{product.name}</Typography></Stack><Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', lineHeight: 1.2, whiteSpace: 'normal', overflowWrap: 'anywhere', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{product.sku || 'Sin SKU'} · {product.stock} disponibles</Typography><Box sx={{ height: 4, mt: 0.8, borderRadius: 99, bgcolor: 'grey.200', overflow: 'hidden' }}><Box sx={{ width: `${Math.min(100, Math.max(12, product.stock))}%`, height: '100%', bgcolor: 'grey.500' }} /></Box></Box><Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}><Typography fontWeight={800} color="text.primary">{money(product.price)}</Typography><Typography variant="caption" color="text.secondary">{stockLimitReached ? 'Límite alcanzado' : 'Añadir'}</Typography></Stack></Button></Grid>; })}</Grid></CardContent></Card></Grid>
      <Grid size={{ xs: 12, lg: 5 }}><Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Box><Typography variant="h6">Carrito</Typography><Typography variant="body2" color="text.secondary">{cart.length} productos</Typography></Box><Button size="small" onClick={clearSale} disabled={!cart.length}>Limpiar</Button></Stack>{cart.length === 0 ? <Box sx={{ py: 5, textAlign: 'center' }}><Icon icon="eva:shopping-cart-outline" width={48} color="text.secondary" /><Typography color="text.secondary" sx={{ mt: 1 }}>Agrega productos para comenzar.</Typography></Box> : <Stack spacing={1.5}>{cart.map(item => <Box key={item.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" noWrap>{item.name}</Typography><Typography variant="caption" color="text.secondary">{money(item.price)} c/u</Typography></Box><TextField size="small" type="number" value={item.quantity} onChange={event => updateQuantity(item.id, Number(event.target.value))} inputProps={{ min: 1, max: item.stock }} sx={{ width: 72 }} /><Typography sx={{ width: 80, textAlign: 'right' }}>{money(item.price * item.quantity)}</Typography><IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}><Icon icon="eva:trash-2-outline" /></IconButton></Box>)}</Stack>}<Divider sx={{ my: 2 }} /><Stack spacing={1}><TextField size="small" label="Cliente (opcional)" value={clientName} onChange={event => setClientName(event.target.value)} /><TextField size="small" label="Teléfono (opcional)" value={clientPhone} onChange={event => setClientPhone(event.target.value)} /><TextField size="small" label="Folio de reparación (opcional)" value={repairFolio} onChange={event => setRepairFolio(event.target.value)} placeholder="Ej. REP-1234" /><FormControl size="small"><InputLabel>Sucursal</InputLabel><Select label="Sucursal" value={branchId} onChange={event => setBranchId(event.target.value)}>{branches.map(branch => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}</Select></FormControl><FormControl size="small"><InputLabel>Método de pago</InputLabel><Select label="Método de pago" value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value); if (event.target.value !== 'cash') setAmountPaid(''); }}>{Object.entries(paymentLabel).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl><TextField size="small" label="Descuento" type="number" value={discount} onChange={event => setDiscount(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /><TextField size="small" label="Recibido" type="number" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} disabled={paymentMethod !== 'cash'} helperText={paymentMethod === 'cash' ? (amountPaid ? `Cambio: ${money(change)}` : 'Si queda vacío se cobra el total') : 'Solo aplica para pagos en efectivo'} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Stack><Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}><Stack direction="row" justifyContent="space-between"><Typography>Valor de productos</Typography><Typography>{money(productValue)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>Descuento</Typography><Typography>-{money(discountAmount)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>IVA</Typography><Typography>{money(tax)}</Typography></Stack><Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography variant="h6">Total</Typography><Typography variant="h6" color="primary.main">{money(total)}</Typography></Stack></Box><Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} onClick={saveSale} disabled={saving || !cart.length}>{saving ? 'Registrando…' : 'Cobrar venta'}</Button></CardContent></Card></Grid>
    </Grid> : <Stack spacing={2}><Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} flexWrap="wrap"><Box sx={{ width: { xs: '100%', md: 'min(280px, 32%)' }, flex: { md: '1 1 220px' } }}><DatePicker label="Desde" value={dateValue(dateFrom)} onChange={value => setDateFrom(dateString(value))} slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Box><Box sx={{ width: { xs: '100%', md: 'min(280px, 32%)' }, flex: { md: '1 1 220px' } }}><DatePicker label="Hasta" value={dateValue(dateTo)} onChange={value => setDateTo(dateString(value))} slotProps={{ textField: { size: 'small', fullWidth: true } }} /></Box><Button variant="contained" onClick={applyPeriod} startIcon={<Icon icon="eva:search-outline" />} sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>Aplicar</Button><Button onClick={clearPeriod} disabled={!dateFrom && !dateTo} sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>Limpiar</Button></Stack><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Consulta ventas pagadas, pendientes y canceladas dentro del periodo seleccionado.</Typography></CardContent></Card><Grid container spacing={2}>{[['Ventas', report?.totalSales ?? 0], ['Ingresos', money(report?.grossTotal ?? 0)], ['Ticket promedio', money(report?.averageTicket ?? 0)], ['Canceladas', report?.cancelledSales ?? 0]].map(([label, value]) => <Grid key={String(label)} size={{ xs: 6, sm: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ mt: 0.5 }}>{value}</Typography></CardContent></Card></Grid>)}</Grid><Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}><Typography variant="h6">Ventas recientes</Typography><Stack direction="row" spacing={1} flexWrap="wrap">{Object.entries(report?.byPayment || {}).map(([method, amount]) => <Chip key={method} size="small" variant="outlined" label={`${paymentLabel[method] || method}: ${money(amount)}`} />)}</Stack></Stack><TableContainer sx={{ overflowX: 'auto' }}><Table size="small"><TableHead><TableRow><TableCell>Folio</TableCell><TableCell>Cliente</TableCell><TableCell>Productos</TableCell><TableCell>Método</TableCell><TableCell>Estado</TableCell><TableCell align="right">Total</TableCell><TableCell>Fecha</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead><TableBody>{sales.length === 0 ? <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 5 }}>Aún no hay ventas registradas en este periodo.</Typography></TableCell></TableRow> : sales.map(sale => <TableRow key={sale.id} hover><TableCell><Typography fontWeight={700}>{sale.sale_number}</Typography></TableCell><TableCell>{sale.client_name || 'Venta mostrador'}</TableCell><TableCell>{sale.workshop_sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0} uds.</TableCell><TableCell>{paymentLabel[sale.payment_method] || sale.payment_method}</TableCell><TableCell><Chip size="small" label={sale.status === 'paid' ? 'Pagada' : sale.status === 'pending' ? 'Pendiente' : sale.status === 'cancelled' ? 'Cancelada' : sale.status} color={sale.status === 'paid' ? 'success' : sale.status === 'cancelled' ? 'error' : 'warning'} variant="outlined" /></TableCell><TableCell align="right">{money(sale.total)}</TableCell><TableCell>{new Date(sale.created_at).toLocaleDateString('es-MX')}</TableCell><TableCell align="right"><Stack direction="row" justifyContent="flex-end"><IconButton size="small" color="primary" aria-label="Ver comprobante" onClick={() => setSelectedSale(sale)}><Icon icon="eva:file-text-outline" /></IconButton>{sale.status !== 'cancelled' && <IconButton size="small" color="error" aria-label="Cancelar venta" onClick={() => cancelSale(sale)}><Icon icon="eva:close-circle-outline" /></IconButton>}</Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer></CardContent></Card></Stack>}
    <Dialog open={Boolean(salePendingCancellation)} onClose={() => setSalePendingCancellation(null)} fullWidth maxWidth="xs" aria-labelledby="cancel-sale-title"><DialogTitle id="cancel-sale-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Icon icon="eva:alert-triangle-outline" color="error" />Cancelar venta</DialogTitle><DialogContent dividers><Typography>¿Deseas cancelar la venta <strong>{salePendingCancellation?.sale_number}</strong>?</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Se devolverán sus existencias al inventario y la venta quedará marcada como cancelada.</Typography></DialogContent><DialogActions><Button onClick={() => setSalePendingCancellation(null)}>Conservar venta</Button><Button variant="contained" color="error" onClick={confirmCancelSale}>Cancelar venta</Button></DialogActions></Dialog>
    <SaleReceiptDialog sale={selectedSale} branchName={branches.find(branch => branch.id === selectedSale?.branch_id)?.name} onClose={() => setSelectedSale(null)} onWhatsApp={() => selectedSale && sendSaleWhatsApp(selectedSale)} />
    <style>{`@media screen { .MuiFormControl-root:has(input[placeholder="Ej. REP-1234"]) { display: none !important; } }`}</style>
  </Box></Container></LocalizationProvider>;
}
