"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardHeader, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { RepairOrder } from '@/types/repair';
import { useAuth } from '@/hooks/useAuth';

type Technician = { id: string; name: string; role: string };

export default function RepairAssignmentCard({ order, onOrderUpdate }: { order: RepairOrder; onOrderUpdate?: (order: RepairOrder) => void }) {
  const { role } = useAuth();
  const canManage = ['super_admin', 'org_admin', 'branch_admin', 'technician'].includes(role || '');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selected, setSelected] = useState(order.assignedTechnicianId || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setSelected(order.assignedTechnicianId || ''); }, [order.assignedTechnicianId]);
  useEffect(() => {
    if (!canManage || !order.branchId) return;
    setLoading(true);
    fetch(`/api/repairs/technicians?branchId=${encodeURIComponent(order.branchId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || 'No se pudieron cargar los técnicos');
        setTechnicians(body.data || []);
      }).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  }, [canManage, order.branchId]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/repairs/${order.id}/assignment`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ technicianId: selected || null }) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'No se pudo guardar la asignación');
      onOrderUpdate?.({
        ...order,
        assignedTechnicianId: body.data.assignedTechnicianId || undefined,
        assignedTechnicianName: body.data.assignedTechnicianName || undefined,
        assignedAt: body.data.assignedAt ? new Date(body.data.assignedAt) : undefined,
      });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la asignación'); }
    finally { setSaving(false); }
  };

  return <Card variant="outlined">
    <CardHeader avatar={<Icon icon="eva:people-outline" width={21} />} title="Asignación de técnico" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
    <CardContent sx={{ pt: 0 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {canManage ? <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { sm: 'center' } }}>
        <FormControl fullWidth size="small" disabled={loading || saving}>
          <InputLabel id="technician-label">Técnico responsable</InputLabel>
          <Select labelId="technician-label" label="Técnico responsable" value={selected} onChange={event => setSelected(event.target.value)}>
            <MenuItem value=""><em>Sin asignar</em></MenuItem>
            {technicians.map(technician => <MenuItem key={technician.id} value={technician.id}>{technician.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={save} disabled={loading || saving || selected === (order.assignedTechnicianId || '')} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Icon icon="eva:save-outline" />} sx={{ whiteSpace: 'nowrap' }}>
          Guardar
        </Button>
      </Box> : <Typography variant="body2" color={order.assignedTechnicianName ? 'text.primary' : 'text.secondary'}>
        {order.assignedTechnicianName ? `Responsable: ${order.assignedTechnicianName}` : 'Aún no hay un técnico asignado.'}
      </Typography>}
      {canManage && !loading && technicians.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>No hay técnicos asignados a esta sucursal.</Typography>}
    </CardContent>
  </Card>;
}
