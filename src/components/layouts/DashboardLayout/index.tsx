"use client";

import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  IconButton,
  useMediaQuery,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from "@mui/material";
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import SidebarItems from "./SidebarItems";
import { useAuth } from "@/hooks/useAuth";
import BranchSelector from "./BranchSelector";

const DRAWER_WIDTH = 280;
const APPBAR_MOBILE = 64;
const APPBAR_DESKTOP = 92;

const RootStyle = styled('div')({
  display: 'flex',
  minHeight: '100%',
  overflow: 'hidden'
});

const MainStyle = styled('div')(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  minHeight: '100%',
  paddingTop: APPBAR_MOBILE + 24,
  paddingBottom: 24,
  [theme.breakpoints.up('lg')]: {
    paddingTop: APPBAR_DESKTOP + 24,
    paddingLeft: 16,
    paddingRight: 16,
  },
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  boxShadow: 'none',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  [theme.breakpoints.up('lg')]: {
    width: `calc(100% - ${DRAWER_WIDTH + 1}px)`,
  },
}));

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const { signOut } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      handleUserMenuClose();
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error durante el logout:', error);
      window.location.href = '/login';
    }
  };

  return (
    <RootStyle>
      <StyledAppBar>
        <Toolbar
          sx={{
            minHeight: APPBAR_MOBILE,
            [theme.breakpoints.up('lg')]: {
              minHeight: APPBAR_DESKTOP,
              padding: theme.spacing(0, 5),
            },
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              mr: 1,
              color: 'text.primary',
              display: { lg: 'none' },
            }}
          >
            <Icon icon="eva:menu-fill" />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
            Workshop Dashboard
          </Typography>

          <BranchSelector />

          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1.5 }}
          >
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ p: 0 }}
              aria-label="user menu"
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36,
                  bgcolor: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                <Icon icon="eva:person-fill" width={20} />
              </Avatar>
            </IconButton>
          </Stack>
        </Toolbar>
      </StyledAppBar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 180,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleUserMenuClose}>
          <ListItemIcon>
            <Icon icon="eva:person-outline" width={20} />
          </ListItemIcon>
          <ListItemText>Mi Perfil</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleUserMenuClose}>
          <ListItemIcon>
            <Icon icon="eva:settings-outline" width={20} />
          </ListItemIcon>
          <ListItemText>Configuración</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Icon icon="eva:log-out-outline" width={20} style={{ color: 'inherit' }} />
          </ListItemIcon>
          <ListItemText>Cerrar Sesión</ListItemText>
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{
          width: { lg: DRAWER_WIDTH },
          flexShrink: { lg: 0 },
        }}
      >
        {isDesktop ? (
          <Drawer
            open
            variant="persistent"
            PaperProps={{
              sx: {
                width: DRAWER_WIDTH,
                bgcolor: 'background.default',
                borderRightStyle: 'dashed',
              },
            }}
          >
            <SidebarItems />
          </Drawer>
        ) : (
          <Drawer
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            PaperProps={{
              sx: { width: DRAWER_WIDTH },
            }}
          >
            <SidebarItems onCloseMobile={() => setMobileOpen(false)} />
          </Drawer>
        )}
      </Box>

      <MainStyle>
        <Box sx={{ px: 2, py: 3, width: 1 }}>
          {children}
        </Box>
      </MainStyle>
    </RootStyle>
  );
}
