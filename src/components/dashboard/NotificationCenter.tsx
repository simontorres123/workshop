import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Icon } from '@iconify/react';
import PushNotificationWidget from './PushNotificationWidget';
import AutoNotificationScheduler from './AutoNotificationScheduler';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `notification-tab-${index}`,
    'aria-controls': `notification-tabpanel-${index}`,
  };
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [tabValue, setTabValue] = React.useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          height: fullScreen ? '100vh' : '80vh',
          maxHeight: fullScreen ? '100vh' : '80vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon="eva:bell-outline" width={28} />
            <Box>
              <Typography variant="h6" component="div">
                Centro de Notificaciones
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gestiona notificaciones push y automáticas
              </Typography>
            </Box>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="cerrar"
            size="small"
          >
            <Icon icon="eva:close-outline" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="notification center tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<Icon icon="eva:smartphone-outline" />}
              label="Push Notifications"
              {...a11yProps(0)}
              sx={{
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            />
            <Tab
              icon={<Icon icon="eva:clock-outline" />}
              label="Automáticas"
              {...a11yProps(1)}
              sx={{
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            />
          </Tabs>
        </Box>

        <Box sx={{ height: 'calc(100% - 64px)', overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:smartphone-outline" />
                  Notificaciones Push
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configura y prueba notificaciones push que aparecen en tu dispositivo
                </Typography>
                
                <Box sx={{ '& .MuiCard-root': { boxShadow: 'none', border: '1px solid', borderColor: 'divider' } }}>
                  <PushNotificationWidget />
                </Box>
              </Paper>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="eva:clock-outline" />
                  Notificaciones Automáticas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Programa notificaciones que se envían automáticamente según eventos del sistema
                </Typography>
                
                <Box sx={{ '& .MuiCard-root': { boxShadow: 'none', border: '1px solid', borderColor: 'divider' } }}>
                  <AutoNotificationScheduler />
                </Box>
              </Paper>
            </Box>
          </TabPanel>
        </Box>

        {/* Información general al pie */}
        <Box sx={{ 
          position: 'sticky', 
          bottom: 0, 
          bgcolor: 'background.paper', 
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Icon icon="eva:checkmark-circle-outline" width={16} color={theme.palette.success.main} />
              <Typography variant="caption" color="text.secondary">
                Push: Notificaciones inmediatas
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Icon icon="eva:clock-outline" width={16} color={theme.palette.primary.main} />
              <Typography variant="caption" color="text.secondary">
                Auto: Programadas por horario
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}