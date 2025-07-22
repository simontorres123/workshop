import React from 'react';
import { repairService } from '@/services/repair.service'; // Asumiendo que el servicio está implementado
import { RepairOrder } from '@/types';
import { Container, Typography, Box, Paper, Chip, Button } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';

// Mock del servicio mientras no esté conectado a la BD
const mockRepairService = {
  getRepairOrderByFolio: async (folio: string): Promise<RepairOrder | null> => {
    if (folio === 'RP-2311-0001') {
      return {
        _id: '123',
        folio,
        client: { name: 'Juan Pérez', phone: '5512345678' },
        appliance: { type: 'Lavadora', brand: 'Samsung', initialDescription: 'No enciende' },
        initialImage: { url: 'https://via.placeholder.com/300', blobName: 'initial.jpg', container: 'repairs' },
        status: 'IN_REPAIR',
        notesForClient: 'Estamos esperando que llegue la pieza de recambio. Estará lista la próxima semana.',
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }
};

interface TrackPageProps {
  params: {
    folio: string;
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  // const repairOrder = await repairService.getRepairOrderByFolio(params.folio);
  const repairOrder = await mockRepairService.getRepairOrderByFolio(params.folio);

  if (!repairOrder) {
    return (
      <Container>
        <Typography variant="h4" align="center" sx={{ mt: 5 }}>
          Orden de Reparación no encontrada
        </Typography>
        <Typography align="center">
          El folio &quot;{params.folio}&quot; no corresponde a ninguna orden registrada. Por favor, verifique el folio e intente de nuevo.
        </Typography>
      </Container>
    );
  }

  const { folio, status, appliance, notesForClient, client } = repairOrder;

  const whatsappMessage = `Hola, quisiera saber más sobre mi reparación con folio ${folio}. El estado actual es: ${status}.`;
  const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_TALLER_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

  const emailSubject = `Consulta sobre reparación folio: ${folio}`;
  const mailtoUrl = `mailto:${process.env.NEXT_PUBLIC_TALLER_EMAIL}?subject=${encodeURIComponent(emailSubject)}`;

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Seguimiento de Reparación
          </Typography>
          <Chip label={folio} color="primary" />
        </Box>
        <Typography variant="h6" gutterBottom>
          Estado actual: <Chip label={status.replace(/_/g, ' ')} color="info" />
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Aparato:</strong> {appliance.type} {appliance.brand}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          <strong>Problema reportado:</strong> {appliance.initialDescription}
        </Typography>
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6">Notas del Taller:</Typography>
          <Typography variant="body1">{notesForClient}</Typography>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button variant="contained" startIcon={<WhatsAppIcon />} href={whatsappUrl} target="_blank" sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#128C7E' } }}>
            Contactar por WhatsApp
          </Button>
          <Button variant="outlined" startIcon={<EmailIcon />} href={mailtoUrl}>
            Enviar Correo
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
