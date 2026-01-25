import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography
} from '@mui/material';

interface Column {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any) => string | React.ReactNode;
}

interface ModernTableProps {
    columns: Column[];
    rows: any[];
    isLoading?: boolean;
    emptyMessage?: string;
    maxHeight?: number | string;
}

const ModernTable: React.FC<ModernTableProps> = ({
    columns,
    rows,
    isLoading = false,
    emptyMessage = "No data available",
    maxHeight = 440
}) => {
    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <TableContainer sx={{ maxHeight }}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    align={column.align}
                                    style={{ minWidth: column.minWidth }}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        color: '#64748b',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.05em',
                                        borderBottom: '1px solid #e2e8f0'
                                    }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                                    <Typography color="textSecondary">Loading...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                                    <Typography color="textSecondary">{emptyMessage}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, rowIndex) => {
                                return (
                                    <TableRow hover role="checkbox" tabIndex={-1} key={rowIndex} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        {columns.map((column) => {
                                            const value = row[column.id];
                                            return (
                                                <TableCell key={column.id} align={column.align} sx={{ color: '#334155', fontSize: '0.875rem' }}>
                                                    {column.format ? column.format(value) : value}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default ModernTable;
