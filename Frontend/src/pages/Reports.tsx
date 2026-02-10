import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Chip, CircularProgress, Alert, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, FilterList
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { sendNotification } from '../utils/notificationUtil';

// ⚠️ URL Backend
const BASE_URL = 'http://localhost:5134/api';

interface MovementItem {
    id: number;
    date: string;
    type: string;
    productName: string;
    flow: string;
    qty: number;
    user: string;
}

const Reports: React.FC = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedType, setSelectedType] = useState('All'); 

    const [reportData, setReportData] = useState<MovementItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Filter Options
    const activityTypes = [
        { value: 'All', label: 'ทั้งหมด (All Activities)' },
        { value: 'Add', label: 'เพิ่มเข้าระบบ (Add New)' },
        { value: 'Wash', label: 'ส่งซัก (Send to Wash)' },
        { value: 'Restock', label: 'รับผ้าสะอาด (Restock)' },
        { value: 'Discard', label: 'ตัดจำหน่าย (Discard)' },
        { value: 'Move', label: 'ย้ายตำแหน่ง (Move)' }
    ];

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        handleFetchReport();
    }, []);

    const handleFetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE_URL}/Report/Movement`, {
                params: {
                    start: startDate,
                    end: endDate,
                    type: selectedType
                }
            });
            setReportData(res.data);
        } catch (err) {
            console.error("Error fetching report:", err);
            setError("ไม่สามารถดึงข้อมูลรายงานได้ กรุณาตรวจสอบการเชื่อมต่อ Server");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ แก้ไขใหม่: Export ข้อมูลจาก "reportData" (สิ่งที่โชว์ในตาราง) โดยตรง
    const handleExportExcel = async () => {
        try {
            // 1. เช็คว่ามีข้อมูลในตารางไหม
            if (reportData.length === 0) {
                alert("ไม่มีข้อมูลในตารางให้ Export (กรุณากดค้นหาข้อมูลก่อน)");
                return;
            }

            // 2. แปลงข้อมูลในตารางเป็น Format Excel (เอาเฉพาะ Column ที่จำเป็น)
            const excelData = reportData.map(item => ({
                "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
                "ประเภทรายการ": item.type,
                "สินค้า": item.productName,
                "เส้นทาง (Flow)": item.flow, // A -> B
                "จำนวน (ชิ้น)": item.qty,    // ✅ โชว์ยอดรวม (Quantity) ตามที่ขอ
                "ผู้ดำเนินการ": item.user
            }));

            // 3. สร้าง Workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // จัดความกว้าง Column
            worksheet['!cols'] = [
                { wch: 22 }, // Date
                { wch: 15 }, // Type
                { wch: 20 }, // Product
                { wch: 30 }, // Flow
                { wch: 12 }, // Qty
                { wch: 15 }  // User
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, "Report_Summary");
            
            // 4. ตั้งชื่อไฟล์ตาม Filter ที่เลือก
            const fileName = `Report_${selectedType}_${startDate}_to_${endDate}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            // แจ้งเตือน (Optional)
            // await sendNotification("Export Excel", "ดาวน์โหลดรายงานเรียบร้อย", "SUCCESS", "/reports", undefined, 1);

        } catch (error) {
            console.error("Export Error:", error);
            alert("เกิดข้อผิดพลาดในการ Export Excel");
        }
    };

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
        }
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF();
        await addThaiFont(doc);

        doc.setFontSize(18);
        doc.text("รายงานสรุปความเคลื่อนไหว (Stock Movement Report)", 14, 20);
        
        doc.setFontSize(10);
        doc.text(`ช่วงเวลา: ${new Date(startDate).toLocaleDateString('th-TH')} ถึง ${new Date(endDate).toLocaleDateString('th-TH')}`, 14, 28);
        doc.text(`ประเภทรายการ: ${selectedType === 'All' ? 'ทั้งหมด' : selectedType}`, 14, 33);
        doc.text(`พิมพ์โดย: ${currentUser?.firstName || 'Admin'}`, 14, 38);

        autoTable(doc, {
            startY: 45,
            head: [['เวลา', 'ประเภท', 'สินค้า', 'เส้นทาง (Flow)', 'จำนวน']],
            body: reportData.map(item => [
                new Date(item.date).toLocaleString('th-TH'),
                item.type,
                item.productName,
                item.flow,
                item.qty > 0 ? `+${item.qty}` : item.qty
            ]),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, font: 'Sarabun', fontStyle: 'normal' },
            styles: { font: 'Sarabun', fontStyle: 'normal', fontSize: 10, cellPadding: 3 },
        });

        doc.save(`Report_${selectedType}_${startDate}.pdf`);
    };

    return (
        <Box sx={{ pb: 5 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0369a1' }}>
                    <TableView fontSize="large" />
                </Paper>
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                        รายงานความเคลื่อนไหว (Movement Logs)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        ตรวจสอบประวัติการรับ-ส่งผ้า และยอดคงเหลือตามช่วงเวลา
                    </Typography>
                </Box>
            </Box>

            {/* ✅ Filter Section */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6} md={3}>
                        <TextField type="date" label="เริ่มต้น" fullWidth size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <TextField type="date" label="สิ้นสุด" fullWidth size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Grid>
                    
                    {/* ✅ Dropdown ประเภทกิจกรรม */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>ประเภทรายการ</InputLabel>
                            <Select
                                value={selectedType}
                                label="ประเภทรายการ"
                                onChange={(e) => setSelectedType(e.target.value)}
                                startAdornment={<FilterList fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
                            >
                                {activityTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" fullWidth startIcon={<Search />} onClick={handleFetchReport}>ค้นหา</Button>
                    </Grid>
                </Grid>
                
                {/* ปุ่ม Export */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>
                        Export Excel (สรุปยอด)
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                        Export PDF
                    </Button>
                </Box>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ✅ Table Display */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3, maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>วัน/เวลา</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>ประเภท</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สินค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>เส้นทาง (Flow)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>จำนวน</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>โดย</TableCell>
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
                                    ไม่พบประวัติการเคลื่อนไหวตามเงื่อนไขที่เลือก
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
                                                row.type === 'Wash' ? 'info' : 'default'
                                            } 
                                            variant="outlined" 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{row.productName}</TableCell>
                                    
                                    {/* ✅ Flow A -> B */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                            {row.flow}
                                        </Box>
                                    </TableCell>

                                    {/* ✅ จำนวน +/- */}
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: row.qty > 0 ? 'green' : 'red' }}>
                                        {row.qty > 0 ? `+${row.qty}` : row.qty}
                                    </TableCell>
                                    
                                    <TableCell align="center">
                                        <Chip label={row.user} size="small" sx={{ bgcolor: '#f1f5f9', fontSize: '0.75rem' }} />
                                    </TableCell>
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