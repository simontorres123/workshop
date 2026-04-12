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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Icon } from '@iconify/react';
import type { RepairOrder } from '@/types/repair';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import RepairOrderForm from '@/components/repairs/RepairOrderForm';
import RepairOrderDetails from '@/components/repairs/RepairOrderDetails';
import { useRepairOrders } from '@/hooks/useRepairOrders';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending_diagnosis':
      return 'warning';
    case 'diagnosis_confirmed':
      return 'info';
    case 'in_repair':
      return 'primary';
    case 'repaired':
    case 'completed':
      return 'success';
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
    case 'in_repair':
      return 'En Reparación';
    case 'repaired':
      return 'Reparado';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

const statusOptions = [
  { value: 'pending_diagnosis', label: 'Pendiente Diagnóstico', color: 'warning' },
  { value: 'diagnosis_confirmed', label: 'Diagnóstico Confirmado', color: 'info' },
  { value: 'in_repair', label: 'En Reparación', color: 'primary' },
  { value: 'repaired', label: 'Reparado', color: 'success' },
  { value: 'completed', label: 'Completado', color: 'success' },
  { value: 'cancelled', label: 'Cancelado', color: 'error' },
];

export default function RepairsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [openForm, setOpenForm] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const { orders, loading, error, fetchOrders, deleteOrder, updateOrderStatus, updateOrderInList, clearError } = useRepairOrders();

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

  const handleSaveOrder = async (orderData: any) => {
    try {
      // Saving order
      handleCloseForm();
      await fetchOrders();
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
      setNewStatus(order.status);
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
      headerName: 'Cliente & Aparato',
      flex: 2,
      minWidth: 200,
      renderCell: (params: any) => (
        <Box>
          <Typography variant="body2" fontWeight="medium" noWrap>
            {params.row.clientName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.deviceBrand} {params.row.deviceType}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {format(new Date(params.row.createdAt), 'dd/MM/yyyy', { locale: es })}
          </Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: '',
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
            <Tooltip title="Estado" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleChangeStatus(params.row.id)}
                color="primary"
                sx={{ minWidth: 28, minHeight: 28 }}
              >
                <Icon icon="eva:clock-outline" width={16} />
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
          <Tooltip title="Estado" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleChangeStatus(params.row.id)}
              color="primary"
            >
              <Icon icon="eva:clock-outline" />
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
          <Tooltip title="Cambiar estado de la reparación" arrow>
            <IconButton 
              size="small" 
              onClick={() => handleChangeStatus(params.row.id)}
              color="primary"
            >
              <Icon icon="eva:clock-outline" />
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
          <Grid item xs={6} sm={6} md={3}>
            <StatCard
              title="Total de Órdenes"
              value={totalOrders.toString()}
              icon={<Icon icon="eva:file-text-outline" width={24} />}
              color="primary"
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard
              title="Pendientes"
              value={pendingOrders.toString()}
              icon={<Icon icon="eva:clock-outline" width={24} />}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard
              title="En Reparación"
              value={inRepairOrders.toString()}
              icon={<Icon icon="eva:settings-outline" width={24} />}
              color="info"
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
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
                sx={{
                  '& .MuiDataGrid-root': {
                    border: 'none',
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '8px 4px' : '16px',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: 600,
                  },
                  '& .MuiDataGrid-row': {
                    minHeight: isMobile ? '120px !important' : '52px !important',
                  },
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="nueva reparación"
          onClick={handleCreateOrder}
          size={isMobile ? "medium" : "large"}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 16 : 24,
            right: isMobile ? 16 : 24,
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <Icon icon="eva:plus-outline" width={isMobile ? 20 : 24} />
        </Fab>

        {/* Repair Order Form Dialog */}
        <Dialog
          open={openForm}
          onClose={handleCloseForm}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "xl"}
          fullWidth={!isMobile}
          PaperProps={{
            sx: { 
              borderRadius: isMobile ? 0 : 2,
              maxHeight: isMobile ? '100vh' : '95vh',
              minHeight: isMobile ? '100vh' : '80vh',
              m: isMobile ? 0 : 1
            }
          }}
          scroll="body"
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 1 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="eva:plus-circle-outline" width={24} />
                <Typography variant="h6">
                  {selectedOrder ? 'Editar Orden de Reparación' : 'Nueva Orden de Reparación'}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseForm} size="small">
                <Icon icon="eva:close-outline" width={20} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ px: 3, py: 2 }}>
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
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={handleCancelDelete}
          fullScreen={isMobile}
          maxWidth={isMobile ? false : "sm"}
          fullWidth={!isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:alert-triangle-outline" width={24} color="error" />
              <Typography variant="h6">
                Confirmar Eliminación
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
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
          <DialogActions sx={{ px: 3, pb: 3 }}>
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
          maxWidth={isMobile ? false : "sm"}
          fullWidth={!isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="eva:refresh-outline" width={24} />
              <Typography variant="h6">
                Cambiar Estado de la Orden
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Orden: <strong>{selectedOrder?.folio}</strong> - {selectedOrder?.clientName}
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Nuevo Estado</InputLabel>
              <Select
                value={newStatus}
                label="Nuevo Estado"
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updatingStatus}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={option.label}
                        color={option.color as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
          <DialogActions sx={{ px: 3, pb: 3 }}>
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
              {updatingStatus ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}