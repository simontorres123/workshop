import { createTheme, alpha } from '@mui/material/styles';

// Minimal UI Color Palette
const palette = {
  mode: 'light' as const,
  primary: {
    lighter: '#C8FAD6',
    light: '#5BE49B',
    main: '#00A76F',
    dark: '#007867',
    darker: '#004B50',
  },
  secondary: {
    lighter: '#EFD6FF',
    light: '#C684FF',
    main: '#8E33FF',
    dark: '#5119B7',
    darker: '#27097A',
  },
  info: {
    lighter: '#CAFDF5',
    light: '#61F3F3',
    main: '#00B8D9',
    dark: '#006C9C',
    darker: '#003768',
  },
  success: {
    lighter: '#D3FCD2',
    light: '#77ED8B',
    main: '#22C55E',
    dark: '#118D57',
    darker: '#065E49',
  },
  warning: {
    lighter: '#FFF5CC',
    light: '#FFD666',
    main: '#FFAB00',
    dark: '#B76E00',
    darker: '#7A4100',
  },
  error: {
    lighter: '#FFE9D5',
    light: '#FFAC82',
    main: '#FF5630',
    dark: '#B71D18',
    darker: '#7A0916',
  },
  grey: {
    0: '#FFFFFF',
    100: '#F9FAFB',
    200: '#F4F6F8',
    300: '#DFE3E8',
    400: '#C4CDD5',
    500: '#919EAB',
    600: '#637381',
    700: '#454F5B',
    800: '#212B36',
    900: '#161C24',
  },
  background: {
    default: '#F9FAFB',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#212B36',
    secondary: '#637381',
    disabled: '#919EAB',
  },
  action: {
    active: '#637381',
    hover: alpha('#919EAB', 0.08),
    selected: alpha('#919EAB', 0.16),
    disabled: alpha('#919EAB', 0.8),
    disabledBackground: alpha('#919EAB', 0.24),
    focus: alpha('#919EAB', 0.24),
  },
};

