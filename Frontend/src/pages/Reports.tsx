import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Grid, TextField, Button, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Card, CardContent, Chip 
} from '@mui/material';
import { 
  PictureAsPdf, TableView, Search, Download 
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ✅ 1. Import ไฟล์ Font ภาษาไทยที่คุณเพิ่งสร้าง
import '../assets/MyThaiFont.js'; 

interface ReportItem {
    date: string;
    product: string;
    rfid: string;
    status: string;
}

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('damaged');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportItem[]>([]);

  const handlePreview = async () => {
    try {
      const res = await axiosClient.get('/Report', {
        params: { type: reportType, startDate, endDate }
      });
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching data');
    }
  };

  // ✅ Export PDF (Fixed Thai Font)
  const handleExportPDF = async () => {
    if (reportData.length === 0) return alert("ไม่มีข้อมูล");

    const doc = new jsPDF();

    // ✅ 2. ตั้งค่าให้ใช้ Font ภาษาไทย
    doc.setFont('THSarabun');

    // Header Design
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('ระบบ Smart RFID', 14, 16); // ใช้ภาษาไทยได้แล้ว!

    doc.setFontSize(12);
    doc.text('เอกสารรายงานสรุป', 160, 16);

    // Report Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('สรุปรายงาน (Report Summary)', 14, 40);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(12);
    doc.text(`ประเภทรายงาน:`, 14, 50);
    doc.setFont(undefined, 'bold');
    doc.text(`${reportType === 'damaged' ? 'ผ้าชำรุด/สูญหาย' : 'การเคลื่อนไหว'}`, 45, 50);

    doc.setFont(undefined, 'normal');
    doc.text(`ช่วงเวลา:`, 14, 58);
    doc.text(`${startDate || 'ทั้งหมด'} ถึง ${endDate || 'ปัจจุบัน'}`, 45, 58);

    doc.text(`พิมพ์เมื่อ:`, 140, 50);
    doc.text(`${new Date().toLocaleString('th-TH')}`, 160, 50);

    // Table
    autoTable(doc, {
        startY: 65,
        head: [['ลำดับ', 'วันที่/เวลา', 'ชื่อสินค้า', 'RFID Code', 'สถานะ']], // หัวตารางไทย
        body: reportData.map((item, index) => [
            index + 1,
            item.date,    
            item.product, // ชื่อสินค้าไทยจะแสดงถูกต้อง!
            item.rfid,    
            item.status === 'Damaged' ? 'ชำรุด' : (item.status === 'Lost' ? 'สูญหาย' : item.status)
        ]),
        theme: 'grid',
        // ✅ 3. ตั้งค่า Font ภาษาไทยให้ตาราง
        styles: { font: 'THSarabun', fontSize: 12, cellPadding: 3 },
        headStyles: { 
            fillColor: [41, 128, 185], 
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 35 },
            2: { cellWidth: 55 },
            3: { font: 'courier', cellWidth: 50 }, // RFID ใช้ Font อังกฤษปกติ
            4: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 60 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(240, 240, 240);
        doc.rect(0, doc.internal.pageSize.height - 20, 210, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('© 2026 Smart RFID Management System. เอกสารภายใน.', 14, doc.internal.pageSize.height - 8);
        doc.text(`หน้า ${i} จาก ${pageCount}`, 180, doc.internal.pageSize.height - 8);
    }

    doc.save(`SmartRFID_Report_${reportType}.pdf`);
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return alert("ไม่มีข้อมูล");
    const excelData = reportData.map(item => ({
        "Date/Time": item.date,
        "Product Name": item.product,
        "RFID Code": item.rfid,
        "Status": item.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const wscols = [{ wch: 20 }, { wch: 30 }, { wch: 35 }, { wch: 15 }];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `report_${reportType}.xlsx`);
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#e0e7ff', color: '#4338ca' }}>
            <Download fontSize="large" />
        </Paper>
        <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
                ระบบออกรายงาน (Reports Center)
            </Typography>
            <Typography variant="body2" color="textSecondary">
                เลือกช่วงเวลาและประเภทรายงานที่ต้องการ Export
            </Typography>
        </Box>
      </Box>

      {/* Filter Card */}
      <Card sx={{ borderRadius: 3, mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <TextField 
                        select fullWidth label="เลือกประเภทรายงาน" size="small"
                        value={reportType} onChange={(e) => setReportType(e.target.value)}
                    >
                        <MenuItem value="damaged">สรุปรายการผ้าชำรุด/สูญหาย</MenuItem>
                        <MenuItem value="movement">สรุปการเคลื่อนไหว (เข้า-ออก)</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField 
                        type="date" fullWidth label="วันที่เริ่มต้น" size="small" InputLabelProps={{ shrink: true }}
                        value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField 
                        type="date" fullWidth label="วันที่สิ้นสุด" size="small" InputLabelProps={{ shrink: true }}
                        value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button 
                        fullWidth variant="contained" 
                        startIcon={<Search />} onClick={handlePreview}
                        sx={{ height: '40px', borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        เรียกดูข้อมูล
                    </Button>
                </Grid>
            </Grid>
        </CardContent>
      </Card>

      {/* Result Table */}
      {reportData.length > 0 ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="textSecondary">
                    ผลลัพธ์: {reportData.length} รายการ
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                        PDF (ภาษาไทย)
                    </Button>
                    <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>
                        Excel
                    </Button>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', maxHeight: 500 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>วันที่/เวลา</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สินค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>RFID Code</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reportData.map((row, idx) => (
                            <TableRow key={idx} hover>
                                <TableCell>{row.date}</TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{row.product}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', color: '#64748b' }}>{row.rfid}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={row.status} 
                                        size="small" 
                                        color={row.status === 'Damaged' || row.status === 'Lost' ? 'error' : 'success'} 
                                        variant="filled" 
                                        sx={{ borderRadius: 1 }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
          </>
      ) : (
        <Paper sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 3 }}>
            <Typography color="textSecondary" variant="body1">
                ไม่พบข้อมูลในช่วงเวลาที่เลือก
            </Typography>
            <Typography variant="caption" color="textDisabled">
                กรุณาเลือกเงื่อนไขใหม่และกดปุ่ม "เรียกดูข้อมูล"
            </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Reports;