import React, { useState } from 'react';
import { 
  Box, Paper, Typography, Grid, TextField, Button, MenuItem, 
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, 
  Card, CardContent, Chip 
} from '@mui/material';
import { 
  PictureAsPdf, TableView, Search, Download 
} from '@mui/icons-material';
import axiosClient from '../api/axiosClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// *** ไม่ต้อง Import Font ***

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
      alert('Error: ไม่สามารถดึงข้อมูลได้');
    }
  };

  // ✅ ฟังก์ชันโหลด Font "Sarabun"
  const loadThaiFont = async (doc: jsPDF) => {
      try {
          // ⚠️ ต้องมีไฟล์ public/fonts/Sarabun-Regular.ttf
          const response = await fetch('/fonts/Sarabun-Regular.ttf');
          if (!response.ok) throw new Error("หาไฟล์ Font ไม่เจอ");
          
          const blob = await response.blob();
          const reader = new FileReader();

          return new Promise<void>((resolve) => {
              reader.onloadend = () => {
                  const base64data = (reader.result as string).split(',')[1];
                  
                  // เพิ่ม Font Sarabun
                  doc.addFileToVFS('Sarabun.ttf', base64data);
                  doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
                  doc.addFont('Sarabun.ttf', 'Sarabun', 'bold'); // Register กัน Crash
                  doc.setFont('Sarabun');
                  
                  resolve();
              };
              reader.readAsDataURL(blob);
          });
      } catch (error) {
          console.error("Font Error:", error);
          alert("โหลด Font ไม่ได้: กรุณาโหลดไฟล์ Sarabun-Regular.ttf ใส่ใน public/fonts/");
      }
  };

  const handleExportPDF = async () => {
    if (reportData.length === 0) return alert("ไม่มีข้อมูลสำหรับ Export");

    try {
        const doc = new jsPDF();

        // 1. โหลด Font
        await loadThaiFont(doc);

        // 2. Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 25, 'F'); 

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('ระบบจัดการผ้า (Smart RFID)', 14, 17); 

        doc.setFontSize(14);
        doc.text('รายงานสรุป', 175, 17); 

        // 3. Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`รายงาน: ${reportType === 'damaged' ? 'ผ้าชำรุด/สูญหาย' : 'การเคลื่อนไหว'}`, 14, 40);
        
        doc.setFontSize(12);
        const printDate = new Date().toLocaleString('th-TH');
        doc.text(`วันที่พิมพ์: ${printDate}`, 14, 48);

        // 4. Table
        autoTable(doc, {
            startY: 55,
            head: [['ลำดับ', 'วัน/เวลา', 'ชื่อสินค้า', 'RFID Code', 'สถานะ']],
            body: reportData.map((item, index) => [
                index + 1,
                new Date(item.date).toLocaleString('th-TH'),    
                item.product || '-', 
                item.rfid || '-',    
                item.status || '-'   
            ]),
            theme: 'grid',
            styles: { 
                font: 'Sarabun', // ✅ ใช้ Font Sarabun
                fontSize: 10, 
                cellPadding: 3 
            },
            headStyles: { 
                fillColor: [41, 128, 185], 
                textColor: 255, 
                font: 'Sarabun',
                fontStyle: 'bold', // ถ้าใช้ Sarabun-Regular ไฟล์เดียวอาจต้องเปลี่ยนเป็น normal ถ้ายัง Crash
                halign: 'center' 
            }
        });

        doc.save(`Report_${reportType}.pdf`);

    } catch (error) {
        console.error("PDF Error:", error);
        alert("เกิดข้อผิดพลาดในการสร้าง PDF");
    }
  };

  const handleExportExcel = () => {
    // ... (ส่วน Excel เหมือนเดิม)
    const excelData = reportData.map(item => ({
        "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
        "ชื่อสินค้า": item.product,
        "RFID Code": item.rfid,
        "สถานะ": item.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
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
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
            ระบบออกรายงาน (Reports Center)
        </Typography>
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
      {reportData.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
                <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                    PDF (Sarabun)
                </Button>
                <Button variant="outlined" color="success" startIcon={<TableView />} onClick={handleExportExcel}>
                    Excel
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', maxHeight: 500 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>วัน/เวลา</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>ชื่อสินค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>RFID Code</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>สถานะ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reportData.map((row, idx) => (
                            <TableRow key={idx} hover>
                                <TableCell>{new Date(row.date).toLocaleString('th-TH')}</TableCell>
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
      )}
    </Box>
  );
};

export default Reports;