import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Stack, Divider } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

/**
 * ข้อมูลสำหรับป้ายส่วนหัวของหน้าเพจ
 * @interface PageHeaderProps
 * @property {string} title ชื่อเรื่องหลัก
 * @property {string} [subtitle] คำอธิบายเสริม
 * @property {React.ReactNode} [icon] สัญลักษณ์ไอคอนประดับ
 * @property {React.ReactNode} [action] คอมโพเนนต์ด้านขวา (เช่น ปุ่มเพิ่มรายการ)
 * @property {Array} [breadcrumbs] เส้นทางลิงก์โครงสร้างชั้นแบบต้นไม้
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

/**
 * คอมโพเนนต์ส่วนหัวเรื่องมาตรฐาน นำเสนอชื่อเรื่องพร้อมทั้งส่วนปฏิบัติการที่ปรับยืดหยุ่นได้
 * รวมถึงรองรับการแสดงเส้นทาง (Breadcrumbs) นำทางด้านบน
 * 
 * @param {PageHeaderProps} props ข้อมูลองค์ประกอบส่วนหัว
 * @returns {JSX.Element} เลย์เอาท์ส่วนหัวหน้า
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, action, breadcrumbs }) => {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 1.5, fontSize: '0.85rem' }}
        >
          {breadcrumbs.map((crumb, index) => (
            crumb.href ? (
              <Link key={index} underline="hover" color="inherit" href={crumb.href}>
                {crumb.label}
              </Link>
            ) : (
              <Typography key={index} color="text.primary" fontSize="inherit">
                {crumb.label}
              </Typography>
            )
          ))}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {icon && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                bgcolor: 'primary.light',
                color: '#fff',
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: (theme) => `0 4px 12px ${theme.palette.primary.main}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {action && (
          <Box>
            {action}
          </Box>
        )}
      </Stack>

      <Divider sx={{ mt: 3, mb: 0 }} />
    </Box>
  );
};

export default PageHeader;
