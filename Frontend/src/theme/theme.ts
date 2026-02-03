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
          borderRadius: 8, // Professional look
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          minWidth: '100px', // ✅ Prevent text truncation (ex. "ห..")
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
          borderRadius: 12, // Professional radius
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', // Soft shadow
          border: 'none',
          overflow: 'visible', // Ensure dropdowns don't get clipped if z-index issues
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px', // Increased padding for breathing room
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    // --- Global Defaults ---
    MuiTextField: {
      defaultProps: {
        fullWidth: true, // ✅ Global Default
        size: 'small',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            backgroundColor: '#ffffff',
            // lineHeight: 1.6, // Optional: for better Thai font rendering
          }
        }
      }
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
        variant: 'outlined',
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
        },
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
          },
        },
        notchedOutline: {
          borderColor: '#e2e8f0',
        },
        input: {
          padding: '12px 14px', // ✅ Increased Vertical Padding for Thai Ascenders/Descenders
          fontSize: '0.95rem',
          color: '#1e293b',
        },
      },
    },
    MuiAutocomplete: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            padding: '4px 8px',
          },
        },
        paper: {
          borderRadius: 8,
          marginTop: 8,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          minWidth: 250, // Ensure listbox is wide enough
        },
        listbox: {
          padding: 4,
        },
        option: {
          fontSize: '0.9rem',
          padding: '8px 16px',
          whiteSpace: 'nowrap', // Prevent wrapping
          overflow: 'hidden',
          textOverflow: 'ellipsis', // Ellipsis for overflow
          display: 'block', // Required for textOverflow
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