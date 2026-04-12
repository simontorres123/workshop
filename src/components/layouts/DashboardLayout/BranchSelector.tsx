"use client";

import React, { useEffect, useState } from 'react';
import { 
  MenuItem, 
  TextField, 
  Box, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  alpha
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase/client';

export default function BranchSelector() {
  const { profile, activeBranchId, setActiveBranchId } = useAuthStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!showSelector) return null;

  return (
    <Box sx={{ minWidth: 200, ml: 2 }}>
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
            <strong>Visión Global (Todas)</strong>
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
