/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Fab,
  Alert,
  Skeleton,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Icon } from '@iconify/react';
import { RepairStatus, type RepairOrder } from '@/types/repair';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import RepairOrderForm from '@/components/repairs/RepairOrderForm';
import RepairOrderDetails from '@/components/repairs/RepairOrderDetails';
import RepairStatusStepper, { getNextRepairStatus } from '@/components/repairs/RepairStatusStepper';
import { useRepairOrders } from '@/hooks/useRepairOrders';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import RepairReceiptDialog from '@/components/repairs/RepairReceiptDialog';
import { formatWhatsAppPhoneNumber, normalizePhoneNumber } from '@/utils/phone';

const canNotifyRepairOwner = (order: RepairOrder) =>
  order.status.toLowerCase() === RepairStatus.REPAIRED &&
  !order.deliveredAt &&
  normalizePhoneNumber(order.clientPhone || '').length >= 10;

const openRepairReadyWhatsApp = (order: RepairOrder) => {
  const phone = formatWhatsAppPhoneNumber(order.clientPhone || '');
  if (phone.length < 10 || typeof window === 'undefined') return;

  const trackingUrl = order.trackingUrl || `${window.location.origin}/track/${encodeURIComponent(order.folio)}`;
  const message = [
    `Hola, ${order.clientName}.`,
    '',
    `Te informamos que tu aparato ${order.deviceBrand} ${order.deviceType}${order.deviceModel ? ` ${order.deviceModel}` : ''}, con folio ${order.folio}, ya fue reparado y está listo para recogerlo en nuestro taller.`,
    '',
    'Te pedimos pasar a recogerlo a la brevedad.',
    '',
    'Por favor responde “Confirmo” para confirmar que recibiste este aviso.',
    '',
    `Puedes consultar el estatus aquí: ${trackingUrl}`,
  ].join('\n');

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending_diagnosis':
      return 'warning';
    case 'diagnosis_confirmed':
      return 'info';
    case 'repair_accepted':
    case 'in_repair':
      return 'primary';
    case 'repaired':
    case 'delivered':
    case 'completed':
      return 'success';
    case 'repair_rejected':
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending_diagnosis':
      return 'Pendiente Diagnóstico';
    case 'diagnosis_confirmed':
      return 'Diagnóstico Confirmado';
    case 'repair_accepted':
      return 'Reparación Aceptada';
    case 'in_repair':
      return 'En Reparación';
    case 'repaired':
      return 'Reparado';
    case 'delivered':
      return 'Entregado';
    case 'completed':
      return 'Completado';
    case 'repair_rejected':
      return 'Reparación Rechazada';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Pago mixto',
};

const isRepairPaid = (order: RepairOrder) => order.paymentStatus === 'paid' || Boolean(order.payment);

function RepairActionsMenu({
  row,
  onView,
  onEdit,
  onNext,
  onNotify,
  onCharge,
  onDelete,
}: {
  row: RepairOrder;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onNext: (id: string) => void;
  onNotify: (order: RepairOrder) => void;
  onCharge: (order: RepairOrder) => void;
  onDelete: (id: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const close = () => setAnchorEl(null);
  const run = (action: () => void) => { close(); action(); };

  return <>
    <IconButton size="small" aria-label={`Acciones de ${row.folio}`} onClick={(event) => setAnchorEl(event.currentTarget)}>
      <Icon icon="eva:more-vertical-fill" width={20} />
    </IconButton>
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
      <MenuItem onClick={() => run(() => onView(row.id))}>
        <ListItemIcon><Icon icon="eva:eye-outline" width={20} /></ListItemIcon>
        <ListItemText>Ver detalles</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => run(() => onEdit(row.id))}>
        <ListItemIcon><Icon icon="eva:edit-outline" width={20} /></ListItemIcon>
        <ListItemText>Editar orden</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => run(() => onNext(row.id))}>
        <ListItemIcon><Icon icon="eva:arrow-forward-outline" width={20} color="primary" /></ListItemIcon>
        <ListItemText>Siguiente paso</ListItemText>
      </MenuItem>
      {canNotifyRepairOwner(row) && <MenuItem onClick={() => run(() => onNotify(row))}>
        <ListItemIcon><Icon icon="logos:whatsapp-icon" width={20} /></ListItemIcon>
        <ListItemText>Avisar por WhatsApp</ListItemText>
      </MenuItem>}
      {row.status.toLowerCase() === RepairStatus.REPAIRED && <MenuItem onClick={() => run(() => onCharge(row))}>
        <ListItemIcon><Icon icon="eva:credit-card-outline" width={20} color="success" /></ListItemIcon>
        <ListItemText>Cobrar reparación</ListItemText>
      </MenuItem>}
      <MenuItem onClick={() => run(() => onDelete(row.id))} sx={{ color: 'error.main' }}>
        <ListItemIcon><Icon icon="eva:trash-2-outline" width={20} color="error" /></ListItemIcon>
        <ListItemText>Eliminar orden</ListItemText>
      </MenuItem>
    </Menu>
  </>;
}

