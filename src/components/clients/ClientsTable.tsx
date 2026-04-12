"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Client } from '@/types/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onViewHistory: (client: Client) => void;
  loading?: boolean;
}

export default function ClientsTable({ 
  clients, 
  onEdit, 
  onDelete, 
  onViewHistory,
  loading = false 
}: ClientsTableProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClient(null);
  };

  const handleEdit = () => {
    if (selectedClient) {
      onEdit(selectedClient);
      handleMenuClose();
    }
  };

  const handleViewHistory = () => {
    if (selectedClient) {
      onViewHistory(selectedClient);
      handleMenuClose();
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedClient) {
      onDelete(selectedClient.id);
      setDeleteDialog(false);
      setSelectedClient(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setSelectedClient(null);
  };

  if (clients.length === 0 && !loading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Icon icon="eva:people-outline" width={64} height={64} color="text.secondary" />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          No hay clientes registrados
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Agrega tu primer cliente para comenzar
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Fecha Registro</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {client.fullName}
                  </Typography>
                  {client.notes && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {client.notes.length > 50 
                        ? `${client.notes.substring(0, 50)}...` 
                        : client.notes
                      }
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{client.phone}</Typography>
                  {client.address && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {client.address.length > 30 
                        ? `${client.address.substring(0, 30)}...` 
                        : client.address
                      }
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {client.email ? (
                    <Chip
                      label={client.email}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Sin email
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: es })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {format(new Date(client.createdAt), 'HH:mm', { locale: es })}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, client)}
                    size="small"
                  >
                    <Icon icon="eva:more-vertical-fill" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Menu de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewHistory}>
          <ListItemIcon>
            <Icon icon="eva:clock-outline" width={20} />
          </ListItemIcon>
          <ListItemText>Ver historial</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Icon icon="eva:edit-outline" width={20} />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Icon icon="eva:trash-2-outline" width={20} color="error.main" />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar a {selectedClient?.fullName}?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}