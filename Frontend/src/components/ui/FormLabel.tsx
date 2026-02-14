import React from 'react';
import { Box, Typography } from '@mui/material';

interface FormLabelProps {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}

const FormLabel: React.FC<FormLabelProps> = ({ label, required, children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
            <Typography variant="caption" fontWeight="600" color="text.secondary" sx={{ ml: 0.5 }}>
                {label} {required && <Box component="span" sx={{ color: 'error.main' }}>*</Box>}
            </Typography>
            {children}
        </Box>
    );
};

export default FormLabel;
