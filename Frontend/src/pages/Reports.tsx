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

  // ✅ Helper: ฟังก์ชันโหลด Font จากไฟล์ .ttf (Clean Code)
  const addThaiFont = async (doc: jsPDF) => {
      const fontName = 'THSarabunNew';
      const fontPath = '/fonts/THSarabunNew.ttf'; // ⚠️ ต้องมีไฟล์นี้ใน public/fonts/

      try {
          const response = await fetch(fontPath);
          const blob = await response.blob();
          const reader = new FileReader();

          return new Promise<void>((resolve) => {
              reader.onloadend = () => {
                  const base64data = (reader.result as string).split(',')[1];
                  doc.addFileToVFS(fontName + '.ttf', base64data);
                  doc.addFont(fontName + '.ttf', fontName, 'normal');
                  doc.setFont(fontName);
                  resolve();
              };
              reader.readAsDataURL(blob);
          });
      } catch (error) {
          console.error("Font load error:", error);
          alert("หาไฟล์ Font ไม่เจอ! กรุณาเช็คว่ามีไฟล์ public/fonts/THSarabunNew.ttf หรือไม่");
      }
  };

  // ✅ Export PDF
  const handleExportPDF = async () => {
    if (reportData.length === 0) return alert("ไม่มีข้อมูล");

    const doc = new jsPDF();

    // 1. โหลด Font ก่อนเริ่มวาด (รอจนเสร็จ)
    await addThaiFont(doc);

    // 2. เริ่มวาด Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 28, 'F'); 

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('ระบบจัดการผ้า (Smart RFID)', 14, 18); 

    doc.setFontSize(14);
    doc.text('รายงานสรุปทางการ', 170, 18); 

    // 3. Report Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text('สรุปรายงาน (Report Summary)', 14, 45);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 48, 196, 48); 

    doc.setFontSize(14);
    doc.text(`ประเภทรายงาน: ${reportType === 'damaged' ? 'รายการชำรุด/สูญหาย' : 'การเคลื่อนไหว'}`, 14, 56);
    
    const start = startDate ? new Date(startDate).toLocaleDateString('th-TH') : '-';
    const end = endDate ? new Date(endDate).toLocaleDateString('th-TH') : '-';
    doc.text(`ช่วงเวลา: ${start} ถึง ${end}`, 14, 64);
    doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}`, 130, 56);

    // 4. Table (ใช้ Font ไทยได้แล้ว!)
    autoTable(doc, {
        startY: 75,
        head: [['#', 'วัน/เวลา', 'ชื่อสินค้า', 'RFID Code', 'สถานะ']],
        body: reportData.map((item, index) => [
            index + 1,
            new Date(item.date).toLocaleString('th-TH'),    
            item.product, 
            item.rfid,    
            item.status   
        ]),
        theme: 'grid',
        // ใช้ Font ที่เราโหลดมา
        styles: { font: 'THSarabunNew', fontSize: 13, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 45 },
            2: { cellWidth: 60 },
            4: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 70 }
    });

    // 5. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`หน้า ${i} / ${pageCount}`, 190, doc.internal.pageSize.height - 10);
        doc.text('Smart RFID System - Confidential', 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Report_${reportType}.pdf`);
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return alert("ไม่มีข้อมูล");
    const excelData = reportData.map(item => ({
        "วัน/เวลา": new Date(item.date).toLocaleString('th-TH'),
        "ชื่อสินค้า": item.product,
        "RFID Code": item.rfid,
        "สถานะ": item.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const wscols = [{ wch: 22 }, { wch: 30 }, { wch: 35 }, { wch: 15 }];
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
                    <Button variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                        PDF (Thai Font)
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