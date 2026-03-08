import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, TextField, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell,
    Chip, CircularProgress, MenuItem, Select, IconButton, Tooltip,
    useTheme, alpha, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TablePagination
} from '@mui/material';
import {
    PictureAsPdf, TableView, Search, Summarize,
    History, Inventory, Refresh, AddComment, Comment
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// ✅ เปลี่ยนกลับมาใช้ axiosClient เพื่อให้อิง BaseURL แบบเดียวกับทั้งโปรเจกต์
import axiosClient from '../api/axiosClient';
import Swal from 'sweetalert2';
import PageHeader from '../components/ui/PageHeader';
import FormLabel from '../components/ui/FormLabel';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);
dayjs.locale('th');

class AdapterDayjsBuddhist extends AdapterDayjs {
    formatByString = (date: Dayjs, formatString: string) => {
        return dayjs(date).format(formatString.replace(/YYYY/g, 'BBBB'));
    };
}

/**
 * โครงสร้างข้อมูลรายการประวัติความเคลื่อนไหว
 * @interface MovementItem
 */
interface MovementItem {
    id: number;
    date: string;
    type: string;
    productName: string;
    categoryName?: string;
    sizeSpec?: string;
    color?: string;
    unitName?: string;
    flow: string;
    qty: number;
    user: string;
    description?: string;
}

/**
 * โครงสร้างข้อมูลสต็อกสินค้า
 * @interface StockItem
 */
interface StockItem {
    id: string;
    productName: string;
    categoryName?: string;
    sizeSpec?: string;
    color?: string;
    isDisposable?: boolean;
    location: string;
    totalQty: number;
    unitName: string;
    countedQty?: number;
}

/**
 * โครงสร้างข้อมูลสถานที่ (Ward/Location)
 * @interface LocationItem
 */
interface LocationItem {
    locationId: number;
    locationName: string;
}

const getActivityLabel = (type: string) => {
    const t = type ? type.toUpperCase() : '';
    if (t === 'ADD' || t === 'NEW') return 'เพิ่มเข้าระบบ';
    if (t === 'RESTOCK') return 'รับเข้าคลัง';
    if (t === 'SENDTOWASH' || t === 'WASH' || t === 'ส่งซัก') return 'ส่งซัก';
    if (t === 'REWASH' || t === 'ส่งซักซ้ำ') return 'ส่งซักซ้ำ';
    if (t === 'RECEIVEWASH' || t === 'CLEAN') return 'รับผ้าสะอาด';
    if (t === 'DISCARD' || t === 'LOST' || t === 'DAMAGED' || t === 'จำหน่ายออก') return 'จำหน่ายออก';
    if (t === 'MOVE') return 'ย้ายสถานที่';
    if (t === 'CHECK') return 'ตรวจสอบ';
    if (t === 'REUSE') return 'นำกลับมาใช้ใหม่';
    if (t === 'DISPATCH' || t === 'เบิกจ่าย') return 'เบิกจ่าย';
    return type;
};

const getActivityColor = (type: string) => {
    const t = type ? type.toUpperCase() : '';
    if (['ADD', 'NEW', 'RESTOCK', 'REUSE', 'พร้อมใช้'].some(k => t.includes(k))) return 'success';
    if (['REWASH', 'ส่งซักซ้ำ'].some(k => t.includes(k))) return 'secondary';
    if (['SENDTOWASH', 'WASH', 'RECEIVEWASH', 'MOVE', 'DISPATCH', 'ส่งซัก', 'เบิกจ่าย'].some(k => t.includes(k))) return 'info';
    if (['DISCARD', 'LOST', 'DAMAGED', 'จำหน่าย', 'ชำรุด'].some(k => t.includes(k))) return 'error';
    if (['CHECK', 'ตรวจสอบ'].some(k => t.includes(k))) return 'warning';
    return 'default';
};

/**
 * หน้าจอระบบออกรายงาน
 * 
 * @returns {JSX.Element} คอมโพเนนต์หน้าจอออกรายงาน (Reports Center)
 */
