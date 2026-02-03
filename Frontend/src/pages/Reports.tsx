import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button, MenuItem,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Card, CardContent, Chip, Stack
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, Download,
    AddCircle, RemoveCircle, LocalLaundryService, Inventory
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendNotification } from '../utils/notificationUtil';

interface MovementItem {
    id: number;
    date: string;
    type: 'Add' | 'Discard' | 'Wash' | 'Restock' | 'Request';
    productName: string;
    qty: number;
    balance: number;
    user: string;
}

const Reports: React.FC = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<MovementItem[]>([]);
    const [summary, setSummary] = useState({
        added: 0,
        discarded: 0,
        washed: 0,
        receivedToday: 0
    });

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        handlePreview();
    }, []);

    const handlePreview = () => {
        // Mock Data
        const mockData: MovementItem[] = [
            { id: 1, date: '2026-01-15T08:30:00', type: 'Add', productName: 'ผ้าปูที่นอน (King)', qty: 50, balance: 50, user: 'Admin' },
            { id: 2, date: '2026-01-15T09:00:00', type: 'Request', productName: 'ผ้าปูที่นอน (King)', qty: -10, balance: 40, user: 'Nurse A' },
            { id: 3, date: '2026-01-15T10:15:00', type: 'Wash', productName: 'ปลอกหมอน', qty: -20, balance: 100, user: 'Staff B' },
            { id: 4, date: '2026-01-15T14:20:00', type: 'Discard', productName: 'ผ้าห่มนวม', qty: -5, balance: 30, user: 'Admin' },
            { id: 5, date: '2026-01-15T16:00:00', type: 'Restock', productName: 'ปลอกหมอน', qty: 20, balance: 120, user: 'Laundry' },
        ];
        setReportData(mockData);
        calculateSummary(mockData);
    };

    const calculateSummary = (data: MovementItem[]) => {
        const today = new Date().toISOString().split('T')[0];
        const added = data.filter(d => d.type === 'Add').reduce((sum, item) => sum + item.qty, 0);
        const discarded = data.filter(d => d.type === 'Discard').reduce((sum, item) => sum + Math.abs(item.qty), 0);
        const washed = data.filter(d => d.type === 'Wash').reduce((sum, item) => sum + Math.abs(item.qty), 0);
        const receivedToday = data
            .filter(d => (d.type === 'Add' || d.type === 'Restock') && d.date.startsWith(today))
            .reduce((sum, item) => sum + item.qty, 0);

        setSummary({ added, discarded, washed, receivedToday });
    };

    // ✅ 1. EXCEL Export
    const handleExportExcel = async () => {
        if (reportData.length === 0) return alert("ไม่มีข้อมูล");
        const workbook = XLSX.utils.book_new();

        // Sheet 1: Summary
        const summaryData = [
            ["รายงานสรุปการเคลื่อนไหวผ้า"], ["วันที่พิมพ์:", new Date().toLocaleString('th-TH')], [" "],
            ["หัวข้อ", "จำนวน (ชิ้น)"], ["เพิ่มผ้าใหม่", summary.added], ["ตัดจำหน่าย", summary.discarded],
            ["ส่งซัก", summary.washed], ["รับเข้าวันนี้", summary.receivedToday],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

        // Sheet 2: Transactions
        const detailData = reportData.map((item, idx) => ({
            "ลำดับ": idx + 1, "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
            "ประเภท": item.type, "สินค้า": item.productName, "จำนวน": item.qty,
            "คงเหลือ": item.balance, "ผู้ทำรายการ": item.user
        }));
        const wsDetail = XLSX.utils.json_to_sheet(detailData);
        XLSX.utils.book_append_sheet(workbook, wsDetail, "Transactions");

        XLSX.writeFile(workbook, `Movement_Report.xlsx`);
        await sendNotification("Export Excel", "ดาวน์โหลดรายงานความเคลื่อนไหว (Excel)", "INFO", "/reports", undefined, 1);
    };

    // ✅ 2. ฟังก์ชันโหลดฟอนต์
    const addThaiFont = async (doc: jsPDF) => {
        try {
            const response = await fetch('/fonts/Sarabun-Regular.ttf');
            if (!response.ok) throw new Error('ไม่พบไฟล์ฟอนต์ใน public/fonts');
            const blob = await response.blob();
            return new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        const base64data = (reader.result as string).split(',')[1];
                        doc.addFileToVFS('Sarabun.ttf', base64data);
                        doc.addFont('Sarabun.ttf', 'Sarabun', 'normal'); // ลงทะเบียนแค่ normal
                        doc.setFont('Sarabun');
                        resolve();
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Font Error:", error);
            alert("โหลดฟอนต์ไม่สำเร็จ");
        }
    };

    // ✅ 3. PDF Export (แก้หัวตารางเพี้ยน โดยบังคับใช้ Normal Font)
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        await addThaiFont(doc); // รอโหลดฟอนต์

        // Header
        doc.setFontSize(18);
        doc.text("รายงานความเคลื่อนไหวสต็อก (Stock Movement Report)", 14, 20);

        doc.setFontSize(10);
        doc.text(`ช่วงเวลา: ${startDate || '-'} ถึง ${endDate || '-'}`, 14, 28);
        doc.text(`พิมพ์โดย: ${currentUser?.firstName || 'Admin'}`, 14, 33);

        // Summary Box
        doc.setDrawColor(0);
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 40, 180, 25, 'F');
        doc.setFontSize(12);
        doc.text(`สรุปยอดสำคัญ (Key Metrics):`, 18, 48);
        doc.setFontSize(10);
        doc.text(`- รับเข้าวันนี้: ${summary.receivedToday} ชิ้น`, 20, 56);
        doc.text(`- ส่งซักเดือนนี้: ${summary.washed} ชิ้น`, 20, 62);
        doc.text(`- เพิ่มใหม่: ${summary.added} ชิ้น`, 100, 56);
        doc.text(`- ตัดจำหน่าย: ${summary.discarded} ชิ้น`, 100, 62);

        // Table
        autoTable(doc, {
            startY: 75,
            head: [['เวลา', 'ประเภท', 'สินค้า', 'จำนวน', 'คงเหลือ', 'นับจริง']],
            body: reportData.map(item => [
                new Date(item.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                item.type,
                item.productName,
                item.qty > 0 ? `+${item.qty}` : item.qty,
                item.balance,
                "________"
            ]),
            theme: 'grid',

            // 🔥 จุดสำคัญ: บังคับหัวตารางให้เป็นตัวธรรมดา (fontStyle: 'normal')
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                font: 'Sarabun',    // ระบุฟอนต์ไทย
                fontStyle: 'normal' // 👈 บังคับไม่ให้เป็นตัวหนา (แก้ปัญหาภาษาต่างดาว)
            },

            // เนื้อหาในตาราง
            styles: {
                font: 'Sarabun',
                fontStyle: 'normal',
                fontSize: 10,
                cellPadding: 3
            },
        });

        // Footer
        doc.text("__________________________", 140, doc.internal.pageSize.height - 30);
        doc.text("ผู้ตรวจสอบ (Stock Auditor)", 145, doc.internal.pageSize.height - 23);

        doc.save("Movement_Report.pdf");
        await sendNotification("Export PDF", "ดาวน์โหลดรายงานความเคลื่อนไหว (PDF)", "INFO", "/reports", undefined, 1);
    };

    return (
        <Box sx={{ pb: 5 }}>
            {/* Header UI */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0369a1' }}>
                    <TableView fontSize="large" />
                </Paper>
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                        รายงานความเคลื่อนไหว (Movement Report)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        ตรวจสอบการ รับเข้า / ส่งซัก / ตัดจำหน่าย และยอดคงเหลือ
                    </Typography>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card elevation={2} sx={{ bgcolor: '#ecfdf5', color: '#047857', borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">เพิ่มใหม่</Typography><Typography variant="h5" fontWeight="bold">+{summary.added}</Typography></Box>
                                <AddCircle fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card elevation={2} sx={{ bgcolor: '#fef2f2', color: '#b91c1c', borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">ตัดจำหน่าย</Typography><Typography variant="h5" fontWeight="bold">-{summary.discarded}</Typography></Box>
                                <RemoveCircle fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card elevation={2} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">ส่งซัก</Typography><Typography variant="h5" fontWeight="bold">-{summary.washed}</Typography></Box>
                                <LocalLaundryService fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card elevation={2} sx={{ bgcolor: '#fff7ed', color: '#c2410c', borderRadius: 3, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">รับเข้าวันนี้</Typography><Typography variant="h5" fontWeight="bold">+{summary.receivedToday}</Typography></Box>
                                <Inventory fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filter & Actions */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 6, md: 3 }}>
                        <TextField type="date" label="เริ่มต้น" fullWidth size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                        <TextField type="date" label="สิ้นสุด" fullWidth size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <Button variant="contained" fullWidth startIcon={<Search />} onClick={handlePreview}>เรียกดูข้อมูล</Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" color="success" fullWidth startIcon={<TableView />} onClick={handleExportExcel}>Excel</Button>
                        <Button variant="outlined" color="error" fullWidth startIcon={<PictureAsPdf />} onClick={handleExportPDF}>PDF</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, maxHeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>วัน/เวลา</TableCell>
                            <TableCell>ประเภท</TableCell>
                            <TableCell>สินค้า</TableCell>
                            <TableCell align="right">จำนวน</TableCell>
                            <TableCell align="right">คงเหลือ</TableCell>
                            <TableCell align="right">เช็คจริง</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reportData.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{new Date(row.date).toLocaleString('th-TH')}</TableCell>
                                <TableCell>
                                    <Chip label={row.type} size="small" color={row.type === 'Add' ? 'success' : row.type === 'Discard' ? 'error' : 'primary'} variant="outlined" />
                                </TableCell>
                                <TableCell>{row.productName}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: row.qty > 0 ? 'green' : 'red' }}>{row.qty > 0 ? `+${row.qty}` : row.qty}</TableCell>
                                <TableCell align="right">{row.balance}</TableCell>
                                <TableCell align="right" sx={{ borderBottom: '1px dashed #ccc' }}></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Reports;