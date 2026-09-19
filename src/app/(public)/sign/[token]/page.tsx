"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import DigitalSignature, { DigitalSignatureData } from '@/components/ui/DigitalSignature';

type SigningOrder = {
  id: string;
  folio: string;
  client_name: string;
  device_type: string;
  device_brand: string;
  device_model?: string;
  device_serial?: string;
  device_description: string;
  warranty_period_months?: number;
  storage_period_months?: number;
  created_at: string;
  signature: DigitalSignatureData | null;
};

export default function SignRepairReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('');
  const [order, setOrder] = useState<SigningOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { params.then(({ token: value }) => setToken(value)); }, [params]);
  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/repair-signatures/${token}`).then(async response => {
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Enlace inválido');
      setOrder(json.data);
    }).catch(error => setMessage({ severity: 'error', text: error.message })).finally(() => setLoading(false));
  }, [token]);

  const handleSignature = async (signature: DigitalSignatureData) => {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/public/repair-signatures/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signature) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la firma');
      setOrder(current => current ? { ...current, signature: json.data } : current);
      setMessage({ severity: 'success', text: 'Firma guardada. El taller ya puede consultar tu comprobante firmado.' });
    } catch (error) { setMessage({ severity: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar la firma' }); }
    finally { setSaving(false); }
  };

  if (loading) return <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;
  if (!order) return <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="error">{message?.text || 'No se encontró el comprobante.'}</Alert></Container>;

  return <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 5 } }}>
    <Stack spacing={2.5}>
      <Box sx={{ textAlign: 'center' }}><Icon icon="eva:file-text-outline" width={42} color="#00a878" /><Typography variant="h5" fontWeight={800}>Firma de comprobante</Typography><Typography color="text.secondary">Orden {order.folio}</Typography></Box>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      <Card variant="outlined"><CardContent><Typography variant="h6" fontWeight={800} gutterBottom>Confirma la recepción de tu aparato</Typography><Divider sx={{ mb: 2 }} /><Stack spacing={1}><Typography><strong>Cliente:</strong> {order.client_name}</Typography><Typography><strong>Aparato:</strong> {[order.device_type, order.device_brand, order.device_model].filter(Boolean).join(' ')}</Typography><Typography><strong>Descripción:</strong> {order.device_description}</Typography><Typography><strong>Garantía:</strong> {order.warranty_period_months || 3} meses</Typography><Typography><strong>Resguardo:</strong> {order.storage_period_months || 1} mes(es)</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Al firmar confirmas que entregaste el aparato descrito para diagnóstico y/o reparación y aceptas los términos indicados por el taller.</Typography></CardContent></Card>
      {order.signature ? <Card variant="outlined"><CardContent><Alert severity="success" sx={{ mb: 2 }}>Este comprobante ya fue firmado por {order.signature.signerName}.</Alert><Box component="img" src={order.signature.signatureDataURL} alt="Firma digital del cliente" sx={{ maxWidth: '100%', height: 150, objectFit: 'contain', display: 'block', mx: 'auto' }} /></CardContent></Card> : <DigitalSignature signerName={order.client_name} signerRole="client" required disabled={saving} width={Math.min(typeof window === 'undefined' ? 400 : window.innerWidth - 64, 520)} height={190} onSignature={handleSignature} />}
      <Button href={`/track/${encodeURIComponent(order.folio)}`} variant="outlined" startIcon={<Icon icon="eva:search-outline" />}>Consultar estado de la reparación</Button>
    </Stack>
  </Container>;
}
