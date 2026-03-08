import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * โครงสร้างข้อมูลสำหรับป้ายกำกับอินพุตที่มีรูปแบบมาตรฐาน
 * @interface FormLabelProps
 * @property {string} label ข้อความแสดงความหมายของช่อง
 * @property {boolean} [required] ข้อกำหนดว่าจำเป็นต้องมี (หากเป็นสีแดงเพิ่มเครื่องหมายดอกจัน)
 * @property {React.ReactNode} children ตัวครอบอินพุตที่จะใส่คู่กับป้าย
 */
interface FormLabelProps {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}

/**
 * คอมโพเนนต์ป้ายกำกับอินพุตครอบจักรวาล ทำหน้าที่ห่อหุ้มช่องกรอกข้อมูล
 * คอยแทรกดอกจันสีแดงท้ายชื่อข้อความกรณีบังคับต้องใส่เนื้อหา
 * 
 * @param {FormLabelProps} props ระบุหัวข้อและความจำเป็น
 * @returns {JSX.Element} เลย์เอาท์กล่องบรรจุภัณฑ์ข้อมูลย่อยพร้อมป้ายหัวเรื่อง
 */
const FormLabel: React.FC<FormLabelProps> = ({ label, required, children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
            <Typography variant="caption" fontWeight="600" color="text.secondary" sx={{ ml: 0.5 }}>
                {label} {required && <Box component="span" sx={{ color: 'error.main' }}>*</Box>}
            </Typography>
            {children}
        </Box>
    );
};

export default FormLabel;
