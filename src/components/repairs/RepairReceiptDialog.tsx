"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
  FormControlLabel,
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
import { formatWhatsAppPhoneNumber } from '@/utils/phone';
import type { DigitalSignatureData } from '@/components/ui/DigitalSignature';
import DigitalSignature from '@/components/ui/DigitalSignature';

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
  clientSignature,
}: {
  order: RepairOrder;
  qr: string;
  kind: 'cliente' | 'taller';
  workshopName: string;
  branchName: string;
  clientSignature?: DigitalSignatureData | null;
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
          {clientSignature && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 800 }}>Firma digital del cliente: {clientSignature.signerName}</Typography>
              <Box component="img" src={clientSignature.signatureDataURL} alt="Firma digital del cliente" sx={{ display: 'block', maxWidth: 220, height: 70, objectFit: 'contain', mt: .5 }} />
            </Box>
          )}
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
  const [clientSignature, setClientSignature] = useState<DigitalSignatureData | null>(null);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureMenuAnchor, setSignatureMenuAnchor] = useState<null | HTMLElement>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  useEffect(() => {
    if (!open || !order) return;
    setClientSignature(null);
    setSignatureUrl('');
    fetch(`/api/repairs/${order.id}/signature-link`)
      .then(response => response.json())
      .then(json => {
        if (json.success) {
          setSignatureUrl(json.data.url);
          setClientSignature(json.data.signature || null);
        }
      })
      .catch(() => undefined);
  }, [open, order?.id]);

  const sendSignatureLink = async () => {
    if (!order) return;
    setSignatureLoading(true);
    try {
      const response = await fetch(`/api/repairs/${order.id}/signature-link`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'No se pudo preparar el enlace');
      const url = json.data.url as string;
      setSignatureUrl(url);
      setClientSignature(json.data.signature || null);
      const phone = formatWhatsAppPhoneNumber(order.clientPhone || '');
      if (!phone) throw new Error('La orden no tiene un teléfono válido');
      const message = `Hola ${order.clientName}, te compartimos el comprobante de recepción de tu orden ${order.folio}. Puedes revisarlo y firmarlo desde tu celular en este enlace: ${url}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error enviando enlace de firma:', error);
    } finally { setSignatureLoading(false); }
  };

  const sendReceiptByWhatsApp = async () => {
    if (!order) return;
    setSignatureLoading(true);
    try {
      let url = signatureUrl;
      let signed = Boolean(clientSignature);
      if (!url) {
        const response = await fetch(`/api/repairs/${order.id}/signature-link`);
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || 'No se pudo preparar el comprobante');
        url = json.data.url as string;
        setSignatureUrl(url);
        setClientSignature(json.data.signature || null);
        signed = Boolean(json.data.signature);
      }
      const receiptUrl = url.replace('/sign/', '/receipt/');
      const phone = formatWhatsAppPhoneNumber(order.clientPhone || '');
      if (!phone) throw new Error('La orden no tiene un teléfono válido');
      const statusText = signed ? 'firmado digitalmente' : 'digital';
      const message = `Hola ${order.clientName}, te compartimos tu comprobante ${statusText} de la orden ${order.folio}: ${receiptUrl}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch (error) { console.error('Error enviando comprobante por WhatsApp:', error); }
    finally { setSignatureLoading(false); }
  };

  const openInWorkshopSignature = () => {
    setSignatureMenuAnchor(null);
    setTermsAccepted(false);
    setSignatureDialogOpen(true);
  };

  const saveInWorkshopSignature = async (signature: DigitalSignatureData) => {
    if (!signatureUrl || !termsAccepted) return;
    setSignatureLoading(true);
    try {
      const token = signatureUrl.split('/').filter(Boolean).pop();
      const response = await fetch(`/api/public/repair-signatures/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signature),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la firma');
      setClientSignature(json.data);
      setSignatureDialogOpen(false);
    } catch (error) {
      console.error('Error guardando firma en taller:', error);
    } finally { setSignatureLoading(false); }
  };

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
          <ReceiptCopy order={order} qr={qr} kind="cliente" workshopName={workshopName} branchName={branchName} clientSignature={clientSignature} />
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
      <DialogActions sx={{ borderTop: 1, borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
        <Button onClick={() => void sendReceiptByWhatsApp()} variant="outlined" color="success" disabled={signatureLoading} startIcon={<Icon icon="logos:whatsapp-icon" />} sx={{ flex: { xs: '1 1 100%', sm: 'initial' }, order: { xs: 4, sm: 'initial' } }}>
          Enviar comprobante
        </Button>
        <Button
          onClick={(event) => setSignatureMenuAnchor(event.currentTarget)}
          variant="outlined"
          color="success"
          disabled={signatureLoading}
          startIcon={<Icon icon="eva:edit-outline" />}
          endIcon={<Icon icon="eva:arrow-ios-downward-outline" />}
          sx={{
            minWidth: { xs: 0, sm: 155 },
            flex: { xs: 1, sm: 'initial' },
            px: { xs: 1, sm: 2 },
            whiteSpace: 'nowrap',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': { mx: { xs: 0.25, sm: 0.5 } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Firma digital</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Firmar</Box>
        </Button>
        <Menu anchorEl={signatureMenuAnchor} open={Boolean(signatureMenuAnchor)} onClose={() => setSignatureMenuAnchor(null)}>
          <MenuItem onClick={openInWorkshopSignature} disabled={Boolean(clientSignature)}>
            <Icon icon="eva:edit-2-outline" width={18} style={{ marginRight: 8 }} />
            {clientSignature ? 'Comprobante ya firmado' : 'Firmar ahora en el taller'}
          </MenuItem>
          <MenuItem onClick={() => { setSignatureMenuAnchor(null); void sendSignatureLink(); }}>
            <Icon icon="logos:whatsapp-icon" width={18} style={{ marginRight: 8 }} />
            {clientSignature ? 'Reenviar enlace por WhatsApp' : 'Enviar enlace por WhatsApp'}
          </MenuItem>
        </Menu>
        <Button onClick={() => window.print()} variant="contained" startIcon={<Icon icon="eva:printer-outline" />}>Imprimir</Button>
      </DialogActions>
      <Dialog open={signatureDialogOpen} onClose={() => !signatureLoading && setSignatureDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box><Typography variant="h6" fontWeight={800}>Firmar comprobante en el taller</Typography><Typography variant="body2" color="text.secondary">El cliente debe leer y aceptar los términos antes de firmar.</Typography></Box>
          <IconButton onClick={() => setSignatureDialogOpen(false)} disabled={signatureLoading} aria-label="Cerrar firma"><Icon icon="eva:close-outline" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>Resumen de la orden {order.folio}</Typography>
            <Typography variant="body2"><strong>Cliente:</strong> {order.clientName}</Typography>
            <Typography variant="body2"><strong>Aparato:</strong> {[order.deviceType, order.deviceBrand, order.deviceModel].filter(Boolean).join(' ')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>El cliente confirma la entrega del aparato descrito para diagnóstico y/o reparación. La garantía indicada aplica a la reparación realizada y comienza a partir de la entrega del equipo reparado. El aparato permanecerá en resguardo durante el periodo indicado después de ser notificado que está listo.</Typography>
          </Paper>
          <FormControlLabel control={<Checkbox checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />} label="He leído y acepto los términos y condiciones del comprobante." sx={{ mb: 1 }} />
          <DigitalSignature signerName={order.clientName} signerRole="client" required disabled={!termsAccepted || signatureLoading} width={isMobile ? 320 : 440} height={190} onSignature={saveInWorkshopSignature} />
        </DialogContent>
        <DialogActions><Button onClick={() => setSignatureDialogOpen(false)} disabled={signatureLoading}>Cancelar</Button></DialogActions>
      </Dialog>
    </Dialog>
  );
}
