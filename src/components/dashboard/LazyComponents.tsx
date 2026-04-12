import { lazy } from 'react';

// Lazy loading de componentes pesados del dashboard original
export const LazyWarrantyStorageDashboard = lazy(() => 
  import('./WarrantyStorageDashboard')
);

export const LazyAdvancedFilters = lazy(() => 
  import('./AdvancedFilters')
);

export const LazyWarrantyReports = lazy(() => 
  import('./WarrantyReports')
);

export const LazyConfigurationPanel = lazy(() => 
  import('./ConfigurationPanel')
);

export const LazyQuickActionsPanel = lazy(() => 
  import('./QuickActionsPanel')
);

// Hook para cargar componentes bajo demanda
export const useLazyComponents = () => {
  const loadAdvancedDashboard = () => LazyWarrantyStorageDashboard;
  const loadAdvancedFilters = () => LazyAdvancedFilters;
  const loadReports = () => LazyWarrantyReports;
  const loadConfiguration = () => LazyConfigurationPanel;
  const loadQuickActions = () => LazyQuickActionsPanel;

  return {
    loadAdvancedDashboard,
    loadAdvancedFilters,
    loadReports,
    loadConfiguration,
    loadQuickActions,
  };
};