export default function RepairsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const [visibleViewportHeight, setVisibleViewportHeight] = useState<number | null>(null);
  
  const [openForm, setOpenForm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<RepairOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState('');

  const { organizationId } = useAuth();
  const { orders, loading, error, fetchOrders, deleteOrder, updateOrderStatus, updateOrderInList, clearError } = useRepairOrders();

  // Safari/iOS cambia visualViewport al mostrar u ocultar la barra inferior.
  // Usamos esa altura real para que el modal no quede debajo del navegador.
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') {
      setVisibleViewportHeight(null);
      return;
    }

    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      setVisibleViewportHeight(Math.round(viewport?.height || window.innerHeight));
    };

    updateViewportHeight();
    viewport?.addEventListener('resize', updateViewportHeight);
    viewport?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      viewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, [isMobile]);

  useEffect(() => {
    fetchOrders();
  }, []); // Solo ejecutar una vez al montar el componente

  const handleViewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setOpenDetails(true);
    }
  };

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setOpenForm(true);
    }
  };

  const handleChargeRepair = (order: RepairOrder) => {
    window.location.href = `/sales?mode=repairs&repair=${encodeURIComponent(order.folio)}`;
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedOrder(null);
  };

  const handleSaveOrder = async (savedOrder: RepairOrder) => {
    try {
      const shouldOpenReceipt = !selectedOrder;
      handleCloseForm();
      await fetchOrders();
      if (shouldOpenReceipt) {
        setReceiptOrder(savedOrder);
        setOpenReceipt(true);
      }
    } catch (error) {
      console.error('Error al guardar orden:', error);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setOpenDeleteDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;

    setDeleting(true);
    try {
      await deleteOrder(selectedOrder.id);
      setOpenDeleteDialog(false);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (error) {
      console.error('Error al eliminar orden:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false);
    setSelectedOrder(null);
  };

  const handleChangeStatus = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setNewStatus(getNextRepairStatus(order.status));
      setStatusNote('');
      setStatusUpdateError('');
      setOpenStatusDialog(true);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdatingStatus(true);
    setStatusUpdateError('');
    try {
      await updateOrderStatus(selectedOrder.id, newStatus, statusNote || undefined);
      setOpenStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
      await fetchOrders();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      setStatusUpdateError(error instanceof Error ? error.message : 'No se pudo actualizar el estado de la orden');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelStatusChange = () => {
    setOpenStatusDialog(false);
    setSelectedOrder(null);
    setNewStatus('');
    setStatusNote('');
    setStatusUpdateError('');
  };

  // Estadísticas
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => 
    ['pending_diagnosis', 'diagnosis_confirmed'].includes(o.status.toLowerCase())
  ).length;
  const inRepairOrders = orders.filter(o => o.status.toLowerCase() === 'in_repair').length;
  const completedOrders = orders.filter(o => o.status.toLowerCase() === RepairStatus.COMPLETED).length;
  const [searchTerm, setSearchTerm] = useState('');
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => [
      order.folio,
      order.clientName,
      order.clientPhone,
      order.clientEmail,
      order.deviceType,
      order.deviceBrand,
      order.deviceModel,
      order.deviceSerial,
      order.deviceDescription,
      order.problemDescription,
      order.status,
      getStatusLabel(order.status),
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [orders, searchTerm]);

  // Columnas para móvil (información esencial con todas las acciones)
  const mobileColumns = [
    {
      field: 'folio',
      headerName: 'Orden',
      flex: 1,
      minWidth: 120,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Chip
            label={getStatusLabel(params.row.status)}
            color={getStatusColor(params.row.status) as any}
            size="small"
            variant="outlined"
            sx={{ mt: 0.5 }}
          />
          {isRepairPaid(params.row) && <Chip label="Pagado" color="success" size="small" sx={{ mt: 0.5, ml: 0.5 }} />}
        </Box>
      )
    },
    {
      field: 'clientName',
      headerName: 'Cliente y aparato',
      flex: 2,
      minWidth: 200,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium" noWrap>
            <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>Cliente:</Box>
            {params.row.clientName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>Aparato:</Box>
            {params.row.deviceBrand} {params.row.deviceType}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>Ingreso:</Box>
            {format(new Date(params.row.createdAt), 'dd/MM/yyyy', { locale: es })}
          </Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 84,
      sortable: false,
      renderCell: (params: any) => <RepairActionsMenu row={params.row} onView={handleViewOrder} onEdit={handleEditOrder} onNext={handleChangeStatus} onNotify={openRepairReadyWhatsApp} onCharge={handleChargeRepair} onDelete={handleDeleteOrder} />
    }
  ];

  // Columnas para tablet
  const tabletColumns = [
    {
      field: 'folio',
      headerName: 'Folio',
      width: 100,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'clientName',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 150,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium" noWrap>
            {params.row.clientName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.clientPhone}
          </Typography>
        </Box>
      )
    },
    {
      field: 'deviceType',
      headerName: 'Aparato',
      flex: 1,
      minWidth: 150,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium" noWrap>
            {params.row.deviceBrand}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.deviceType}
          </Typography>
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={getStatusLabel(params.value)}
            color={getStatusColor(params.value) as any}
            size="small"
            variant="outlined"
          />
          {isRepairPaid(params.row) && <Chip label="Pagado" color="success" size="small" />}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 84,
      sortable: false,
      renderCell: (params: any) => <RepairActionsMenu row={params.row} onView={handleViewOrder} onEdit={handleEditOrder} onNext={handleChangeStatus} onNotify={openRepairReadyWhatsApp} onCharge={handleChargeRepair} onDelete={handleDeleteOrder} />
    }
  ];

  // Columnas para desktop (columnas completas)
  const desktopColumns = [
    {
      field: 'folio',
      headerName: 'Folio',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'clientName',
      headerName: 'Cliente',
      width: 200,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.clientName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.clientPhone}
          </Typography>
        </Box>
      )
    },
    {
      field: 'deviceType',
      headerName: 'Aparato',
      width: 250,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.deviceBrand} {params.row.deviceModel || ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.deviceType}
          </Typography>
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 180,
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={getStatusLabel(params.value)}
            color={getStatusColor(params.value) as any}
            size="small"
            variant="outlined"
          />
          {isRepairPaid(params.row) && <Chip label="Pagado" color="success" size="small" />}
        </Box>
      )
    },
    {
      field: 'payment',
      headerName: 'Pago',
      width: 150,
      renderCell: (params: any) => params.row.payment ? (
        <Box>
          <Typography variant="body2" fontWeight={600}>{`$${Number(params.row.payment.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</Typography>
          <Typography variant="caption" color="text.secondary">{paymentMethodLabel[params.row.payment.paymentMethod] || params.row.payment.paymentMethod}</Typography>
        </Box>
      ) : <Typography variant="body2" color="text.secondary">Pendiente</Typography>
    },
    {
      field: 'totalCost',
      headerName: 'Costo',
      width: 100,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value ? `$${params.value.toLocaleString()}` : 'N/A'}
        </Typography>
      )
    },
    {
      field: 'createdAt',
      headerName: 'Fecha Ingreso',
      width: 120,
      renderCell: (params: any) => (
        <Typography variant="caption">
          {format(new Date(params.value), 'dd/MM/yyyy', { locale: es })}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 84,
      sortable: false,
      renderCell: (params: any) => <RepairActionsMenu row={params.row} onView={handleViewOrder} onEdit={handleEditOrder} onNext={handleChangeStatus} onNotify={openRepairReadyWhatsApp} onCharge={handleChargeRepair} onDelete={handleDeleteOrder} />
    }
  ];

  // Seleccionar columnas según el tamaño de pantalla
  const columns = isMobile ? mobileColumns : isTablet ? tabletColumns : desktopColumns;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: 4,
          gap: { xs: 2, sm: 0 }
        }}>
          <Box>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              gutterBottom
            >
              Reparaciones
            </Typography>
            <Typography 
              variant={isMobile ? "caption" : "body2"} 
              color="text.secondary"
            >
              Gestión de órdenes de reparación de electrodomésticos
            </Typography>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Total de Órdenes"
              value={totalOrders.toString()}
              icon={<Icon icon="eva:file-text-outline" width={24} />}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Pendientes"
              value={pendingOrders.toString()}
              icon={<Icon icon="eva:clock-outline" width={24} />}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="En Reparación"
              value={inRepairOrders.toString()}
              icon={<Icon icon="eva:settings-outline" width={24} />}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Completadas"
              value={completedOrders.toString()}
              icon={<Icon icon="eva:checkmark-circle-outline" width={24} />}
              color="success"
            />
          </Grid>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="h6">
                  Órdenes de Reparación ({filteredOrders.length})
                </Typography>
                {searchTerm && <Typography variant="caption" color="text.secondary">Mostrando coincidencias de {orders.length} órdenes</Typography>}
              </Box>
              <TextField
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                size="small"
                fullWidth
                placeholder="Buscar por folio, cliente, teléfono o aparato"
                aria-label="Buscar órdenes de reparación"
                sx={{ maxWidth: { sm: 390 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="eva:search-outline" width={19} /></InputAdornment> }}
              />
            </Box>
            
            {loading ? (
              <Box>
                {[...Array(5)].map((_, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={60} />
                  </Box>
                ))}
              </Box>
            ) : orders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Icon icon="eva:file-text-outline" width={64} height={64} color="text.secondary" />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  No hay órdenes de reparación
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea tu primera orden de reparación
                </Typography>
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Icon icon="eva:search-outline" width={56} height={56} color="text.secondary" />
                <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                  No encontramos órdenes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prueba con otro folio, cliente, teléfono o aparato.
                </Typography>
                <Button variant="text" onClick={() => setSearchTerm('')} sx={{ mt: 1 }}>
                  Limpiar búsqueda
                </Button>
              </Box>
            ) : (
              <DataTable
                rows={filteredOrders}
                columns={columns}
                getRowId={(row) => row.id}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: isMobile ? 5 : 10,
                    },
                  },
                }}
                pageSizeOptions={isMobile ? [5, 10] : [5, 10, 25]}
                checkboxSelection={false}
                autoHeight={isMobile}
                sx={{
                  '& .MuiDataGrid-root': {
                    border: 'none',
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 4px' : '16px',
                    whiteSpace: 'normal',
                    lineHeight: 1.35,
                    alignItems: 'center',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: 600,
                  },
                }}
                getRowHeight={() => 'auto'}
              />
            )}
          </CardContent>
        </Card>

        {/* Floating Action Button */}
        <Tooltip title={!organizationId ? "Necesitas una organización asignada para crear órdenes" : "Nueva Orden de Reparación"} placement="left">
          <span>
            <Fab
              color="primary"
              aria-label="nueva reparación"
              onClick={handleCreateOrder}
              size={isMobile ? "medium" : "large"}
              disabled={!organizationId}
                sx={{
                position: 'fixed',
                bottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : 24,
                right: isMobile ? 16 : 24,
                zIndex: theme.zIndex.speedDial,
                ...( !organizationId && {
                  bgcolor: 'action.disabledBackground',
                  color: 'text.disabled',
                })
              }}
            >
              <Icon icon="eva:plus-outline" width={isMobile ? 20 : 24} />
            </Fab>
          </span>
        </Tooltip>

        {/* Repair Order Form Dialog */}
        <Dialog
          open={openForm}
          onClose={handleCloseForm}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "lg"}
          fullWidth={!isMobile}
          PaperProps={{
            sx: { 
              borderRadius: isMobile ? 0 : 2,
              height: isMobile ? (visibleViewportHeight ? `${visibleViewportHeight}px` : '100dvh') : undefined,
              maxHeight: isMobile ? (visibleViewportHeight ? `${visibleViewportHeight}px` : '100dvh') : '92vh',
              minHeight: isMobile ? (visibleViewportHeight ? `${visibleViewportHeight}px` : '100dvh') : undefined,
              m: isMobile ? 0 : 1
            }
          }}
          scroll="paper"
        >
          <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 1 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:plus-circle-outline" width={24} />
                <Box>
                  <Typography variant="h6">
                  {selectedOrder ? 'Editar Orden de Reparación' : 'Nueva Orden de Reparación'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completa la información por secciones para registrar la orden.
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleCloseForm} size="small">
                <Icon icon="eva:close-outline" width={20} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', sm: 2 }, bgcolor: 'background.default' }}>
            <RepairOrderForm
              order={selectedOrder}
              onSave={handleSaveOrder}
              onCancel={handleCloseForm}
              loading={loading}
            />
          </DialogContent>
        </Dialog>

        {/* Repair Order Details Dialog */}
        <RepairOrderDetails
          order={selectedOrder}
          open={openDetails}
          onClose={() => {
            setOpenDetails(false);
            setSelectedOrder(null);
          }}
          onOrderUpdate={(updatedOrder) => {
            // Actualizar la orden en el estado local
            updateOrderInList(updatedOrder);
            // Actualizar la orden seleccionada también
            setSelectedOrder(updatedOrder);
          }}
          onPrintReceipt={(order) => {
            setReceiptOrder(order);
            setOpenReceipt(true);
          }}
        />

        <RepairReceiptDialog
          order={receiptOrder}
          open={openReceipt}
          onClose={() => {
            setOpenReceipt(false);
            setReceiptOrder(null);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={handleCancelDelete}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "sm"}
          fullWidth={!isMobile}
        >
          <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'error.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:alert-triangle-outline" width={24} color="error" />
              <Typography variant="h6">
                Confirmar Eliminación
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              ¿Estás seguro de que deseas eliminar la orden de reparación <strong>{selectedOrder?.folio}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esta acción eliminará permanentemente:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Los datos de la orden de reparación
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Todas las imágenes asociadas
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta acción no se puede deshacer
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
            <Button
              onClick={handleCancelDelete}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? undefined : <Icon icon="eva:trash-2-outline" />}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Change Dialog */}
        <Dialog
          open={openStatusDialog}
          onClose={handleCancelStatusChange}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "md"}
          fullWidth={!isMobile}
        >
          <DialogTitle component="div" sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:arrow-forward-outline" width={24} />
              <Typography variant="h6">
                Avanzar estado de la orden
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Orden: <strong>{selectedOrder?.folio}</strong> - {selectedOrder?.clientName}
            </Typography>
            
            {selectedOrder && (
              <RepairStatusStepper currentStatus={selectedOrder.status} isMobile={isMobile} />
            )}

            {newStatus ? (
              <Alert
                severity={newStatus === RepairStatus.REPAIR_REJECTED ? 'warning' : (newStatus === RepairStatus.COMPLETED && selectedOrder && !isRepairPaid(selectedOrder) ? 'warning' : 'info')}
                sx={{ mb: 3 }}
                icon={<Icon icon={newStatus === RepairStatus.REPAIR_REJECTED ? 'eva:alert-triangle-outline' : 'eva:arrow-forward-outline'} />}
              >
                {newStatus === RepairStatus.REPAIR_REJECTED
                  ? <>Rechazo seleccionado. <strong>{getStatusLabel(newStatus)}</strong></>
                  : newStatus === RepairStatus.COMPLETED && selectedOrder && !isRepairPaid(selectedOrder)
                    ? <>Primero registra el pago total de la reparación para habilitar <strong>Completado</strong>.</>
                    : <>Siguiente paso: <strong>{getStatusLabel(newStatus)}</strong></>}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 3 }}>
                Esta orden ya está en el último paso del proceso.
              </Alert>
            )}

            {statusUpdateError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {statusUpdateError}
              </Alert>
            )}

            {selectedOrder?.status === RepairStatus.DIAGNOSIS_CONFIRMED && (
              <Button
                color="error"
                variant={newStatus === RepairStatus.REPAIR_REJECTED ? 'contained' : 'text'}
                size="small"
                onClick={() => setNewStatus(RepairStatus.REPAIR_REJECTED)}
                disabled={updatingStatus}
                startIcon={<Icon icon="eva:close-circle-outline" />}
                sx={{ mb: 2 }}
              >
                {newStatus === RepairStatus.REPAIR_REJECTED ? 'Rechazo seleccionado' : 'Marcar reparación como rechazada'}
              </Button>
            )}

            <TextField
              fullWidth
              label="Notas (opcional)"
              multiline
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              disabled={updatingStatus}
              placeholder="Agregar notas sobre el cambio de estado..."
            />
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
            <Button
              onClick={handleCancelStatusChange}
              disabled={updatingStatus}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              color={newStatus === RepairStatus.REPAIR_REJECTED ? 'error' : 'primary'}
              variant="contained"
              disabled={updatingStatus || !newStatus || (newStatus === RepairStatus.COMPLETED && Boolean(selectedOrder && !isRepairPaid(selectedOrder)))}
              startIcon={updatingStatus ? undefined : <Icon icon="eva:checkmark-outline" />}
            >
              {updatingStatus
                ? 'Actualizando...'
                : newStatus === RepairStatus.REPAIR_REJECTED
                  ? 'Confirmar rechazo'
                  : newStatus
                    ? `Avanzar a ${getStatusLabel(newStatus)}`
                    : 'Proceso completado'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
