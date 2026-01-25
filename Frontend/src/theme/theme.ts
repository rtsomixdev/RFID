import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // Indigo-600: Premium & Modern
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981', // Emerald-500
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // Slate-50: Clean background
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Slate-800: Sharp text
      secondary: '#64748b', // Slate-500: Softer details
    },
  },
  typography: {
    fontFamily: [
      '"Inter"',
      '"Sarabun"', // Thai font support
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      color: '#1e293b',
    },
    h5: {
      fontWeight: 600,
      color: '#1e293b',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', // Soft indigo shadow
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          background: '#4f46e5',
          '&:hover': {
            background: '#4338ca',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          border: 'none',
        },
      },
    },
    // --- Global Defaults ---
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          minWidth: 120, // Prevent collapse
          '& .MuiInputBase-root': {
            backgroundColor: '#ffffff', // Ensure white background
          }
        }
      }
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
      styleOverrides: {
        root: {
          minWidth: 120, // Prevent collapse
        }
      }
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      }
    },
    // --- Form & Input Standardization ---
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          color: '#64748b',
          '&.Mui-focused': {
            color: '#4f46e5',
          },
          // Fix label overlap or cutoff
          transform: 'translate(14px, 10px) scale(1)',
          '&.MuiInputLabel-shrink': {
            transform: 'translate(14px, -9px) scale(0.75)',
            backgroundColor: 'white',
            padding: '0 4px',
          }
        },
        shrink: {
          // Additional safety
          transform: 'translate(14px, -9px) scale(0.75)',
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#f8fafc', // Light background
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.1)', // Focus ring
          },
          '&.MuiInputBase-sizeSmall': {
            minHeight: '44px', // Standard height validation
          },
        },
        notchedOutline: {
          borderColor: '#e2e8f0', // Subtle default border
          borderWidth: '1px',
        },
        input: {
          padding: '10px 14px', // Adjusted for better alignment
          fontSize: '0.95rem',
          color: '#1e293b',
          '&::placeholder': {
            color: '#94a3b8',
            opacity: 1,
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            padding: '4px 8px', // Adjust for autocomplete
          },
        },
        paper: {
          borderRadius: 12,
          marginTop: 8,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        },
        option: {
          fontSize: '0.9rem',
          padding: '10px 16px',
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
          '&[aria-selected="true"]': {
            backgroundColor: '#e0e7ff',
            color: '#4f46e5',
          }
        }
      }
    },
  },
});

export default theme;