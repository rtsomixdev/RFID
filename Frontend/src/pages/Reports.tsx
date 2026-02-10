import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Card, CardContent, Chip, Stack, CircularProgress, Alert
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search,
    AddCircle, RemoveCircle, LocalLaundryService, Inventory
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios'; // ✅ ใช้ axios ในการดึงข้อมูล
import { sendNotification } from '../utils/notificationUtil';

// ⚠️ URL Backend (ใช้ Port 5134 ตามที่คุณแจ้ง)
const BASE_URL = 'http://localhost:5134/api';

// 1. Interface สำหรับข้อมูลในตาราง
interface MovementItem {
    id: number;
    date: string;
    type: string;
    productName: string;
    qty: number;
    balance: number;
    user: string;
}

// 2. Interface สำหรับ Export Stock
interface StockApiItem {
    fabric_category: string;
    fabric_type: string;
    fabric_no: string;
    fabric_detail: string;
    fabric_unit: string;
    rfid_code: string;
}

const Reports: React.FC = () => {
    // กำหนดวันที่เริ่มต้น (ต้นเดือน) และสิ้นสุด (วันนี้)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    
    const [reportData, setReportData] = useState<MovementItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
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
        handleFetchReport(); // ✅ ดึงข้อมูลจริงทันทีที่เข้าหน้าเว็บ
    }, []);

    // ✅ ฟังก์ชันดึงข้อมูลจาก API จริง
    const handleFetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            // เรียก API: /api/Report/Movement
            const res = await axios.get(`${BASE_URL}/Report/Movement`, {
                params: {
                    start: startDate,
                    end: endDate
                }
            });

            const data: MovementItem[] = res.data;
            setReportData(data);
            calculateSummary(data);

        } catch (err) {
            console.error("Error fetching report:", err);
            setError("ไม่สามารถดึงข้อมูลรายงานได้ กรุณาตรวจสอบการเชื่อมต่อ Server");
            setReportData([]); // เคลียร์ตาราง
        } finally {
            setLoading(false);
        }
    };

    // ✅ คำนวณยอดสรุปจากข้อมูลจริง
    const calculateSummary = (data: MovementItem[]) => {
        const todayStr = new Date().toISOString().split('T')[0];

        const added = data.filter(d => d.type === 'Add').reduce((sum, item) => sum + item.qty, 0);
        // Discard ค่า qty มาเป็นลบ ใช้ Math.abs แปลงเป็นบวกเพื่อแสดงผล
        const discarded = data.filter(d => d.type === 'Discard').reduce((sum, item) => sum + Math.abs(item.qty), 0);
        const washed = data.filter(d => d.type === 'Wash').reduce((sum, item) => sum + Math.abs(item.qty), 0);
        
        // รับเข้าวันนี้ (Restock และวันที่ตรงกับวันนี้)
        const receivedToday = data
            .filter(d => d.type === 'Restock' && d.date.startsWith(todayStr))
            .reduce((sum, item) => sum + item.qty, 0);

        setSummary({ added, discarded, washed, receivedToday });
    };

    // ✅ ฟังก์ชัน Export Excel (ใช้ API จริง)
    const handleExportExcel = async () => {
        try {
            // เรียก API: /api/products/export-stock
            const response = await fetch(`${BASE_URL}/products/export-stock`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`เชื่อมต่อ Server ไม่ได้ (Status: ${response.status})`);

            const apiData: StockApiItem[] = await response.json();

            if (!apiData || apiData.length === 0) {
                alert("ไม่พบข้อมูลสินค้าในระบบ");
                return;
            }

            // จัด Group ข้อมูลตามรหัสผ้า
            const groupedData: Record<string, any> = {};
            apiData.forEach((item) => {
                const key = item.fabric_no;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        category: item.fabric_category || "-",
                        type: item.fabric_type || "-",
                        no: item.fabric_no || "-",
                        detail: item.fabric_detail || "-",
                        unit: item.fabric_unit || "ชิ้น",
                        rfids: []
                    };
                }
                if (item.rfid_code) groupedData[key].rfids.push(item.rfid_code);
            });

            const excelRows = Object.values(groupedData);
            const workbook = XLSX.utils.book_new();

            // หาจำนวน RFID สูงสุดเพื่อสร้าง Header
            let maxRfidCount = 0;
            excelRows.forEach((row: any) => {
                if (row.rfids.length > maxRfidCount) maxRfidCount = row.rfids.length;
            });

            const headers = ["Fabric category", "Fabric type", "Fabric no", "Fabric detail", "Fabric unit"];
            for (let i = 1; i <= maxRfidCount; i++) headers.push(`RFID`);

            const wsData = [
                headers,
                ...excelRows.map((item: any) => [
                    item.category, item.type, item.no, item.detail, item.unit, ...item.rfids
                ])
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 10 }];

            XLSX.utils.book_append_sheet(workbook, ws, "Stock_RFID_List");
            XLSX.writeFile(workbook, `Stock_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

            await sendNotification("Export Excel", "ดาวน์โหลดข้อมูลสต็อกเรียบร้อย", "SUCCESS", "/reports", undefined, 1);

        } catch (error) {
            console.error("Export Error:", error);
            alert("เกิดข้อผิดพลาด: " + error);
        }
    };

    // ✅ ฟังก์ชันโหลดฟอนต์สำหรับ PDF
    const addThaiFont = async (doc: jsPDF) => {
        try {
            const response = await fetch('/fonts/Sarabun-Regular.ttf');
            if (!response.ok) throw new Error('ไม่พบไฟล์ฟอนต์');
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
            alert("โหลดฟอนต์ไม่สำเร็จ (ตรวจสอบ folder public/fonts)");
        }
    };

    // ✅ ฟังก์ชัน Export PDF (จากข้อมูลหน้าจอ)
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        await addThaiFont(doc);

        doc.setFontSize(18);
        doc.text("รายงานความเคลื่อนไหวสต็อก (Stock Movement Report)", 14, 20);

        doc.setFontSize(10);
        doc.text(`ช่วงเวลา: ${startDate} ถึง ${endDate}`, 14, 28);
        doc.text(`พิมพ์โดย: ${currentUser?.firstName || 'Admin'}`, 14, 33);

        // Summary Box
        doc.setDrawColor(0);
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 40, 180, 25, 'F');
        doc.setFontSize(12);
        doc.text(`สรุปยอดสำคัญ (Key Metrics):`, 18, 48);
        doc.setFontSize(10);
        doc.text(`- รับเข้าวันนี้: ${summary.receivedToday} ชิ้น`, 20, 56);
        doc.text(`- ส่งซักช่วงนี้: ${summary.washed} ชิ้น`, 20, 62);
        doc.text(`- เพิ่มใหม่: ${summary.added} ชิ้น`, 100, 56);
        doc.text(`- ตัดจำหน่าย: ${summary.discarded} ชิ้น`, 100, 62);

        autoTable(doc, {
            startY: 75,
            head: [['เวลา', 'ประเภท', 'สินค้า', 'จำนวน', 'เช็คจริง']],
            body: reportData.map(item => [
                new Date(item.date).toLocaleString('th-TH'),
                item.type,
                item.productName,
                item.qty > 0 ? `+${item.qty}` : item.qty,
                "________"
            ]),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, font: 'Sarabun', fontStyle: 'normal' },
            styles: { font: 'Sarabun', fontStyle: 'normal', fontSize: 10, cellPadding: 3 },
        });

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
                        ตรวจสอบประวัติ (Real-time) และ Export ไฟล์ Excel สรุปยอด
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
                        <Button variant="contained" fullWidth startIcon={<Search />} onClick={handleFetchReport}>เรียกดูข้อมูล</Button>
                    </Grid>
                    <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" color="success" fullWidth startIcon={<TableView />} onClick={handleExportExcel}>
                            Export RFID (Excel)
                        </Button>
                        <Button variant="outlined" color="error" fullWidth startIcon={<PictureAsPdf />} onClick={handleExportPDF}>PDF</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Error Message */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {/* Table */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, maxHeight: 500 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>วัน/เวลา</TableCell>
                            <TableCell>ประเภท</TableCell>
                            <TableCell>สินค้า</TableCell>
                            <TableCell align="right">จำนวน</TableCell>
                            {/* <TableCell align="right">คงเหลือ</TableCell> (ซ่อนไว้ก่อนถ้ายังไม่มีระบบ Stock Snapshot) */}
                            <TableCell align="right">เช็คจริง</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                    <CircularProgress />
                                    <Typography variant="body2" sx={{ mt: 1 }}>กำลังโหลดข้อมูล...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : reportData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#999' }}>
                                    ไม่พบประวัติการเคลื่อนไหวในช่วงเวลานี้
                                </TableCell>
                            </TableRow>
                        ) : (
                            reportData.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{new Date(row.date).toLocaleString('th-TH')}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.type} 
                                            size="small" 
                                            color={
                                                row.type === 'Add' || row.type === 'Restock' ? 'success' : 
                                                row.type === 'Discard' ? 'error' : 
                                                'primary'
                                            } 
                                            variant="outlined" 
                                        />
                                    </TableCell>
                                    <TableCell>{row.productName}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: row.qty > 0 ? 'green' : 'red' }}>
                                        {row.qty > 0 ? `+${row.qty}` : row.qty}
                                    </TableCell>
                                    {/* <TableCell align="right">{row.balance}</TableCell> */}
                                    <TableCell align="right" sx={{ borderBottom: '1px dashed #ccc' }}></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Reports;