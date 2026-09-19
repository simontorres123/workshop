"use client";

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';

type RepairPart = { id: string; name: string; sku?: string; quantity: number; unitPrice: number; unitCost: number; status: string };
type RepairBilling = { id: string; folio: string; branchId: string; clientName: string; clientPhone?: string; device: string; completedAt?: string; laborCost: number; partsCost: number; estimatedTotal: number; parts: RepairPart[]; existingSale?: { saleNumber: string; total: number } | null };

const money = (value: number) => `$${Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Pago mixto' };

export default function RepairCollectionPanel({ taxRate, onSaleCreated }: { taxRate: number; onSaleCreated: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [repairs, setRepairs] = useState<RepairBilling[]>([]);
  const [selected, setSelected] = useState<RepairBilling | null>(null);
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRepairs = async (value = query) => {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch(`/api/sales/repairs${value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ''}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar las reparaciones');
      setRepairs(json.data || []);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudieron cargar las reparaciones' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { const initial = new URLSearchParams(window.location.search).get('repair') || ''; setQuery(initial); void loadRepairs(initial); }, []);
  useEffect(() => { if (selected) { setFinalAmount(String(selected.estimatedTotal)); setAmountPaid(''); setPaymentMethod('cash'); } }, [selected]);

  const partsTotal = selected?.parts.reduce((sum, part) => sum + part.unitPrice * part.quantity, 0) || 0;
  const estimatedTotal = selected?.estimatedTotal || 0;
  const total = Math.max(0, Number(finalAmount || estimatedTotal));
  const adjustedLabor = Math.max(0, total - partsTotal);
  const saleSubtotal = adjustedLabor + partsTotal;
  const discount = Math.max(0, saleSubtotal - total);
  const tax = taxRate > 0 ? total - total / (1 + taxRate) : 0;
  const netValue = total - tax;
  const received = paymentMethod === 'cash' ? Number(amountPaid || total) : total;
  const change = Math.max(0, received - total);
  const showCashFields = paymentMethod === 'cash';
  const selectedAvailable = selected && !selected.existingSale;
  const canCharge = Boolean(selectedAvailable && selected?.branchId && total >= 0 && Number.isFinite(total));

  const chargeRepair = async () => {
    if (!selected || !canCharge) return;
    setSaving(true); setMessage(null);
    try {
      const items = [{ type: 'service', productName: 'Servicio de reparación', quantity: 1, unitPrice: adjustedLabor, unitCost: 0 }, ...selected.parts.map(part => ({ type: 'repair_part', productName: part.name, sku: part.sku, quantity: part.quantity, unitPrice: part.unitPrice, unitCost: part.unitCost }))];
      const response = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: selected.branchId, repairId: selected.id, clientName: selected.clientName, clientPhone: selected.clientPhone, discount, paymentMethod, amountPaid: received, items }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cobrar la reparación');
      setMessage({ type: 'success', text: `Cobro ${json.data.sale_number} registrado correctamente.` }); setSelected(null); await Promise.all([loadRepairs(), onSaleCreated()]);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo cobrar la reparación' }); }
    finally { setSaving(false); }
  };

  const searchHint = useMemo(() => repairs.length ? `${repairs.length} reparación${repairs.length === 1 ? '' : 'es'} lista${repairs.length === 1 ? '' : 's'} para cobrar` : 'No hay reparaciones reparadas pendientes de cobro', [repairs.length]);
  return <Stack spacing={2}>
    {message && <Alert severity={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}
    <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField fullWidth size="small" label="Buscar reparación" placeholder="Folio, cliente o teléfono" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void loadRepairs(); }} InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="eva:search-outline" /></InputAdornment> }} /><Button variant="contained" onClick={() => void loadRepairs()} disabled={loading} startIcon={<Icon icon="eva:search-outline" />}>Buscar</Button></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{searchHint}</Typography></CardContent></Card>
    <Grid container spacing={2}>{repairs.map(repair => <Grid key={repair.id} size={{ xs: 12, md: 6 }}><Card variant="outlined" sx={{ height: '100%', borderColor: selected?.id === repair.id ? 'primary.main' : 'divider' }}><CardContent><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={800}>{repair.folio}</Typography><Typography variant="body2">{repair.clientName}</Typography><Typography variant="body2" color="text.secondary">{repair.device}</Typography></Box><Chip size="small" color={repair.existingSale ? 'success' : 'warning'} label={repair.existingSale ? 'Cobro registrado' : 'Lista para cobrar'} /></Stack><Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}><Typography color="text.secondary">Total estimado</Typography><Typography fontWeight={800}>{money(repair.estimatedTotal)}</Typography></Stack><Button fullWidth sx={{ mt: 1.5 }} variant={selected?.id === repair.id ? 'contained' : 'outlined'} disabled={Boolean(repair.existingSale)} onClick={() => setSelected(repair)}>{repair.existingSale ? `Cobrado ${money(repair.existingSale.total)}` : 'Revisar y cobrar'}</Button></CardContent></Card></Grid>)}</Grid>
    {selected && <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography variant="h6" fontWeight={800}>Cobro de reparación {selected.folio}</Typography><Typography color="text.secondary">{selected.clientName} · {selected.device}</Typography></Box><Button onClick={() => setSelected(null)}>Cerrar</Button></Stack><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Conceptos</Typography><Stack spacing={1} sx={{ mt: 1 }}><Stack direction="row" justifyContent="space-between"><Typography>Servicio de reparación</Typography><Typography>{money(adjustedLabor)}</Typography></Stack>{selected.parts.map(part => <Stack key={part.id} direction="row" justifyContent="space-between" gap={2}><Typography sx={{ minWidth: 0 }}>{part.quantity} × {part.name}</Typography><Typography>{money(part.quantity * part.unitPrice)}</Typography></Stack>)}</Stack><Divider sx={{ my: 2 }} /><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Importe final" type="number" value={finalAmount} onChange={event => setFinalAmount(event.target.value)} helperText="Puedes ajustar el total antes de cobrar." InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid><Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth size="small"><InputLabel>Método de pago</InputLabel><Select label="Método de pago" value={paymentMethod} onChange={event => { setPaymentMethod(event.target.value); if (event.target.value !== 'cash') setAmountPaid(''); }}>{Object.entries(paymentLabel).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl></Grid>{showCashFields && <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Recibido" type="number" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} helperText={`Cambio: ${money(change)}`} /></Grid>}</Grid><Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}><Stack spacing={.75}><Stack direction="row" justifyContent="space-between"><Typography>Valor de productos</Typography><Typography>{money(netValue)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>Descuento o ajuste</Typography><Typography color="error.main">-{money(discount)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography>IVA</Typography><Typography>{money(tax)}</Typography></Stack><Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography variant="h6">Total a cobrar</Typography><Typography variant="h6" color="primary.main">{money(total)}</Typography></Stack></Stack></Box><Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} onClick={chargeRepair} disabled={saving || !canCharge}>{saving ? 'Registrando cobro…' : 'Cobrar reparación'}</Button></CardContent></Card>}
  </Stack>;
}
