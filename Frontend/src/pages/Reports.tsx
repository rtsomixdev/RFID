import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Card, CardContent, Chip, Stack
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search,
    AddCircle, RemoveCircle, LocalLaundryService, Inventory
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendNotification } from '../utils/notificationUtil';

// 1. Interface สำหรับตารางหน้าเว็บ (Movement)
interface MovementItem {
    id: number;
    date: string;
    type: 'Add' | 'Discard' | 'Wash' | 'Restock' | 'Request';
    productName: string;
    qty: number;
    balance: number;
    user: string;
}

// 2. ✅ Interface ใหม่: สำหรับรับข้อมูล Stock จาก API เพื่อทำ Excel
interface StockApiItem {
    fabric_category: string;
    fabric_type: string;
    fabric_no: string;      // ใช้ตัวนี้เป็น Key ในการ Group
    fabric_detail: string;
    fabric_unit: string;
    rfid_code: string;      // ตัวที่จะเอามาเรียงแนวนอน
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

    // --- ส่วน Login (คงไว้เหมือนเดิม ไม่แตะต้อง) ---
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        handlePreview();
    }, []);
    // ------------------------------------------

    const handlePreview = () => {
        // Mock Data สำหรับแสดงผลหน้าจอ (User ดูประวัติการเคลื่อนไหว)
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

    // ✅ 3. EXCEL Export: แก้ไขใหม่ (API -> Grouping -> แนวนอน)
    const handleExportExcel = async () => {
        try {
            // ⚠️ แก้ URL ให้ตรงกับ Backend (.NET) ของคุณ (Port 5134)
            const API_URL = 'http://localhost:5134/api/products/export-stock'; 

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // ถ้ามี Token ให้เปิดบรรทัดล่างนี้
                    // 'Authorization': `Bearer ${currentUser?.token || ''}` 
                }
            });

            if (!response.ok) {
                throw new Error(`เชื่อมต่อ Server ไม่ได้ (Status: ${response.status}) - ลองเช็ค Port ดูครับ`);
            }

            const apiData: StockApiItem[] = await response.json();

            if (!apiData || apiData.length === 0) {
                alert("ไม่พบข้อมูลสินค้าในระบบ");
                return;
            }

            // --- B. จัด Group ข้อมูล (Logic สำคัญ) ---
            // เปลี่ยนจาก List ยาวๆ ให้เป็น Group ตาม fabric_no
            const groupedData: Record<string, any> = {};

            apiData.forEach((item) => {
                const key = item.fabric_no; // ใช้รหัสผ้าเป็นตัวรวมกลุ่ม

                if (!groupedData[key]) {
                    // ถ้ายังไม่มีสินค้านี้ ให้สร้าง Object แม่แบบ
                    groupedData[key] = {
                        category: item.fabric_category || "-",
                        type: item.fabric_type || "-",
                        no: item.fabric_no || "-",
                        detail: item.fabric_detail || "-",
                        unit: item.fabric_unit || "ชิ้น",
                        rfids: [] // สร้าง Array เปล่ารอเก็บ RFID
                    };
                }

                // ยัด RFID ใส่เข้าไปใน Array (ถ้ามีค่า)
                if (item.rfid_code) {
                    groupedData[key].rfids.push(item.rfid_code);
                }
            });

            // แปลง Object กลับเป็น Array เพื่อเตรียมลง Excel
            const excelRows = Object.values(groupedData);

            // --- C. สร้างไฟล์ Excel ---
            const workbook = XLSX.utils.book_new();

            // 1. หาจำนวน RFID สูงสุด (เพื่อสร้าง Header ให้ครบ)
            let maxRfidCount = 0;
            excelRows.forEach((row: any) => {
                if (row.rfids.length > maxRfidCount) maxRfidCount = row.rfids.length;
            });

            // 2. สร้าง Header
            const headers = ["Fabric category", "Fabric type", "Fabric no", "Fabric detail", "Fabric unit"];
            for (let i = 1; i <= maxRfidCount; i++) {
                headers.push(`RFID`); 
            }

            // 3. เตรียมข้อมูลลงตาราง (Spread Array)
            const wsData = [
                headers, // แถวที่ 1: หัวตาราง
                ...excelRows.map((item: any) => [
                    item.category,
                    item.type,
                    item.no,
                    item.detail,
                    item.unit,
                    ...item.rfids // 🔥 จุดสำคัญ: กระจาย RFID ออกไปทางขวา
                ])
            ];

            // 4. แปลงเป็น Sheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // จัดความกว้างคอลัมน์ให้สวยงาม
            ws['!cols'] = [
                { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 10 }
            ];

            XLSX.utils.book_append_sheet(workbook, ws, "Stock_RFID_List");
            XLSX.writeFile(workbook, `Stock_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

            await sendNotification("Export Excel", "ดาวน์โหลดข้อมูลสต็อกเรียบร้อย", "SUCCESS", "/reports", undefined, 1);

        } catch (error) {
            console.error("Export Error:", error);
            alert("เกิดข้อผิดพลาด: " + error);
        }
    };

    // ✅ 4. ฟังก์ชันโหลดฟอนต์ (คงเดิม)
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
                        doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
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

    // ✅ 5. PDF Export (คงเดิม)
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        await addThaiFont(doc);

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
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                font: 'Sarabun',
                fontStyle: 'normal'
            },
            styles: {
                font: 'Sarabun',
                fontStyle: 'normal',
                fontSize: 10,
                cellPadding: 3
            },
        });

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
                        รายงานความเคลื่อนไหว & Export Stock
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        ตรวจสอบประวัติ และ Export ไฟล์ Excel สรุปยอดผ้าพร้อม RFID
                    </Typography>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card elevation={2} sx={{ bgcolor: '#ecfdf5', color: '#047857', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">เพิ่มใหม่</Typography><Typography variant="h5" fontWeight="bold">+{summary.added}</Typography></Box>
                                <AddCircle fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card elevation={2} sx={{ bgcolor: '#fef2f2', color: '#b91c1c', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">ตัดจำหน่าย</Typography><Typography variant="h5" fontWeight="bold">-{summary.discarded}</Typography></Box>
                                <RemoveCircle fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card elevation={2} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2, pb: '16px !important' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Box><Typography variant="caption" fontWeight="bold">ส่งซัก</Typography><Typography variant="h5" fontWeight="bold">-{summary.washed}</Typography></Box>
                                <LocalLaundryService fontSize="large" sx={{ opacity: 0.2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card elevation={2} sx={{ bgcolor: '#fff7ed', color: '#c2410c', borderRadius: 3 }}>
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
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6} md={3}>
                        <TextField type="date" label="เริ่มต้น" fullWidth size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField type="date" label="สิ้นสุด" fullWidth size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button variant="contained" fullWidth startIcon={<Search />} onClick={handlePreview}>เรียกดูข้อมูล</Button>
                    </Grid>
                    <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" color="success" fullWidth startIcon={<TableView />} onClick={handleExportExcel}>
                            Export RFID (Excel)
                        </Button>
                        <Button variant="outlined" color="error" fullWidth startIcon={<PictureAsPdf />} onClick={handleExportPDF}>PDF</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, maxHeight: 500 }}>
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