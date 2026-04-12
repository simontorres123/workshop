import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Alert,
  Badge,
  Tooltip,
  Divider,
  Button
} from '@mui/material';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { 
  WarrantyAlert, 
  AlertsCalculationResult, 
  getAlertAppearance,
  filterAlertsBySeverity 
} from '@/utils/warrantyAlerts';

interface ExpirationAlertsProps {
  alertsData: AlertsCalculationResult;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function ExpirationAlerts({ 
  alertsData, 
  onRefresh,
  loading = false 
}: ExpirationAlertsProps) {
  const router = useRouter();
  const [expandedWarranty, setExpandedWarranty] = useState(true);
  const [expandedStorage, setExpandedStorage] = useState(true);

  const { warrantyAlerts, storageAlerts, totalAlerts, criticalAlerts } = alertsData;

  const handleOrderClick = (folio: string) => {
    router.push(`/repairs?folio=${folio}`);
  };

  const AlertListItem = ({ alert }: { alert: WarrantyAlert }) => {
    const appearance = getAlertAppearance(alert.type, alert.severity);
    
    return (
      <ListItem
        sx={{
          bgcolor: appearance.bgcolor,
          borderRadius: 1,
          mb: 1,
          border: '1px solid',
          borderColor: `${appearance.color}.light`,
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 2,
            transform: 'translateY(-1px)'
          },
          transition: 'all 0.2s ease'
        }}
        onClick={() => handleOrderClick(alert.folio)}
      >
        <ListItemIcon>
          <Badge
            badgeContent={alert.daysRemaining}
            color={appearance.color}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
                minWidth: 18,
                height: 18
              }
            }}
          >
            <Icon 
              icon={appearance.icon} 
              width={24} 
              color={`${appearance.color}.main`}
            />
          </Badge>
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {alert.folio}
              </Typography>
              <Chip
                label={alert.clientName}
                size="small"
                variant="outlined"
                color={appearance.color}
              />
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {alert.deviceType}
              </Typography>
              <Typography variant="caption" color={`${appearance.color}.dark`} fontWeight="bold">
                Vence: {format(alert.expirationDate, "dd MMM yyyy", { locale: es })}
              </Typography>
            </Box>
          }
        />
        
        <Box sx={{ textAlign: 'right' }}>
          <Chip
            label={`${alert.daysRemaining} días`}
            color={appearance.color}
            variant={alert.severity === 'critical' ? 'filled' : 'outlined'}
            size="small"
          />
        </Box>
      </ListItem>
    );
  };

  const SectionHeader = ({ 
    title, 
    icon, 
    count, 
    criticalCount,
    expanded, 
    onToggle 
  }: {
    title: string;
    icon: string;
    count: number;
    criticalCount: number;
    expanded: boolean;
    onToggle: () => void;
  }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        bgcolor: 'grey.50',
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'grey.100'
        }
      }}
      onClick={onToggle}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon icon={icon} width={20} />
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        <Badge badgeContent={count} color="error" max={99}>
          <Box />
        </Badge>
        {criticalCount > 0 && (
          <Chip
            label={`${criticalCount} críticas`}
            color="error"
            size="small"
            variant="filled"
          />
        )}
      </Box>
      
      <IconButton size="small">
        <Icon 
          icon={expanded ? 'eva:chevron-up-outline' : 'eva:chevron-down-outline'} 
          width={20} 
        />
      </IconButton>
    </Box>
  );

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Icon 
            icon="eva:checkmark-circle-2-outline" 
            width={48} 
            height={48} 
            color="success.main"
            style={{ marginBottom: 16 }}
          />
          <Typography variant="h6" color="success.main" fontWeight="bold">
            ¡Todo al día!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No hay alertas de vencimiento de garantías o almacenamiento
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header principal */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:alert-triangle-outline" width={24} color="warning.main" />
            <Typography variant="h6" fontWeight="bold">
              Alertas de Vencimiento
            </Typography>
            <Badge badgeContent={totalAlerts} color="error" max={99} />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {criticalAlerts > 0 && (
              <Chip
                icon={<Icon icon="eva:alert-circle-outline" />}
                label={`${criticalAlerts} críticas`}
                color="error"
                variant="filled"
                size="small"
              />
            )}
            <Tooltip title="Actualizar alertas">
              <IconButton 
                onClick={onRefresh} 
                disabled={loading}
                size="small"
              >
                <Icon 
                  icon="eva:refresh-outline" 
                  width={20}
                  className={loading ? 'rotating' : ''}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alerta general si hay críticas */}
        {criticalAlerts > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            icon={<Icon icon="eva:alert-triangle-outline" />}
          >
            <Typography fontWeight="bold">
              ¡Atención! Hay {criticalAlerts} alertas críticas que vencen en menos de 7 días
            </Typography>
          </Alert>
        )}

        {/* Sección de Garantías */}
        {warrantyAlerts.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <SectionHeader
              title="Garantías por Vencer"
              icon="eva:shield-outline"
              count={warrantyAlerts.length}
              criticalCount={filterAlertsBySeverity(warrantyAlerts, 'critical').length}
              expanded={expandedWarranty}
              onToggle={() => setExpandedWarranty(!expandedWarranty)}
            />
            
            <Collapse in={expandedWarranty}>
              <Box sx={{ p: 2 }}>
                <List dense>
                  {warrantyAlerts.map((alert) => (
                    <AlertListItem key={alert.id} alert={alert} />
                  ))}
                </List>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Sección de Almacenamiento */}
        {storageAlerts.length > 0 && (
          <Box>
            <SectionHeader
              title="Almacenamiento por Vencer"
              icon="eva:archive-outline"
              count={storageAlerts.length}
              criticalCount={filterAlertsBySeverity(storageAlerts, 'critical').length}
              expanded={expandedStorage}
              onToggle={() => setExpandedStorage(!expandedStorage)}
            />
            
            <Collapse in={expandedStorage}>
              <Box sx={{ p: 2 }}>
                <List dense>
                  {storageAlerts.map((alert) => (
                    <AlertListItem key={alert.id} alert={alert} />
                  ))}
                </List>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Footer con acciones */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon icon="eva:eye-outline" />}
            onClick={() => router.push('/repairs')}
            sx={{ textTransform: 'none' }}
          >
            Ver todas las órdenes
          </Button>
        </Box>
      </CardContent>

      {/* CSS para animación de rotación */}
      <style jsx global>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </Card>
  );
}