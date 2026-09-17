"use client";

import React, { useEffect, useState } from 'react';
import {
  MenuItem,
  Box,
  CircularProgress,
  FormControl,
  Select,
  SelectChangeEvent,
  alpha,
  useMediaQuery,
  useTheme,
  IconButton,
  Popover,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase/client';

export default function BranchSelector() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { profile, activeBranchId, setActiveBranchId } = useAuthStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const userRole = profile?.role;
  const showSelector = userRole === 'org_admin' || userRole === 'super_admin';

  useEffect(() => {
    if (showSelector && profile?.organization_id) {
      loadBranches();
    }
  }, [profile, showSelector]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('organization_id', profile!.organization_id!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      console.error('Error loading branches for selector:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setActiveBranchId(value === 'all' ? null : value);
  };

  const handleMobileSelect = (value: string) => {
    setActiveBranchId(value === 'all' ? null : value);
    setAnchorEl(null);
  };

  if (!showSelector) return null;

  const activeName = activeBranchId
    ? branches.find(b => b.id === activeBranchId)?.name || 'Sucursal'
    : 'Todas';

  // Mobile: icon button + popover
  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: 'text.primary' }}
          aria-label="Seleccionar sucursal"
        >
          <Icon icon="eva:pin-outline" width={22} />
        </IconButton>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ py: 1, minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
              Sucursal activa
            </Typography>
            <List dense disablePadding>
              <ListItemButton
                selected={!activeBranchId}
                onClick={() => handleMobileSelect('all')}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Icon icon="eva:globe-outline" width={18} />
                </ListItemIcon>
                <ListItemText primary="Todas las sucursales" primaryTypographyProps={{ variant: 'body2', fontWeight: !activeBranchId ? 'bold' : 'normal' }} />
              </ListItemButton>
              {branches.map((branch) => (
                <ListItemButton
                  key={branch.id}
                  selected={activeBranchId === branch.id}
                  onClick={() => handleMobileSelect(branch.id)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Icon icon="eva:pin-outline" width={18} />
                  </ListItemIcon>
                  <ListItemText primary={branch.name} primaryTypographyProps={{ variant: 'body2', fontWeight: activeBranchId === branch.id ? 'bold' : 'normal' }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Popover>
      </>
    );
  }

  // Desktop/tablet: inline select
  return (
    <Box sx={{ minWidth: 180, maxWidth: 240, ml: 2 }}>
      <FormControl size="small" fullWidth sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.15),
          },
          '&.Mui-focused': {
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
          }
        }
      }}>
        <Select
          value={activeBranchId || 'all'}
          onChange={handleChange}
          displayEmpty
          startAdornment={
            <Icon
              icon="eva:pin-outline"
              width={20}
              style={{ marginRight: 8, color: 'inherit', opacity: 0.7 }}
            />
          }
          sx={{
            color: 'text.primary',
            height: 40,
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              py: 1
            }
          }}
        >
          <MenuItem value="all">
            <strong>Todas las sucursales</strong>
          </MenuItem>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Box>
  );
}
