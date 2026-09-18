"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Icon } from '@iconify/react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RepairOrder } from '@/types/repair';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase/client';

interface RepairReceiptDialogProps {
  order: RepairOrder | null;
  open: boolean;
  onClose: () => void;
}

const field = (label: string, value?: string | number | null) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
      {value || 'No especificado'}
    </Typography>
  </Box>
);

function ReceiptCopy({
  order,
  qr,
  kind,
  workshopName,
  branchName,
}: {
  order: RepairOrder;
  qr: string;
  kind: 'cliente' | 'taller';
  workshopName: string;
  branchName: string;
}) {
  const receivedAt = order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }) : 'No especificada';

  return (
    <Paper className="repair-receipt-copy" elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: '.1em' }}>
            {kind === 'cliente' ? 'Copia del cliente' : 'Copia del taller'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{workshopName}</Typography>
          <Typography variant="body2" color="text.secondary">{branchName} · Comprobante de recepción</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
          {qr ? <Box component="img" src={qr} alt={`Código QR de seguimiento ${order.folio}`} sx={{ width: 88, height: 88, display: 'block' }} /> : <Box sx={{ width: 88, height: 88 }} />}
          <Typography variant="caption" color="text.secondary">Escanea para consultar</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.50', borderRadius: 1.5, px: 1.5, py: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Folio</Typography>
        <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{order.folio}</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {field('Cliente', order.clientName)}
        {field('Teléfono', order.clientPhone)}
        {field('Fecha de recepción', receivedAt)}
        {field('Aparato', `${order.deviceType} ${order.deviceBrand}`)}
        {field('Modelo', order.deviceModel)}
        {field('Serie', order.deviceSerial)}
        {field('Descripción', order.deviceDescription)}
        {field('Garantía', `${order.warrantyPeriodMonths || 3} meses`)}
        {field('Resguardo', `${order.storagePeriodMonths || 1} mes(es)`)}
      </Box>

      {kind === 'cliente' && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: .75 }}>Términos y condiciones</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            El cliente confirma la entrega del aparato descrito para diagnóstico y/o reparación. La garantía indicada aplica a la reparación realizada y comienza a partir de la entrega del equipo reparado. El aparato permanecerá en resguardo durante el periodo indicado después de ser notificado que está listo. El cliente deberá conservar este folio para consultar el avance y recoger su equipo.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 4 }}>
            <Box sx={{ borderTop: '1px solid', borderColor: 'text.primary', pt: .75 }}><Typography variant="caption">Firma del cliente</Typography></Box>
            <Box sx={{ borderTop: '1px solid', borderColor: 'text.primary', pt: .75 }}><Typography variant="caption">Firma del taller</Typography></Box>
          </Box>
        </Box>
      )}

      {kind === 'taller' && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: .75 }}>Control interno</Typography>
          {field('Problema reportado', order.problemDescription)}
        </Box>
      )}
    </Paper>
  );
}

export default function RepairReceiptDialog({ order, open, onClose }: RepairReceiptDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const profile = useAuthStore(state => state.profile);
  const [qr, setQr] = useState('');
  const [branchName, setBranchName] = useState('Sucursal');
  const [workshopName, setWorkshopName] = useState('Taller de reparaciones');

  const trackingUrl = useMemo(() => {
    if (!order) return '';
    if (order.trackingUrl) return order.trackingUrl;
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/track/${encodeURIComponent(order.folio)}`;
  }, [order]);

  useEffect(() => {
    if (!open || !trackingUrl) return;
    QRCode.toDataURL(trackingUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#15283d', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [open, trackingUrl]);

  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    let active = true;
    const loadNames = async () => {
      const [{ data: organization }, { data: branch }] = await Promise.all([
        supabase.from('organizations').select('name').eq('id', profile.organization_id).maybeSingle(),
        order?.branchId ? supabase.from('branches').select('name').eq('id', order.branchId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (!active) return;
      if (organization?.name) setWorkshopName(organization.name);
      if (branch?.name) setBranchName(branch.name);
    };
    loadNames();
    return () => { active = false; };
  }, [open, order?.branchId, profile?.organization_id]);

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}>
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Comprobante de reparación</Typography>
          <Typography variant="body2" color="text.secondary">{order.folio} · listo para imprimir</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar comprobante"><Icon icon="eva:close-outline" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: 'grey.100', p: { xs: 1.5, sm: 3 } }}>
        {!qr && <Alert severity="warning" sx={{ mb: 2 }}>No se pudo generar el código QR. Verifica que la URL pública esté disponible.</Alert>}
        <Stack spacing={2}>
          <ReceiptCopy order={order} qr={qr} kind="cliente" workshopName={workshopName} branchName={branchName} />
          <Box className="repair-receipt-divider" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <Divider sx={{ flex: 1 }} /><Typography variant="caption">LÍNEA DE CORTE</Typography><Divider sx={{ flex: 1 }} />
          </Box>
          <ReceiptCopy order={order} qr={qr} kind="taller" workshopName={workshopName} branchName={branchName} />
        </Stack>
        <style jsx global>{`
          @media print {
            body * { visibility: hidden !important; }
            .MuiDialog-root, .MuiDialog-root * { visibility: visible !important; }
            .MuiDialog-container { position: static !important; height: auto !important; }
            .MuiDialog-paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; }
            .MuiDialogTitle-root, .MuiDialogActions-root, .repair-receipt-divider { display: none !important; }
            .MuiDialogContent-root { overflow: visible !important; padding: 0 !important; background: white !important; }
            .repair-receipt-copy { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; margin-bottom: 10px !important; }
          }
        `}</style>
      </DialogContent>
      <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
        <Button onClick={() => window.print()} variant="contained" startIcon={<Icon icon="eva:printer-outline" />}>Imprimir</Button>
      </DialogActions>
    </Dialog>
  );
}
