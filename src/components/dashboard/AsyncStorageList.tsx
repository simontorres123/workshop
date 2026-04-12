import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { ListSkeleton } from '@/components/ui/SkeletonLoader';
import { Icon } from '@iconify/react';

interface StorageItem {
  id: string;
  folio: string;
  clientName: string;
  deviceType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

const AsyncStorageList: React.FC = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStorageItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [response] = await Promise.all([
          fetch('/api/repair-orders?status=repaired&excludeDelivered=true'),
          new Promise(resolve => setTimeout(resolve, 300)) // Delay mínimo
        ]);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setItems(data.data.slice(0, 5)); // Solo primeros 5 para el dashboard
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching storage items:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchStorageItems();
  }, []);

  if (loading) {
    return <ListSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Artículos en Almacén
          </Typography>
          <Alert severity="error">
            Error al cargar artículos: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Artículos en Almacén
          </Typography>
          <Chip label={`${items.length} artículos`} color="primary" size="small" />
        </Box>
        
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Icon icon="eva:archive-outline" width={48} height={48} style={{ opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No hay artículos en almacén
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {items.map((item, index) => (
              <ListItem 
                key={item.id} 
                divider={index < items.length - 1}
                sx={{ px: 0 }}
              >
                <ListItemIcon>
                  <Icon icon="eva:archive-outline" width={24} />
                </ListItemIcon>
                <ListItemText
                  primary={`${item.folio} - ${item.clientName}`}
                  secondary={item.deviceType}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.completedAt 
                      ? new Date(item.completedAt).toLocaleDateString('es-ES')
                      : 'Fecha no disponible'
                    }
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default AsyncStorageList;