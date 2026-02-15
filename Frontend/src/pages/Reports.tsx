import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Chip, CircularProgress, Alert, MenuItem, FormControl, InputLabel, Select,
    useTheme, alpha, Tabs, Tab, Divider, IconButton
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, FilterList, Summarize,
    History, Inventory, ArrowRightAlt, Save, Refresh
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

// ⚠️ URL Backend
const BASE_URL = 'http://localhost:5134/api';

// --- Interfaces ---
interface MovementItem {
    id: number;
    date: string;
    type: string;
    productName: string;
    unitName?: string;
    flow: string;
    qty: number;
    user: string;
}

interface StockItem {
    id: string; // Composite Key (Product_Location)
    productName: string;
    location: string;
    totalQty: number; // System Qty
    unitName: string;
    countedQty?: number; // Physical Count (Editable)
}

// --- Helper Functions ---
const getActivityLabel = (type: string) => {
    const t = type || '';
    if (t === 'Add' || t === 'New') return 'เพิ่มเข้าระบบ';
    if (t === 'Restock') return 'รับเข้าคลัง';
    if (t === 'SendToWash' || t === 'Wash' || t === 'ส่งซัก') return 'ส่งซัก';
    if (t === 'ReceiveWash' || t === 'Clean') return 'รับผ้าสะอาด';
    if (t === 'Discard' || t === 'Lost') return 'จำหน่าย/ชำรุด';
    if (t === 'Move') return 'ย้ายสถานที่';
    if (t === 'Check') return 'ตรวจสอบ';
    if (t === 'Reuse') return 'นำกลับมาใช้ใหม่';
    if (t === 'Dispatch') return 'เบิกจ่าย';
    return t;
};

const getActivityColor = (type: string) => {
    const t = type || '';
    if (['Add', 'New', 'Restock', 'Reuse', 'พร้อมใช้'].some(k => t.includes(k))) return 'success';
    if (['SendToWash', 'Wash', 'ReceiveWash', 'Move', 'Dispatch', 'ส่งซัก'].some(k => t.includes(k))) return 'info';
    if (['Discard', 'Lost', 'Damaged', 'จำหน่าย'].some(k => t.includes(k))) return 'error';
    if (['Check', 'ตรวจสอบ'].some(k => t.includes(k))) return 'warning';
    return 'default';
};