// Create a theme instance with Minimal UI styling
const theme = createTheme({
  palette,
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemiBold: 600,
    fontWeightBold: 700,
    h1: {
      fontWeight: 800,
      lineHeight: 80 / 64,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 800,
      lineHeight: 64 / 48,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 700,
      lineHeight: 28 / 18,
      fontSize: '1.0625rem',
    },
    subtitle1: {
      fontWeight: 600,
      lineHeight: 1.5,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 600,
      lineHeight: 22 / 14,
      fontSize: '0.875rem',
    },
    body1: {
      lineHeight: 1.5,
      fontSize: '1rem',
    },
    body2: {
      lineHeight: 22 / 14,
      fontSize: '0.875rem',
    },
    caption: {
      lineHeight: 1.5,
      fontSize: '0.75rem',
    },
    overline: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
    },
    button: {
      fontWeight: 700,
      lineHeight: 24 / 14,
      fontSize: '0.875rem',
      textTransform: 'unset',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(145, 158, 171, 0.2), 0px 1px 1px 0px rgba(145, 158, 171, 0.14), 0px 1px 3px 0px rgba(145, 158, 171, 0.12)',
    '0px 3px 1px -2px rgba(145, 158, 171, 0.2), 0px 2px 2px 0px rgba(145, 158, 171, 0.14), 0px 1px 5px 0px rgba(145, 158, 171, 0.12)',
    '0px 3px 3px -2px rgba(145, 158, 171, 0.2), 0px 3px 4px 0px rgba(145, 158, 171, 0.14), 0px 1px 8px 0px rgba(145, 158, 171, 0.12)',
    '0px 2px 4px -1px rgba(145, 158, 171, 0.2), 0px 4px 5px 0px rgba(145, 158, 171, 0.14), 0px 1px 10px 0px rgba(145, 158, 171, 0.12)',
    '0px 3px 5px -1px rgba(145, 158, 171, 0.2), 0px 5px 8px 0px rgba(145, 158, 171, 0.14), 0px 1px 14px 0px rgba(145, 158, 171, 0.12)',
    '0px 3px 5px -1px rgba(145, 158, 171, 0.2), 0px 6px 10px 0px rgba(145, 158, 171, 0.14), 0px 1px 18px 0px rgba(145, 158, 171, 0.12)',
    '0px 4px 5px -2px rgba(145, 158, 171, 0.2), 0px 7px 10px 1px rgba(145, 158, 171, 0.14), 0px 2px 16px 1px rgba(145, 158, 171, 0.12)',
    '0px 5px 5px -3px rgba(145, 158, 171, 0.2), 0px 8px 10px 1px rgba(145, 158, 171, 0.14), 0px 3px 14px 2px rgba(145, 158, 171, 0.12)',
    '0px 5px 6px -3px rgba(145, 158, 171, 0.2), 0px 9px 12px 1px rgba(145, 158, 171, 0.14), 0px 3px 16px 2px rgba(145, 158, 171, 0.12)',
    '0px 6px 6px -3px rgba(145, 158, 171, 0.2), 0px 10px 14px 1px rgba(145, 158, 171, 0.14), 0px 4px 18px 3px rgba(145, 158, 171, 0.12)',
    '0px 6px 7px -4px rgba(145, 158, 171, 0.2), 0px 11px 15px 1px rgba(145, 158, 171, 0.14), 0px 4px 20px 3px rgba(145, 158, 171, 0.12)',
    '0px 7px 8px -4px rgba(145, 158, 171, 0.2), 0px 12px 17px 2px rgba(145, 158, 171, 0.14), 0px 5px 22px 4px rgba(145, 158, 171, 0.12)',
    '0px 7px 8px -4px rgba(145, 158, 171, 0.2), 0px 13px 19px 2px rgba(145, 158, 171, 0.14), 0px 5px 24px 4px rgba(145, 158, 171, 0.12)',
    '0px 7px 9px -4px rgba(145, 158, 171, 0.2), 0px 14px 21px 2px rgba(145, 158, 171, 0.14), 0px 5px 26px 4px rgba(145, 158, 171, 0.12)',
    '0px 8px 9px -5px rgba(145, 158, 171, 0.2), 0px 15px 22px 2px rgba(145, 158, 171, 0.14), 0px 6px 28px 5px rgba(145, 158, 171, 0.12)',
    '0px 8px 10px -5px rgba(145, 158, 171, 0.2), 0px 16px 24px 2px rgba(145, 158, 171, 0.14), 0px 6px 30px 5px rgba(145, 158, 171, 0.12)',
    '0px 8px 11px -5px rgba(145, 158, 171, 0.2), 0px 17px 26px 2px rgba(145, 158, 171, 0.14), 0px 6px 32px 5px rgba(145, 158, 171, 0.12)',
    '0px 9px 11px -5px rgba(145, 158, 171, 0.2), 0px 18px 28px 2px rgba(145, 158, 171, 0.14), 0px 7px 34px 6px rgba(145, 158, 171, 0.12)',
    '0px 9px 12px -6px rgba(145, 158, 171, 0.2), 0px 19px 29px 2px rgba(145, 158, 171, 0.14), 0px 7px 36px 6px rgba(145, 158, 171, 0.12)',
    '0px 10px 13px -6px rgba(145, 158, 171, 0.2), 0px 20px 31px 3px rgba(145, 158, 171, 0.14), 0px 8px 38px 7px rgba(145, 158, 171, 0.12)',
    '0px 10px 13px -6px rgba(145, 158, 171, 0.2), 0px 21px 33px 3px rgba(145, 158, 171, 0.14), 0px 8px 40px 7px rgba(145, 158, 171, 0.12)',
    '0px 10px 14px -6px rgba(145, 158, 171, 0.2), 0px 22px 35px 3px rgba(145, 158, 171, 0.14), 0px 8px 42px 7px rgba(145, 158, 171, 0.12)',
    '0px 11px 14px -7px rgba(145, 158, 171, 0.2), 0px 23px 36px 3px rgba(145, 158, 171, 0.14), 0px 9px 44px 8px rgba(145, 158, 171, 0.12)',
    '0px 11px 15px -7px rgba(145, 158, 171, 0.2), 0px 24px 38px 3px rgba(145, 158, 171, 0.14), 0px 9px 46px 8px rgba(145, 158, 171, 0.12)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          height: 48,
        },
        sizeMedium: {
          height: 36,
        },
        sizeSmall: {
          height: 30,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 1px -1px rgba(145, 158, 171, 0.2), 0px 1px 1px 0px rgba(145, 158, 171, 0.14), 0px 1px 3px 0px rgba(145, 158, 171, 0.12)',
          borderRadius: 16,
          position: 'relative',
          zIndex: 0,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '24px 24px 0px',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f4f6f8',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px dashed rgba(145, 158, 171, 0.24)',
          backgroundColor: '#ffffff',
        },
      },
    },
  },
});

export default theme;
