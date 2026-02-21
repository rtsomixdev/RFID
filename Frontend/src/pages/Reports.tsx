import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Chip, CircularProgress, MenuItem, Select,
    useTheme, alpha, Tabs, Tab
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, Summarize,
    History, Inventory, Refresh
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
    categoryName?: string; // ✅ เพิ่มหมวดหมู่
    sizeSpec?: string;     // ✅ เพิ่มขนาด
    color?: string;        // ✅ เพิ่มสี
    unitName?: string;
    flow: string;
    qty: number;
    user: string;
}

interface StockItem {
    id: string; 
    productName: string;
    categoryName?: string; // ✅ เพิ่มหมวดหมู่
    sizeSpec?: string;     // ✅ เพิ่มขนาด
    color?: string;        // ✅ เพิ่มสี
    isDisposable?: boolean;// ✅ เพิ่มสถานะใช้แล้วทิ้ง
    location: string;
    totalQty: number; 
    unitName: string;
    countedQty?: number; 
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null);

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
        if (currentTab === 0) handleFetchReport();
        else handleFetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTab]); 

    // --- API Handlers ---
    const handleFetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const reqReport = axios.get(`${BASE_URL}/Report/Movement`, {
                params: { start: startDate, end: endDate, type: selectedType }
            });
            // ✅ ดึงข้อมูล Product มาเพื่อจับคู่ สี, ขนาด, หมวดหมู่ ให้รายงานความเคลื่อนไหว
            const reqProducts = axios.get(`${BASE_URL}/Product`);

            const [resReport, resProducts] = await Promise.all([reqReport, reqProducts]);

            const prodMap: Record<string, any> = {};
            (resProducts.data || []).forEach((p: any) => {
                prodMap[p.productName] = {
                    categoryName: p.category?.categoryName || '-',
                    sizeSpec: p.sizeSpec || '-',
                    color: p.color || '-',
                    unitName: p.unitName || 'ชิ้น'
                };
            });

            const enrichedData = resReport.data.map((item: any) => {
                const pInfo = prodMap[item.productName] || {};
                return {
                    ...item,
                    categoryName: pInfo.categoryName || '-',
                    sizeSpec: pInfo.sizeSpec || '-',
                    color: pInfo.color || '-',
                    unitName: item.unitName || pInfo.unitName || 'ชิ้น' 
                };
            });

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
                const p = item.product || {};
                const productName = p.productName || 'สินค้าไม่ระบุ';
                const categoryName = p.category?.categoryName || '-';
                const sizeSpec = p.sizeSpec || '-';
                const color = p.color || '-';
                const isDisposable = p.isDisposable || false;
                const location = item.currentLocation || 'ไม่ระบุตำแหน่ง';
                const unitName = p.unitName || 'ชิ้น';
                
                // ✅ จัดกลุ่มแยกตาม ชื่อ+ขนาด+สี+สถานที่ เพื่อความแม่นยำ
                const key = `${productName}_${sizeSpec}_${color}_${location}`;

                if (!groupedStock[key]) {
                    groupedStock[key] = { 
                        id: key, productName, categoryName, sizeSpec, color, isDisposable, 
                        location, totalQty: 0, unitName, countedQty: undefined 
                    };
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
            
            // ✅ ข้อมูล Excel ที่ครบถ้วน
            const data = reportData.map(item => ({
                "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
                "ประเภท": getActivityLabel(item.type),
                "หมวดหมู่": item.categoryName,
                "ชื่อสินค้า": item.productName,
                "ขนาด": item.sizeSpec,
                "สี": item.color,
                "เส้นทาง (Flow)": item.flow.replace('->', '➜'),
                "จำนวน": item.qty,
                "หน่วยนับ": item.unitName || 'ชิ้น',
                "ผู้ทำรายการ": item.user
            }));
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // ✅ บังคับขยายความกว้างคอลัมน์ Excel อัตโนมัติ
            ws['!cols'] = [
                { wch: 20 }, // วัน/เวลา
                { wch: 18 }, // ประเภท
                { wch: 15 }, // หมวดหมู่
                { wch: 30 }, // ชื่อสินค้า
                { wch: 12 }, // ขนาด
                { wch: 12 }, // สี
                { wch: 25 }, // เส้นทาง
                { wch: 10 }, // จำนวน
                { wch: 10 }, // หน่วยนับ
                { wch: 15 }  // ผู้ทำรายการ
            ];

            XLSX.utils.book_append_sheet(wb, ws, "Movement_Logs");
            XLSX.writeFile(wb, `Movement_${startDate}.xlsx`);

        } else {
            if (stockData.length === 0) return alert("ไม่มีข้อมูล");
            const data = stockData.map(item => ({
                "สถานที่เก็บปัจจุบัน": item.location,
                "หมวดหมู่": item.categoryName,
                "ชื่อสินค้า": item.productName + (item.isDisposable ? ' (ใช้แล้วทิ้ง)' : ''),
                "ขนาด": item.sizeSpec,
                "สี": item.color,
                "ยอดคงเหลือ (System)": item.totalQty,
                "หน่วยนับ": item.unitName,
                "ยอดตรวจนับจริง": item.countedQty !== undefined ? item.countedQty : "",
                "ผลต่าง (Diff)": item.countedQty !== undefined ? (item.countedQty - item.totalQty) : "",
                "สถานะ": getStockStatus(item.totalQty, item.countedQty).label
            }));
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            
            // ✅ ขยายคอลัมน์ Excel สำหรับหน้า Stock
            ws['!cols'] = [
                { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, 
                { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 15 }
            ];
            
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

    // --- ✅ Export PDF (แนวนอน Landscape) ---
    const handleExportPDF = async () => {
        // ✅ เปลี่ยนเป็นแนวนอน ('landscape') เพื่อให้ใส่คอลัมน์ได้เยอะๆ
        const doc = new jsPDF('landscape'); 
        
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
                // ✅ เพิ่มคอลัมน์ หมวดหมู่ ขนาด สี ลงใน PDF
                head: [['เวลา', 'ประเภท', 'หมวดหมู่', 'สินค้า', 'ขนาด', 'สี', 'เส้นทาง', 'จำนวน', 'ผู้ทำรายการ']],
                body: reportData.map(item => [
                    new Date(item.date).toLocaleString('th-TH'),
                    getActivityLabel(item.type),
                    item.categoryName,
                    item.productName,
                    item.sizeSpec,
                    item.color,
                    item.flow.replace('->', '➜'), 
                    `${item.qty} ${item.unitName || 'ชิ้น'}`,
                    item.user
                ]),
                theme: 'grid',
                styles: { font: 'Sarabun', fontSize: 9, fontStyle: 'normal' },
                headStyles: { fillColor: [41, 128, 185], font: 'Sarabun', fontStyle: 'normal' },
                bodyStyles: { font: 'Sarabun', fontStyle: 'normal' } 
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
                // ✅ เพิ่มคอลัมน์ หมวดหมู่ ขนาด สี ลงใน PDF
                head: [['สถานที่', 'สินค้า', 'ขนาด', 'สี', 'ยอดระบบ', 'หน่วย', 'นับจริง', 'ผลต่าง', 'สถานะ']],
                body: stockData.map(item => [
                    item.location,
                    item.productName + (item.isDisposable ? ' (ทิ้ง)' : ''),
                    item.sizeSpec,
                    item.color,
                    item.totalQty,
                    item.unitName,
                    item.countedQty !== undefined ? item.countedQty : '',
                    item.countedQty !== undefined ? (item.countedQty - item.totalQty) : '',
                    getStockStatus(item.totalQty, item.countedQty).label
                ]),
                theme: 'grid',
                styles: { font: 'Sarabun', fontSize: 9, fontStyle: 'normal' },
                headStyles: { fillColor: [46, 125, 50], font: 'Sarabun', fontStyle: 'normal' }, 
                bodyStyles: { font: 'Sarabun', fontStyle: 'normal' } 
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
                                    <TextField type="date" fullWidth size="small" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </FormLabel>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <FormLabel label="วันที่สิ้นสุด">
                                    <TextField type="date" fullWidth size="small" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </FormLabel>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <FormLabel label="ประเภทรายการ">
                                    <Select fullWidth size="small" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} displayEmpty>
                                        {activityTypes.map((type) => (<MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>))}
                                    </Select>
                                </FormLabel>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Button variant="contained" fullWidth startIcon={<Search />} onClick={handleFetchReport} sx={{ height: 40 }}>ค้นหา</Button>
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
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>วัน/เวลา</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>ประเภท</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>สินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>รายละเอียด (สี/ขนาด)</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>เส้นทาง (Flow)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>จำนวน</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>โดย</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress /><Typography variant="body2" sx={{ mt: 2 }}>กำลังโหลด...</Typography></TableCell></TableRow>
                                ) : reportData.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, color: 'text.disabled' }}>ไม่พบข้อมูล</TableCell></TableRow>
                                ) : (
                                    reportData.map((row, idx) => (
                                        <TableRow key={idx} hover>
                                            <TableCell>{new Date(row.date).toLocaleString('th-TH')}</TableCell>
                                            <TableCell>
                                                <Chip label={getActivityLabel(row.type)} size="small" color={getActivityColor(row.type) as any} variant="filled" sx={{ fontWeight: 'normal', minWidth: 90 }} />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'normal', color: 'text.primary' }}>
                                                {row.productName}
                                                <Typography variant="caption" display="block" color="text.secondary">{row.categoryName}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                                {row.color} / {row.sizeSpec}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                                                    {row.flow.replace('->', '➜')}
                                                </Box>
                                            </TableCell>
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
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'normal', width: '25%' }}>สินค้า</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', width: '15%' }}>รายละเอียด</TableCell>
                                    <TableCell sx={{ fontWeight: 'normal', width: '15%' }}>สถานที่เก็บ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '15%', bgcolor: '#f0f9ff' }}>ยอดระบบ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '10%', bgcolor: '#fff7ed' }}>นับจริง</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '10%' }}>ผลต่าง</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'normal', width: '10%' }}>สถานะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                                ) : stockData.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.disabled' }}>ไม่พบข้อมูลสต็อก</TableCell></TableRow>
                                ) : (
                                    stockData.map((item) => {
                                        const status = getStockStatus(item.totalQty, item.countedQty);
                                        return (
                                            <TableRow key={item.id} hover>
                                                <TableCell sx={{ fontWeight: 'normal' }}>
                                                    {item.productName}
                                                    {item.isDisposable && <Chip label="ใช้แล้วทิ้ง" size="small" color="warning" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />}
                                                    <Typography variant="caption" display="block" color="text.secondary">{item.categoryName}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                                    สี: {item.color} <br/> ขนาด: {item.sizeSpec}
                                                </TableCell>
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
                                                        sx={{ width: 80, '& input': { textAlign: 'center', fontWeight: 'normal' } }}
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