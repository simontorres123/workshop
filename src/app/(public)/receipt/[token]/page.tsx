"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';

type ReceiptData = {
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
  signature: { signatureDataURL: string; signerName: string; timestamp: string } | null;
};

export default function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ token }) => fetch(`/api/public/repair-signatures/${token}`))
      .then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Comprobante no disponible'); setReceipt(json.data); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Comprobante no disponible'))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;
  if (!receipt) return <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="error">{error}</Alert></Container>;

  return <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 5 } }}>
    <Card variant="outlined"><CardContent sx={{ p: { xs: 2, sm: 4 } }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}><Icon icon="eva:file-text-outline" width={42} color="#00a878" /><Typography variant="h5" fontWeight={800}>Comprobante de recepción</Typography><Typography color="text.secondary">Orden {receipt.folio}</Typography></Box>
      <Stack spacing={1.25}><Typography><strong>Cliente:</strong> {receipt.client_name}</Typography><Typography><strong>Aparato:</strong> {[receipt.device_type, receipt.device_brand, receipt.device_model].filter(Boolean).join(' ')}</Typography><Typography><strong>Número de serie:</strong> {receipt.device_serial || 'No especificado'}</Typography><Typography><strong>Descripción:</strong> {receipt.device_description}</Typography><Typography><strong>Fecha de recepción:</strong> {new Date(receipt.created_at).toLocaleString('es-MX')}</Typography><Typography><strong>Garantía:</strong> {receipt.warranty_period_months || 3} meses</Typography><Typography><strong>Resguardo:</strong> {receipt.storage_period_months || 1} mes(es)</Typography></Stack>
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}><Typography variant="subtitle2" fontWeight={800} gutterBottom>Términos y condiciones</Typography><Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>El cliente confirma la entrega del aparato descrito para diagnóstico y/o reparación. La garantía indicada aplica a la reparación realizada y comienza a partir de la entrega del equipo reparado. El aparato permanecerá en resguardo durante el periodo indicado después de ser notificado que está listo.</Typography></Box>
      <Divider sx={{ my: 3 }} />
      {receipt.signature ? <Box><Alert severity="success" sx={{ mb: 2 }}>Comprobante firmado digitalmente por {receipt.signature.signerName}.</Alert><Box component="img" src={receipt.signature.signatureDataURL} alt="Firma digital del cliente" sx={{ display: 'block', maxWidth: 260, height: 100, objectFit: 'contain', mx: 'auto' }} /><Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>Firmado el {new Date(receipt.signature.timestamp).toLocaleString('es-MX')}</Typography></Box> : <Alert severity="info">Este comprobante aún no cuenta con firma digital.</Alert>}
    </CardContent></Card>
  </Container>;
}
