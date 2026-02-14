import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Soft Blue (Blue-600) - More professional/medical than Indigo
      light: '#60a5fa',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b', // Neutral Gray (Slate-500)
      light: '#94a3b8',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981', // Emerald-500
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b', // Amber-500
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444', // Red-500
      light: '#f87171',
      dark: '#b91c1c',
    },
    background: {
      default: '#f1f5f9', // Slate-100: Standard Application Background
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate-900: High contrast for readability
      secondary: '#475569', // Slate-600: Readable secondary text
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0',
  },
  shape: {
    borderRadius: 10, // Requirement: 10
  },
  typography: {
    fontFamily: [
      '"Inter"',
      '"Sarabun"', // Thai font support
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      color: '#0f172a',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      color: '#0f172a',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      color: '#0f172a',
    },
    subtitle1: {
      fontWeight: 500,
      color: '#334155',
    },
    subtitle2: {
      fontWeight: 600,
      color: '#475569',
    },
    button: {
      textTransform: 'none', // Remove uppercase (Modern look)
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f1f5f9',
          color: '#0f172a',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          minHeight: 40, // Standard height
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#1d4ed8', // Darker blue on hover
          },
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: '1rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Use for Dropdowns/Modals
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0', // Subtle border
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Elevation 1 equivalent
          overflow: 'visible',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },
    // --- Input & Form Fields ---
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'medium', // Requirement: Standard height (medium)
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: '#f8fafc',
            },
            '&.Mui-focused': {
              backgroundColor: '#ffffff',
              boxShadow: `0 0 0 3px ${alpha('#2563eb', 0.15)}`, // Blue ring focus
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: '10.5px 14px', // Adjust internal padding for 'medium' size to look neat
        },
        notchedOutline: {
          borderColor: '#cbd5e1', // Slate-300
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: '#475569',
          // We will likely encourage using "FormLabel" above the input, 
          // but if `label` prop is used in TextField, style it well.
        },
        outlined: {
          // Adjust position if needed, but standard Material behavior is fine for fallback
        }
      }
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
        size: 'medium',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
        colorPrimary: {
          backgroundColor: alpha('#2563eb', 0.1),
          color: '#1e40af',
          '&:hover': { backgroundColor: alpha('#2563eb', 0.2) }
        },
        colorSuccess: {
          backgroundColor: alpha('#10b981', 0.1),
          color: '#047857',
        },
        colorWarning: {
          backgroundColor: alpha('#f59e0b', 0.1),
          color: '#b45309',
        },
        colorError: {
          backgroundColor: alpha('#ef4444', 0.1),
          color: '#b91c1c',
        },
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
          color: '#475569',
          borderBottom: '1px solid #e2e8f0',
        },
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '12px 16px',
        },
      },
    },
  },
});

export default theme;