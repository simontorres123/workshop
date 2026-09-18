/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
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
  Tooltip,
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
      setOpenStatusDialog(true);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdatingStatus(true);
    try {
      await updateOrderStatus(selectedOrder.id, newStatus, statusNote || undefined);
      setOpenStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
      await fetchOrders();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelStatusChange = () => {
    setOpenStatusDialog(false);
    setSelectedOrder(null);
    setNewStatus('');
    setStatusNote('');
  };

  // Estadísticas
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => 
    ['pending_diagnosis', 'diagnosis_confirmed'].includes(o.status.toLowerCase())
  ).length;
  const inRepairOrders = orders.filter(o => o.status.toLowerCase() === 'in_repair').length;
  const completedOrders = orders.filter(o => 
    ['repaired', 'completed'].includes(o.status.toLowerCase())
  ).length;

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
      width: 140,
      sortable: false,
      renderCell: (params: any) => (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 0.5,
          py: 0.5
        }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Ver" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleViewOrder(params.row.id)}
                sx={{ minWidth: 28, minHeight: 28 }}
              >
                <Icon icon="eva:eye-outline" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleEditOrder(params.row.id)}
                sx={{ minWidth: 28, minHeight: 28 }}
              >
                <Icon icon="eva:edit-outline" width={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Siguiente paso" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleChangeStatus(params.row.id)}
                color="primary"
                sx={{ minWidth: 28, minHeight: 28 }}
              >
                <Icon icon="eva:arrow-forward-outline" width={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleDeleteOrder(params.row.id)}
                color="error"
                sx={{ minWidth: 28, minHeight: 28 }}
              >
                <Icon icon="eva:trash-2-outline" width={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )
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
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value) as any}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Ver detalles" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleViewOrder(params.row.id)}
            >
              <Icon icon="eva:eye-outline" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleEditOrder(params.row.id)}
            >
              <Icon icon="eva:edit-outline" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Siguiente paso" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleChangeStatus(params.row.id)}
              color="primary"
            >
              <Icon icon="eva:arrow-forward-outline" />
            </IconButton>
          </Tooltip>
        </Box>
      )
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
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value) as any}
          size="small"
          variant="outlined"
        />
      )
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
      width: 200,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <Tooltip title="Ver detalles de la orden" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleViewOrder(params.row.id)}
            >
              <Icon icon="eva:eye-outline" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar información de la orden" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleEditOrder(params.row.id)}
            >
              <Icon icon="eva:edit-outline" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Siguiente paso de la reparación" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleChangeStatus(params.row.id)}
              color="primary"
            >
              <Icon icon="eva:arrow-forward-outline" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar orden permanentemente" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleDeleteOrder(params.row.id)}
              color="error"
            >
              <Icon icon="eva:trash-2-outline" />
            </IconButton>
          </Tooltip>
        </Box>
      )
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Órdenes de Reparación ({orders.length})
              </Typography>
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
            ) : (
              <DataTable
                rows={orders}
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
              <Alert severity="info" sx={{ mb: 3 }} icon={<Icon icon="eva:arrow-forward-outline" />}>
                Siguiente paso: <strong>{getStatusLabel(newStatus)}</strong>
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 3 }}>
                Esta orden ya está en el último paso del proceso.
              </Alert>
            )}

            {selectedOrder?.status === RepairStatus.DIAGNOSIS_CONFIRMED && (
              <Button
                color="error"
                variant="text"
                size="small"
                onClick={() => setNewStatus(RepairStatus.REPAIR_REJECTED)}
                disabled={updatingStatus}
                startIcon={<Icon icon="eva:close-circle-outline" />}
                sx={{ mb: 2 }}
              >
                Marcar reparación como rechazada
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
              variant="contained"
              disabled={updatingStatus || !newStatus}
              startIcon={updatingStatus ? undefined : <Icon icon="eva:checkmark-outline" />}
            >
              {updatingStatus ? 'Actualizando...' : newStatus ? `Avanzar a ${getStatusLabel(newStatus)}` : 'Proceso completado'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