const Reports: React.FC = () => {
    const theme = useTheme();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedType, setSelectedType] = useState('All');
    const [reportData, setReportData] = useState<MovementItem[]>([]);
    
    // ✅ Tabs & Stock Data
    const [currentTab, setCurrentTab] = useState(0); 
    const [stockData, setStockData] = useState<StockItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Filter Options
    const activityTypes = [
        { value: 'All', label: 'ทั้งหมด (All Activities)' },
        { value: 'Add', label: 'เพิ่มเข้าระบบ (Add New)' },
        { value: 'SendToWash', label: 'ส่งซัก (Send to Wash)' },
        { value: 'Restock', label: 'รับเข้าคลัง (Restock)' },
        { value: 'Discard', label: 'ตัดจำหน่าย (Discard)' },
        { value: 'Move', label: 'ย้ายตำแหน่ง (Move)' },
        { value: 'Reuse', label: 'นำกลับมาใช้ใหม่ (Reuse)' }
    ];

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try { setCurrentUser(JSON.parse(userStr)); } catch (e) { }
        }
        
        if (currentTab === 0) handleFetchReport();
        else handleFetchStock();

    }, [currentTab]); 

    // --- API Handlers ---
    const handleFetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const reqReport = axios.get(`${BASE_URL}/Report/Movement`, {
                params: { start: startDate, end: endDate, type: selectedType }
            });
            const reqUnits = axios.get(`${BASE_URL}/Linen`);

            const [resReport, resUnits] = await Promise.all([reqReport, reqUnits]);

            const unitMap: Record<string, string> = {};
            (resUnits.data || []).forEach((item: any) => {
                if (item.product?.productName && item.product?.unitName) {
                    unitMap[item.product.productName] = item.product.unitName;
                }
            });

            const enrichedData = resReport.data.map((item: any) => ({
                ...item,
                unitName: item.unitName || unitMap[item.productName] || 'ชิ้น' 
            }));

            setReportData(enrichedData);
        } catch (err) {
            console.error("Error fetching report:", err);
            setError("ไม่สามารถดึงข้อมูลรายงานได้");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchStock = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE_URL}/Linen`);
            const allLinens: any[] = res.data || [];

            const groupedStock: { [key: string]: StockItem } = {};

            allLinens.forEach(item => {
                const productName = item.product?.productName || 'สินค้าไม่ระบุ';
                const location = item.currentLocation || 'ไม่ระบุตำแหน่ง';
                const unitName = item.product?.unitName || 'ชิ้น';
                const key = `${productName}_${location}`;

                if (!groupedStock[key]) {
                    groupedStock[key] = { id: key, productName, location, totalQty: 0, unitName, countedQty: undefined };
                }
                groupedStock[key].totalQty += 1;
            });

            const initialStock = Object.values(groupedStock).map(item => ({
                ...item,
                countedQty: undefined 
            }));

            setStockData(initialStock);

        } catch (err) {
            console.error("Error fetching stock:", err);
            setError("ไม่สามารถดึงข้อมูลสต็อกได้");
            setStockData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCountChange = (id: string, val: string) => {
        const numVal = val === '' ? undefined : parseInt(val);
        setStockData(prev => prev.map(item => 
            item.id === id ? { ...item, countedQty: numVal } : item
        ));
    };

    // --- Export Handlers ---
    const handleExportExcel = () => {
        if (currentTab === 0) {
            if (reportData.length === 0) return alert("ไม่มีข้อมูล");
            const data = reportData.map(item => ({
                "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
                "ประเภท": getActivityLabel(item.type),
                "สินค้า": item.productName,
                "เส้นทาง": item.flow,
                "จำนวน": item.qty,
                "หน่วยนับ": item.unitName || 'ชิ้น',
                "ผู้ทำรายการ": item.user
            }));
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Movement_Logs");
            XLSX.writeFile(wb, `Movement_${startDate}.xlsx`);
        } else {
            if (stockData.length === 0) return alert("ไม่มีข้อมูล");
            const data = stockData.map(item => ({
                "สินค้า": item.productName,
                "สถานที่เก็บปัจจุบัน": item.location,
                "ยอดคงเหลือ (System)": item.totalQty,
                "หน่วยนับ": item.unitName,
                "ยอดตรวจนับจริง": item.countedQty !== undefined ? item.countedQty : "",
                "ผลต่าง (Diff)": item.countedQty !== undefined ? (item.countedQty - item.totalQty) : "",
                "สถานะ": getStockStatus(item.totalQty, item.countedQty).label
            }));
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws, "Stock_Balance");
            XLSX.writeFile(wb, `Stock_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    // ✅ ฟังก์ชันโหลดฟอนต์
    const addThaiFont = async (doc: jsPDF) => {
        try {
            const response = await fetch('/fonts/Sarabun-Regular.ttf');
            if (!response.ok) throw new Error('ไม่พบไฟล์ฟอนต์ Sarabun-Regular.ttf');
            
            const blob = await response.blob();
            const reader = new FileReader();
            
            return new Promise<void>((resolve, reject) => {
                reader.onloadend = () => {
                    if (reader.result) {
                        const base64data = (reader.result as string).split(',')[1];
                        // ✅ เพิ่มฟอนต์เข้า jsPDF
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
            alert("ไม่สามารถโหลดฟอนต์ภาษาไทยได้ กรุณาตรวจสอบไฟล์ public/fonts/Sarabun-Regular.ttf");
        }
    };

    // --- ✅ Export PDF (ใช้ตัวบางทั้งหมด) ---
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        
        // 1. โหลดฟอนต์ก่อนเริ่มวาด
        await addThaiFont(doc);

        doc.setFontSize(18);
        
        if (currentTab === 0) {
            // --- Movement Logs PDF ---
            if (reportData.length === 0) return alert("ไม่มีข้อมูล");
            
            doc.text("รายงานสรุปความเคลื่อนไหว (Movement Logs)", 14, 20);
            doc.setFontSize(10);
            doc.text(`ช่วงเวลา: ${new Date(startDate).toLocaleDateString('th-TH')} ถึง ${new Date(endDate).toLocaleDateString('th-TH')}`, 14, 28);
            doc.text(`ประเภท: ${selectedType}`, 14, 34);

            autoTable(doc, {
                startY: 40,
                head: [['เวลา', 'ประเภท', 'สินค้า', 'เส้นทาง', 'จำนวน', 'ผู้ทำรายการ']],
                body: reportData.map(item => [
                    new Date(item.date).toLocaleString('th-TH'),
                    getActivityLabel(item.type),
                    item.productName,
                    item.flow,
                    `${item.qty} ${item.unitName || 'ชิ้น'}`,
                    item.user
                ]),
                theme: 'grid',
                styles: { 
                    font: 'Sarabun', 
                    fontSize: 10,
                    fontStyle: 'normal' // 🔴 บังคับใช้ตัวบางทั้งหมด
                },
                headStyles: { 
                    fillColor: [41, 128, 185], 
                    font: 'Sarabun',
                    fontStyle: 'normal' // 🔴 บังคับ Header ใช้ตัวบาง (แก้ปัญหาเพี้ยน)
                },
                bodyStyles: { 
                    font: 'Sarabun',
                    fontStyle: 'normal' // 🔴 บังคับ Body ใช้ตัวบาง
                } 
            });
            doc.save(`Movement_${startDate}.pdf`);

        } else {
            // --- Stock Balance PDF ---
            if (stockData.length === 0) return alert("ไม่มีข้อมูล");
            
            doc.text("รายงานยอดคงเหลือและตรวจสอบสต็อก (Stock Audit)", 14, 20);
            doc.setFontSize(10);
            doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}`, 14, 28);

            autoTable(doc, {
                startY: 35,
                head: [['สินค้า', 'สถานที่', 'ยอดระบบ', 'หน่วย', 'นับจริง', 'ผลต่าง', 'สถานะ']],
                body: stockData.map(item => [
                    item.productName,
                    item.location,
                    item.totalQty,
                    item.unitName,
                    item.countedQty !== undefined ? item.countedQty : '',
                    item.countedQty !== undefined ? (item.countedQty - item.totalQty) : '',
                    getStockStatus(item.totalQty, item.countedQty).label
                ]),
                theme: 'grid',
                styles: { 
                    font: 'Sarabun', 
                    fontSize: 10,
                    fontStyle: 'normal' // 🔴 บังคับใช้ตัวบาง
                },
                headStyles: { 
                    fillColor: [46, 125, 50], 
                    font: 'Sarabun',
                    fontStyle: 'normal' // 🔴 บังคับใช้ตัวบาง
                }, 
                bodyStyles: { 
                    font: 'Sarabun',
                    fontStyle: 'normal' // 🔴 บังคับใช้ตัวบาง
                } 
            });
            doc.save(`Stock_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
        }
    };

    const getStockStatus = (system: number, counted?: number) => {
        if (counted === undefined) return { label: 'รอตรวจนับ', color: 'default' };
        const diff = counted - system;
        if (diff === 0) return { label: 'ครบ', color: 'success' };
        if (diff < 0) return { label: `ขาด ${Math.abs(diff)}`, color: 'error' };
        return { label: `เกิน ${diff}`, color: 'warning' };
    };

    return (
        <Box sx={{ pb: 5 }}>
            <PageHeader
                title="ระบบออกรายงาน (Reports Center)"
                subtitle="เลือกดูประวัติการเคลื่อนไหว หรือ ตรวจสอบยอดคงเหลือปัจจุบัน"
                icon={<Summarize fontSize="large" />}
                breadcrumbs={[{ label: 'หน้าหลัก', href: '/' }, { label: 'รายงาน' }]}
            />

            {/* TAB SWITCHER */}
            <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} aria-label="report tabs">
                    <Tab icon={<History />} label="ประวัติความเคลื่อนไหว (Movement Logs)" iconPosition="start" />
                    <Tab icon={<Inventory />} label="ตรวจสอบสต็อก (Stock Audit)" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* 🔴 TAB 1: MOVEMENT LOGS */}
            {currentTab === 0 && (
                <>
                    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <Grid container spacing={3} alignItems="flex-end">
                            <Grid item xs={6} md={3}>
                                <FormLabel label="วันที่เริ่มต้น">
                                    <TextField type="date" fullWidth value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </FormLabel>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <FormLabel label="วันที่สิ้นสุด">
                                    <TextField type="date" fullWidth value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </FormLabel>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormLabel label="ประเภทรายการ">
                                    <Select fullWidth value={selectedType} onChange={(e) => setSelectedType(e.target.value)} displayEmpty>
                                        {activityTypes.map((type) => (<MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>))}
                                    </Select>
                                </FormLabel>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Button variant="contained" fullWidth size="large" startIcon={<Search />} onClick={handleFetchReport} sx={{ height: 48 }}>ค้นหา</Button>
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>Export Excel</Button>
                            <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>Export PDF</Button>
                        </Box>
                    </Paper>

                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3, maxHeight: 600 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {/* 🔴 แก้ไข: เอา fontWeight: 'bold' ออก และใช้ 'normal' แทน */}
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>วัน/เวลา</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>ประเภท</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>สินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>เส้นทาง (Flow)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>จำนวน</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>โดย</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><CircularProgress /><Typography variant="body2" sx={{ mt: 2 }}>กำลังโหลด...</Typography></TableCell></TableRow>
                                ) : reportData.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.disabled' }}>ไม่พบข้อมูล</TableCell></TableRow>
                                ) : (
                                    reportData.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{new Date(row.date).toLocaleString('th-TH')}</TableCell>
                                            <TableCell>
                                                {/* 🔴 แก้ไข: เอาตัวหนาออกจาก Chip */}
                                                <Chip label={getActivityLabel(row.type)} size="small" color={getActivityColor(row.type) as any} variant="filled" sx={{ fontWeight: 'normal', minWidth: 90 }} />
                                            </TableCell>
                                            {/* 🔴 แก้ไข: เอา fontWeight: 600 ออก */}
                                            <TableCell sx={{ fontWeight: 'normal', color: 'text.primary' }}>{row.productName}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                                    {row.flow.replace('->', '➜')}
                                                </Box>
                                            </TableCell>
                                            {/* 🔴 แก้ไข: เอา fontWeight: 'bold' ออก */}
                                            <TableCell align="right" sx={{ fontWeight: 'normal', color: 'text.primary' }}>
                                                {row.qty} {row.unitName || 'ชิ้น'}
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
                </>
            )}

            {/* 🔵 TAB 2: STOCK BALANCE (AUDIT MODE) */}
            {currentTab === 1 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            * กรอกยอดที่นับได้จริงในช่องขวาสุด ระบบจะคำนวณผลต่างให้อัตโนมัติ
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" startIcon={<Refresh />} onClick={handleFetchStock}>รีเฟรชข้อมูล</Button>
                            <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>Export PDF</Button>
                            <Button variant="contained" color="success" startIcon={<TableView />} onClick={handleExportExcel}>Export Stock Sheet</Button>
                        </Box>
                    </Box>
                    
                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {/* 🔴 แก้ไข: Header Tab 2 เปลี่ยนเป็นตัวบางทั้งหมด */}
                                    <TableCell sx={{ fontWeight: 'normal', width: '30%' }}>สินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', width: '20%' }}>สถานที่เก็บ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '15%', bgcolor: '#f0f9ff' }}>ยอดระบบ (System)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '15%', bgcolor: '#fff7ed' }}>ยอดนับจริง (Count)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '10%' }}>ผลต่าง (Diff)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '10%' }}>สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                                ) : stockData.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.disabled' }}>ไม่พบข้อมูลสต็อก</TableCell></TableRow>
                                ) : (
                                    stockData.map((item) => {
                                        const status = getStockStatus(item.totalQty, item.countedQty);
                                        return (
                                            <TableRow key={item.id} hover>
                                                {/* 🔴 แก้ไข: Body Tab 2 เปลี่ยนเป็นตัวบางทั้งหมด */}
                                                <TableCell sx={{ fontWeight: 'normal' }}>{item.productName}</TableCell>
                                                <TableCell>
                                                    <Chip icon={<Inventory sx={{ fontSize: 16 }} />} label={item.location} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'normal', fontSize: '1.1rem', bgcolor: '#f0f9ff' }}>
                                                    {item.totalQty} <Typography variant="caption" color="text.secondary">{item.unitName}</Typography>
                                                </TableCell>
                                                <TableCell align="center" sx={{ bgcolor: '#fff7ed' }}>
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        placeholder="0"
                                                        value={item.countedQty !== undefined ? item.countedQty : ''}
                                                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                        sx={{ width: 80, '& input': { textAlign: 'center', fontWeight: 'normal' } }} // 🔴 input text normal
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.countedQty !== undefined ? (
                                                        <Typography fontWeight="normal" color={status.color === 'success' ? 'success.main' : status.color === 'error' ? 'error.main' : 'warning.main'}>
                                                            {item.countedQty - item.totalQty > 0 ? `+${item.countedQty - item.totalQty}` : item.countedQty - item.totalQty}
                                                        </Typography>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={status.label} color={status.color as any} size="small" sx={{ minWidth: 80 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Box>
    );
};

export default Reports;