const Reports: React.FC = () => {
    const theme = useTheme();

    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

    const [selectedType, setSelectedType] = useState('All');
    const [selectedLocation, setSelectedLocation] = useState('All');

    const [reportData, setReportData] = useState<MovementItem[]>([]);
    const [stockData, setStockData] = useState<StockItem[]>([]);

    const [locations, setLocations] = useState<LocationItem[]>([]);

    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [openNoteDialog, setOpenNoteDialog] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');

    const [page1, setPage1] = useState(0);
    const [rowsPerPage1, setRowsPerPage1] = useState(10);
    const handleChangePage1 = (event: unknown, newPage: number) => setPage1(newPage);
    const handleChangeRowsPerPage1 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage1(+event.target.value);
        setPage1(0);
    };

    const [page2, setPage2] = useState(0);
    const [rowsPerPage2, setRowsPerPage2] = useState(10);
    const handleChangePage2 = (event: unknown, newPage: number) => setPage2(newPage);
    const handleChangeRowsPerPage2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage2(+event.target.value);
        setPage2(0);
    };

    const activityTypes = [
        { value: 'All', label: 'ทั้งหมด (All Activities)' },
        { value: 'Add', label: 'เพิ่มเข้าระบบ (Add New)' },
        { value: 'SendToWash', label: 'ส่งซัก (Send to Wash)' },
        { value: 'ReWash', label: 'ส่งซักซ้ำ (Re-wash)' },
        { value: 'Restock', label: 'รับเข้าคลัง (Restock)' },
        { value: 'DISCARD', label: 'ตัดจำหน่าย (Discard)' },
        { value: 'Move', label: 'ย้ายตำแหน่ง (Move)' },
        { value: 'Reuse', label: 'นำกลับมาใช้ใหม่ (Reuse)' },
        { value: 'Dispatch', label: 'เบิกจ่าย (Dispatch)' }
    ];

    useEffect(() => {
        fetchLocations();
        if (currentTab === 0) handleFetchReport();
        else handleFetchStock();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTab]);

    const fetchLocations = async () => {
        try {
            const res = await axiosClient.get('/Ward');
            const data = res.data || [];
            const formattedLocations = data.map((item: any, index: number) => ({
                locationId: item.wardId || item.id || index,
                locationName: item.wardName || item.name || ''
            }));
            setLocations(formattedLocations);
        } catch (err) {
            console.error("Failed to load Wards", err);
        }
    };

    const handleFetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const reqReport = axiosClient.get('/Report/Movement', {
                params: {
                    start: startDate?.format('YYYY-MM-DD'),
                    end: endDate?.format('YYYY-MM-DD'),
                    type: 'All'
                }
            });
            const reqProducts = axiosClient.get('/Product');

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

            let enrichedData = resReport.data.map((item: any) => {
                const pInfo = prodMap[item.productName] || {};
                return {
                    ...item,
                    categoryName: pInfo.categoryName || '-',
                    sizeSpec: pInfo.sizeSpec || '-',
                    color: pInfo.color || '-',
                    unitName: item.unitName || pInfo.unitName || 'ชิ้น',
                    // ดึงข้อมูลหมายเหตุจาก API มาแสดงผลด้วย
                    description: item.description || ''
                };
            });

            if (selectedType !== 'All') {
                enrichedData = enrichedData.filter((item: any) => {
                    const itemType = (item.type || '').toUpperCase();
                    if (selectedType === 'DISCARD') {
                        return itemType === 'DISCARD' || itemType === 'LOST' || itemType === 'DAMAGED' || itemType === 'จำหน่ายออก' || itemType === 'ชำรุด';
                    }
                    return itemType.includes(selectedType.toUpperCase());
                });
            }

            setReportData(enrichedData);
        } catch (err) {
            console.error("Error fetching report:", err);
            setError("ไม่สามารถดึงข้อมูลรายงานได้");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNote = (logId: number, currentNote?: string) => {
        setSelectedLogId(logId);
        setNoteText(currentNote || '');
        setOpenNoteDialog(true);
    };

    // ฟังก์ชันส่งคำขอไปยัง API เพื่อบันทึกหมายเหตุ
    const handleSaveNote = async () => {
        if (!selectedLogId) return;
        try {
            // เรียกใช้งาน axiosClient และระบุเส้นทางให้ตรงกับที่ Backend กำหนดไว้
            await axiosClient.put(`/Linen/Log/${selectedLogId}/note`, { note: noteText });
            Swal.fire({ icon: 'success', title: 'บันทึกหมายเหตุเรียบร้อย', timer: 1500, showConfirmButton: false });
            setOpenNoteDialog(false);

            // โหลดข้อมูลรายงานใหม่เพื่อแสดงผลล่าสุดบนหน้าจอทันที
            handleFetchReport();
        } catch (err) {
            console.error("Save Note Error:", err);
            Swal.fire('Error', 'ไม่สามารถบันทึกได้ กรุณาลองใหม่', 'error');
        }
    };

    const handleFetchStock = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axiosClient.get('/Linen');
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
                ...item, countedQty: undefined
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

    const filteredReportData = selectedLocation === 'All'
        ? reportData
        : reportData.filter(item => item.flow.includes(selectedLocation));

    const filteredStockData = selectedLocation === 'All'
        ? stockData
        : stockData.filter(item => item.location === selectedLocation);

    // ==========================================
    // ส่วนจัดการการส่งออกข้อมูล (Export Logic)
    // ==========================================
    const handleExportExcel = () => {
        if (currentTab === 0) {
            if (filteredReportData.length === 0) return alert("ไม่มีข้อมูล");

            const data = filteredReportData.map(item => ({
                "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
                "ประเภท": getActivityLabel(item.type),
                "หมวดหมู่": item.categoryName,
                "ชื่อสินค้า": item.productName,
                "ขนาด": item.sizeSpec,
                "สี": item.color,
                "เส้นทาง (Flow)": item.flow.replace('->', '➜'),
                "จำนวน": item.qty,
                "หน่วยนับ": item.unitName || 'ชิ้น',
                "ผู้ทำรายการ": item.user,
                "หมายเหตุ": item.description || '-' // เพิ่มหมายเหตุในไฟล์ Excel
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            ws['!cols'] = [
                { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 12 },
                { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, "Movement_Logs");
            XLSX.writeFile(wb, `Movement_${startDate?.format('YYYY-MM-DD')}.xlsx`);

        } else {
            if (filteredStockData.length === 0) return alert("ไม่มีข้อมูล");
            const data = filteredStockData.map(item => ({
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

            ws['!cols'] = [
                { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
                { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 15 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, "Stock_Balance");
            XLSX.writeFile(wb, `Stock_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

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

    const handleExportPDF = async () => {
        const doc = new jsPDF('landscape');

        await addThaiFont(doc);
        doc.setFontSize(18);

        if (currentTab === 0) {
            if (filteredReportData.length === 0) return alert("ไม่มีข้อมูล");

            doc.text("รายงานสรุปความเคลื่อนไหว (Movement Logs)", 14, 20);
            doc.setFontSize(10);

            const startStr = startDate ? startDate.format('DD/MM/BBBB') : '';
            const endStr = endDate ? endDate.format('DD/MM/BBBB') : '';
            doc.text(`ช่วงเวลา: ${startStr} ถึง ${endStr}`, 14, 28);
            doc.text(`สถานที่: ${selectedLocation === 'All' ? 'ทั้งหมด' : selectedLocation}   |   ประเภท: ${selectedType}`, 14, 34);

            autoTable(doc, {
                startY: 40,
                head: [['เวลา', 'ประเภท', 'หมวดหมู่', 'สินค้า', 'ขนาด/สี', 'เส้นทาง', 'จำนวน', 'หมายเหตุ']],
                body: filteredReportData.map(item => [
                    new Date(item.date).toLocaleString('th-TH'),
                    getActivityLabel(item.type),
                    item.categoryName,
                    item.productName,
                    `${item.sizeSpec} / ${item.color}`,
                    item.flow.replace('->', '➜'),
                    `${item.qty} ${item.unitName || 'ชิ้น'}`,
                    item.description || '-' // ดึงหมายเหตุมาแสดงใน PDF
                ]),
                theme: 'grid',
                styles: { font: 'Sarabun', fontSize: 8, fontStyle: 'normal' },
                headStyles: { fillColor: [41, 128, 185], font: 'Sarabun', fontStyle: 'normal' },
                bodyStyles: { font: 'Sarabun', fontStyle: 'normal' }
            });
            doc.save(`Movement_${startDate?.format('YYYY-MM-DD')}.pdf`);

        } else {
            if (filteredStockData.length === 0) return alert("ไม่มีข้อมูล");

            doc.text("รายงานยอดคงเหลือและตรวจสอบสต็อก (Stock Audit)", 14, 20);
            doc.setFontSize(10);
            doc.text(`ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}   |   สถานที่: ${selectedLocation === 'All' ? 'ทั้งหมด' : selectedLocation}`, 14, 28);

            autoTable(doc, {
                startY: 35,
                head: [['สถานที่', 'สินค้า', 'ขนาด', 'สี', 'ยอดระบบ', 'หน่วย', 'นับจริง', 'ผลต่าง', 'สถานะ']],
                body: filteredStockData.map(item => [
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
        <LocalizationProvider dateAdapter={AdapterDayjsBuddhist} adapterLocale="th">
            <Box sx={{ pb: 5 }}>
                <PageHeader
                    title="ระบบออกรายงาน (Reports Center)"
                    subtitle="เลือกดูประวัติการเคลื่อนไหว หรือ ตรวจสอบยอดคงเหลือปัจจุบัน"
                    icon={<Summarize fontSize="large" />}
                    breadcrumbs={[{ label: 'หน้าหลัก', href: '/' }, { label: 'รายงาน' }]}
                />

                <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={currentTab} onChange={(_, v) => { setCurrentTab(v); setSelectedLocation('All'); }} aria-label="report tabs">
                        <Tab icon={<History />} label="ประวัติความเคลื่อนไหว (Movement Logs)" iconPosition="start" />
                        <Tab icon={<Inventory />} label="ตรวจสอบสต็อก (Stock Audit)" iconPosition="start" />
                    </Tabs>
                </Paper>

                {/* ======================= แท็บ 0: ประวัติความเคลื่อนไหว (Movement Logs) ======================= */}
                {currentTab === 0 && (
                    <>
                        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <Grid container spacing={2} alignItems="flex-end">
                                <Grid item xs={6} md={2.5}>
                                    <FormLabel label="วันที่เริ่มต้น">
                                        <DatePicker
                                            format="DD/MM/YYYY"
                                            value={startDate}
                                            onChange={(newValue) => setStartDate(newValue)}
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        />
                                    </FormLabel>
                                </Grid>
                                <Grid item xs={6} md={2.5}>
                                    <FormLabel label="วันที่สิ้นสุด">
                                        <DatePicker
                                            format="DD/MM/YYYY"
                                            value={endDate}
                                            onChange={(newValue) => setEndDate(newValue)}
                                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                        />
                                    </FormLabel>
                                </Grid>
                                <Grid item xs={12} md={2.5}>
                                    <FormLabel label="ประเภทรายการ">
                                        <Select fullWidth size="small" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} displayEmpty>
                                            {activityTypes.map((type) => (<MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>))}
                                        </Select>
                                    </FormLabel>
                                </Grid>
                                <Grid item xs={12} md={2.5}>
                                    <FormLabel label="สถานที่ (Location)">
                                        <Select fullWidth size="small" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} displayEmpty>
                                            <MenuItem value="All">ทั้งหมด (All Locations)</MenuItem>
                                            {locations.map((loc) => (
                                                <MenuItem key={loc.locationId} value={loc.locationName}>{loc.locationName}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormLabel>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <Button variant="contained" fullWidth startIcon={<Search />} onClick={handleFetchReport} sx={{ height: 40 }}>ค้นหา</Button>
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${theme.palette.divider}`, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>Export Excel</Button>
                                <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>Export PDF</Button>
                            </Box>
                        </Paper>

                        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>วัน/เวลา</TableCell>
                                        <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>ประเภท</TableCell>
                                        <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>สินค้า</TableCell>
                                        <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>รายละเอียด</TableCell>
                                        <TableCell sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>เส้นทาง (Flow)</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>จำนวน</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'normal', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>หมายเหตุ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                                    ) : filteredReportData.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8, color: 'text.disabled' }}>ไม่พบข้อมูล</TableCell></TableRow>
                                    ) : (
                                        filteredReportData.slice(page1 * rowsPerPage1, page1 * rowsPerPage1 + rowsPerPage1).map((row, idx) => (
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
                                                    {row.description ? (
                                                        <Tooltip title={row.description}>
                                                            <Chip
                                                                icon={<Comment fontSize="small" />}
                                                                label="มีหมายเหตุ"
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                                onClick={() => handleOpenNote(row.id, row.description)}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="เพิ่มหมายเหตุ (เช่น แจ้งเปื้อน/ชำรุด)">
                                                            <IconButton size="small" onClick={() => handleOpenNote(row.id, '')} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                                                <AddComment fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={filteredReportData.length}
                            rowsPerPage={rowsPerPage1}
                            page={page1}
                            onPageChange={handleChangePage1}
                            onRowsPerPageChange={handleChangeRowsPerPage1}
                        />
                    </>
                )}

                {/* ======================= แท็บ 1: ตรวจสอบสต็อก (Stock) ======================= */}
                {currentTab === 1 && (
                    <>
                        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormLabel label="กรองตามสถานที่ (Location)" />
                            <Select size="small" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} displayEmpty sx={{ width: 300 }}>
                                <MenuItem value="All">แสดงทั้งหมด (All Locations)</MenuItem>
                                {locations.map((loc) => (
                                    <MenuItem key={loc.locationId} value={loc.locationName}>{loc.locationName}</MenuItem>
                                ))}
                            </Select>
                            <Box sx={{ flexGrow: 1 }} />
                            <Button variant="outlined" startIcon={<Refresh />} onClick={handleFetchStock}>รีเฟรชข้อมูล</Button>
                            <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>Export PDF</Button>
                            <Button variant="contained" color="success" startIcon={<TableView />} onClick={handleExportExcel}>Export Stock Sheet</Button>
                        </Paper>

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
                                    ) : filteredStockData.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.disabled' }}>ไม่พบข้อมูลสต็อก</TableCell></TableRow>
                                    ) : (
                                        filteredStockData.slice(page2 * rowsPerPage2, page2 * rowsPerPage2 + rowsPerPage2).map((item) => {
                                            const status = getStockStatus(item.totalQty, item.countedQty);
                                            return (
                                                <TableRow key={item.id} hover>
                                                    <TableCell sx={{ fontWeight: 'normal' }}>
                                                        {item.productName}
                                                        {item.isDisposable && <Chip label="ใช้แล้วทิ้ง" size="small" color="warning" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />}
                                                        <Typography variant="caption" display="block" color="text.secondary">{item.categoryName}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                                        สี: {item.color} <br /> ขนาด: {item.sizeSpec}
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
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={filteredStockData.length}
                            rowsPerPage={rowsPerPage2}
                            page={page2}
                            onPageChange={handleChangePage2}
                            onRowsPerPageChange={handleChangeRowsPerPage2}
                        />
                    </>
                )}

                {/* หน้าต่าง (Dialog) สำหรับกรอกหมายเหตุและแจ้งชำรุด */}
                <Dialog open={openNoteDialog} onClose={() => setOpenNoteDialog(false)} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AddComment color="primary" /> เพิ่ม/แก้ไขหมายเหตุ (แจ้งชำรุด)
                    </DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="รายละเอียด (เช่น เปื้อนหมึกซักไม่ออก, ขาดมุมขวา)"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenNoteDialog(false)} color="inherit">ยกเลิก</Button>
                        <Button onClick={handleSaveNote} variant="contained" color="warning">บันทึกข้อมูล</Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </LocalizationProvider>
    );
};

export default Reports;