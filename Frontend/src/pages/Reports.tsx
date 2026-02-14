import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Chip, CircularProgress, Alert, MenuItem, FormControl, InputLabel, Select,
    useTheme, alpha
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, FilterList, Summarize
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

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
    const theme = useTheme();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedType, setSelectedType] = useState('All');

    const [reportData, setReportData] = useState<MovementItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // ✅ FIX 1: ปรับ Value ให้ตรงกับ Database (ActivityType) เป๊ะๆ
    const activityTypes = [
        { value: 'All', label: 'ทั้งหมด (All Activities)' },
        { value: 'Add', label: 'เพิ่มเข้าระบบ (Add New)' },
        { value: 'SendToWash', label: 'ส่งซัก (Send to Wash)' },
        { value: 'ReceiveWash', label: 'รับเข้าโรงซัก (Receive at Laundry)' },
        { value: 'Restock', label: 'รับผ้าสะอาด/เติมสต็อก (Restock)' },
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

    const handleExportExcel = async () => {
        try {
            if (reportData.length === 0) {
                alert("ไม่มีข้อมูลในตารางให้ Export (กรุณากดค้นหาข้อมูลก่อน)");
                return;
            }

            const excelData = reportData.map(item => ({
                "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
                "ประเภทรายการ": item.type,
                "สินค้า": item.productName,
                "เส้นทาง (Flow)": item.flow,
                "จำนวน (ชิ้น)": item.qty,
                "ผู้ดำเนินการ": item.user
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            worksheet['!cols'] = [
                { wch: 22 }, // Date
                { wch: 15 }, // Type
                { wch: 20 }, // Product
                { wch: 30 }, // Flow
                { wch: 12 }, // Qty
                { wch: 15 }  // User
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, "Report_Summary");

            const fileName = `Report_${selectedType}_${startDate}_to_${endDate}.xlsx`;
            XLSX.writeFile(workbook, fileName);

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
            <PageHeader
                title="รายงานความเคลื่อนไหว (Movement Logs)"
                subtitle="ตรวจสอบประวัติการรับ-ส่งผ้า และยอดคงเหลือตามช่วงเวลา"
                icon={<Summarize fontSize="large" />}
                breadcrumbs={[
                    { label: 'หน้าหลัก', href: '/' },
                    { label: 'รายงาน' }
                ]}
            />

            {/* ✅ Filter Section */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Grid container spacing={3} alignItems="flex-end">
                    <Grid item xs={6} md={3}>
                        <FormLabel label="วันที่เริ่มต้น">
                            <TextField type="date" fullWidth size="medium" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </FormLabel>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FormLabel label="วันที่สิ้นสุด">
                            <TextField type="date" fullWidth size="medium" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </FormLabel>
                    </Grid>

                    {/* ✅ Dropdown ประเภทกิจกรรม */}
                    <Grid item xs={12} md={3}>
                        <FormLabel label="ประเภทรายการ">
                            <Select
                                fullWidth
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                displayEmpty
                            >
                                {activityTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                                ))}
                            </Select>
                        </FormLabel>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            startIcon={<Search />}
                            onClick={handleFetchReport}
                            sx={{ height: 48 }} // Match TextField default height (approx)
                        >
                            ค้นหา
                        </Button>
                    </Grid>
                </Grid>

                {/* ปุ่ม Export */}
                <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>
                        Export Excel
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                        Export PDF
                    </Button>
                </Box>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ✅ Table Display */}
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3, maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>วัน/เวลา</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>ประเภท</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>สินค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>เส้นทาง (Flow)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>จำนวน</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>โดย</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                    <CircularProgress />
                                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>กำลังโหลดข้อมูล...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : reportData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>
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
                                            // ✅ FIX 2: ปรับ Logic สี Chip ให้รองรับ SendToWash และ ReceiveWash
                                            color={
                                                row.type === 'Add' || row.type === 'Restock' ? 'success' :
                                                    row.type === 'Discard' ? 'error' :
                                                        (row.type === 'SendToWash' || row.type === 'ReceiveWash') ? 'info' : // สีฟ้าสำหรับกลุ่มซัก
                                                            'default'
                                            }
                                            variant="filled"
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{row.productName}</TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                            {row.flow}
                                        </Box>
                                    </TableCell>

                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: row.qty > 0 ? 'success.main' : 'error.main' }}>
                                        {row.qty > 0 ? `+${row.qty}` : row.qty}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Chip label={row.user} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
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