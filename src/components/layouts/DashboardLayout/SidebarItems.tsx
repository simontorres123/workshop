import * as React from "react";
import { usePathname } from "next/navigation";
import { 
  Box, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography,
  alpha,
  useTheme,
  ListSubheader
} from "@mui/material";
import { Icon } from '@iconify/react';
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";

interface SidebarItemsProps {
  onCloseMobile?: () => void;
}

interface NavItemData {
  title: string;
  path: string;
  icon: string;
  roles?: string[];
}

const platformConfig: NavItemData[] = [
  {
    title: 'talleres',
    path: '/organizations',
    icon: 'eva:home-fill',
    roles: ['super_admin']
  },
  {
    title: 'sistema',
    path: '/system',
    icon: 'eva:options-2-fill',
    roles: ['super_admin']
  }
];

const workshopConfig: NavItemData[] = [
  {
    title: 'sucursales',
    path: '/settings/branches',
    icon: 'eva:pin-fill',
    roles: ['org_admin', 'super_admin']
  },
  {
    title: 'equipo',
    path: '/settings/team',
    icon: 'eva:people-outline',
    roles: ['org_admin', 'super_admin']
  }
];

const operationsConfig: NavItemData[] = [
  {
    title: 'dashboard',
    path: '/dashboard',
    icon: 'eva:pie-chart-2-fill'
  },
  {
    title: 'reparaciones',
    path: '/repairs',
    icon: 'eva:settings-fill'
  },
  {
    title: 'clientes',
    path: '/clients',
    icon: 'eva:people-fill'
  },
  {
    title: 'inventario',
    path: '/inventory',
    icon: 'eva:shopping-bag-fill'
  },
  {
    title: 'ventas',
    path: '/sales',
    icon: 'eva:credit-card-fill'
  },
  {
    title: 'reportes',
    path: '/reports',
    icon: 'eva:file-text-fill'
  }
];

interface NavItemProps {
  item: NavItemData;
  active: boolean;
  onCloseMobile?: () => void;
}

function NavItem({ item, active, onCloseMobile }: NavItemProps) {
  const theme = useTheme();
  
  const activeRootStyle = {
    color: 'primary.main',
    fontWeight: 'fontWeightMedium',
    bgcolor: alpha(theme.palette.primary.main, 0.08),
    '&:before': {
      top: 0,
      right: 0,
      width: 3,
      bottom: 0,
      content: "''",
      display: 'block',
      position: 'absolute',
      bgcolor: 'primary.main'
    }
  };

  return (
    <Link href={item.path} passHref legacyBehavior={false} style={{ textDecoration: 'none' }}>
      <ListItemButton
        onClick={onCloseMobile}
        sx={{
          ...theme.typography.body2,
          height: 48,
          position: 'relative',
          textTransform: 'capitalize',
          color: 'text.secondary',
          borderRadius: 1,
          mx: 1,
          my: 0.5,
          ...(active && activeRootStyle)
        }}
      >
      <ListItemIcon
        sx={{
          width: 22,
          height: 22,
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon icon={item.icon} width={22} height={22} />
      </ListItemIcon>
      
      <ListItemText disableTypography primary={item.title} />
      </ListItemButton>
    </Link>
  );
}

export default function SidebarItems({ onCloseMobile }: SidebarItemsProps) {
  const pathname = usePathname();
  const { getRole } = useAuthStore();
  const userRole = getRole();

  const filterItems = (items: NavItemData[]) => {
    return items.filter(item => !item.roles || (userRole && item.roles.includes(userRole)));
  };

  const platformItems = filterItems(platformConfig);
  const workshopItems = filterItems(workshopConfig);
  const operationsItems = filterItems(operationsConfig);

  return (
    <Box sx={{ px: 2.5, py: 3 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ px: 2.5, py: 3, color: 'text.primary' }}>
          Workshop
        </Typography>
      </Box>
      
      {platformItems.length > 0 && (
        <List 
          disablePadding 
          subheader={
            <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'text.disabled' }}>
              Plataforma
            </ListSubheader>
          }
        >
          {platformItems.map((item) => (
            <NavItem
              key={item.title}
              item={item}
              active={pathname === item.path}
              onCloseMobile={onCloseMobile}
            />
          ))}
        </List>
      )}

      {workshopItems.length > 0 && (
        <List 
          disablePadding 
          subheader={
            <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'text.disabled' }}>
              Mi Taller
            </ListSubheader>
          }
        >
          {workshopItems.map((item) => (
            <NavItem
              key={item.title}
              item={item}
              active={pathname === item.path}
              onCloseMobile={onCloseMobile}
            />
          ))}
        </List>
      )}

      <List 
        disablePadding 
        subheader={
          <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'text.disabled' }}>
            Operaciones
          </ListSubheader>
        }
      >
        {operationsItems.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            active={pathname === item.path}
            onCloseMobile={onCloseMobile}
          />
        ))}
      </List>
    </Box>
  );
}
