import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, TablePagination
} from '@mui/material';

/**
 * โครงสร้างข้อมูลคอลัมน์ของตาราง
 * @interface Column
 * @property {string} id รหัสอ้างอิงฟิลด์ข้อมูล
 * @property {string} label ข้อความแสดงบนหัวตาราง
 * @property {number} [minWidth] ความกว้างขั้นต่ำ
 * @property {'right' | 'left' | 'center'} [align] การจัดเชิงรูปแบบ
 * @property {function} [format] ฟังก์ชันปรับแต่งการแสดงผลของข้อมูล
 */
interface Column {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any) => string | React.ReactNode;
}

/**
 * ข้อมูลตั้งต้นสำหรับตารางข้อมูลหลัก
 * @interface ModernTableProps
 * @property {Column[]} columns โครงสร้างหัวข้อในตาราง
 * @property {any[]} rows ชุดข้อมูลตาราง
 * @property {boolean} [isLoading] สถานะกำลังร้องขอข้อมูล
 * @property {string} [emptyMessage] ข้อความเมื่อไม่มีข้อมูล
 * @property {number | string} [maxHeight] ความสูงการแสดงผลสูงสุด
 */
interface ModernTableProps {
    columns: Column[];
    rows: any[];
    isLoading?: boolean;
    emptyMessage?: string;
    maxHeight?: number | string;
}

/**
 * ตารางแสดงข้อมูลรูปแบบทันสมัยพร้อมรองรับหัวตารางตรึงตำแหน่ง (Sticky Header)
 * จัดการสถานะการโหลดและกรณีไร้ข้อมูลอย่างสวยงาม
 * 
 * @param {ModernTableProps} props ข้อมูลและคอลัมน์ที่ต้องการแสดง
 * @returns {JSX.Element} เลย์เอาท์ตารางบรรจุข้อมูล
 */
const ModernTable: React.FC<ModernTableProps> = ({
    columns,
    rows,
    isLoading = false,
    emptyMessage = "No data available",
    maxHeight = 440
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <TableContainer>
                <Table aria-label="sticky table">
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
                            rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, rowIndex) => {
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
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
};

export default ModernTable;
