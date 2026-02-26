# 🏥 ระบบจัดการผ้าอัจฉริยะ (Linen Management System with RFID)

ระบบจัดการผ้าอัจฉริยะแบบ Full-stack ที่บูรณาการความสามารถของเทคโนโลยี RFID (Radio Frequency Identification) และ IoT (Internet of Things) เข้าด้วยกัน เพื่อยกระดับการติดตามสถานะ จัดการสต็อกคงคลัง และเพิ่มประสิทธิภาพกระบวนการซักรีด การเบิกจ่าย และการหมุนเวียนของการใช้งานผ้าในสภาพแวดล้อมต่างๆ เช่น โรงพยาบาล หรือสถานพยาบาล ระบบช่วยลดปัญหาการสูญหายของผ้า สามารถดูข้อมูลเชิงสถิติได้แบบเรียลไทม์ และจัดการพนักงานหรือแผนกที่เกี่ยวข้องได้อย่างมีประสิทธิภาพสูงสุด

---

## 1. 🌟 ภาพรวมโปรเจกต์ (Project Overview)

ระบบนี้ออกแบบมาเพื่อตอบโจทย์ปัญหาการจัดการผ้า (Linen) จำนวนมากในระดับองค์กร โดยกระบวนการทำงานหลักครอบคลุมถึง:
- **การจัดการสต็อกและคลัง (Inventory Management):** การลงทะเบียนผ้าใหม่เข้าสู่ระบบ, การตรวจสอบยอดคงเหลือ, การระบุสถานที่เก็บรักษา
- **กระบวนการใช้งานและการเบิกจ่าย (Request & Dispatch):** การสร้างคำร้องขอเบิกผ้าใหม่, ขอเปลี่ยนผ้าที่ชำรุด, หรือส่งคืนผ้าส่วนเกินกลับคลัง พร้อมระบบการอนุมัติ (Approval Workflow)
- **กระบวนการซักรีด (Laundry Process):** สแกนเพื่อส่งซัก (Dispatch to Laundry), ประเมินรอบซักสูงสุด, และรับผ้าสะอาดกลับเข้าคลัง
- **การติดตามเรียลไทม์ผ่าน RFID (Real-time RFID Tracking):** รองรับการสแกน RFID Tag แบบจำนวนมาก (Batch Scan) ผ่านเครื่องอ่าน RFID อุตสาหกรรม โดยไม่ต้องนับด้วยมือทีละชิ้น
- **การแจ้งเตือนและการรายงาน (Notification & Reports):** ระบบการแจ้งเตือนพนักงานแบบเรียลไทม์เมื่อมีการร้องขอหรืออนุมัติ และรายงานสรุปข้อมูลเชิงสถิติ (Dashboard & Export)

---

## 2. 🏗️ สถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)

ระบบแบ่งออกเป็น 2 ส่วนหลักคือ Backend และ Frontend พร้อมการเชื่อมต่อกับอุปกรณ์ฮาร์ดแวร์ (IoT) อย่างสมบูรณ์

### 🔹 Backend (เซิร์ฟเวอร์และ API)
- **Framework:** .NET 9 (C#) สำรหับการพัฒนา Web API สมรรถนะสูง
- **Database:** PostgreSQL จัดการฐานข้อมูลเชิงสัมพันธ์ผ่าน `Npgsql.EntityFrameworkCore.PostgreSQL`
- **ORM:** Entity Framework Core (Code-First Approach)
- **Authentication & Authorization:** Cookie-based Authentication เข้ารหัสและแนบสิทธิ์พนักงาน (Role & Permissions) ลงใน HTTP-Only Cookie ป้องกัน XSS
- **Real-time Communication:** Microsoft SignalR สำหรับการส่งข้อมูล Notification และเหตุการณ์การสแกน RFID ทันทีไปยังหน้าจอผู้ใช้
- **IoT & Hardware Interface:** MQTTnet ใช้สำหรับเป็น Listener Service และ Publisher เพื่อสื่อสารกับเครื่องอ่าน RFID (ส่งคำสั่ง WAKE / SLEEP หรือรับข้อมูล RFiD Tags)
- **API Documentation:** Swagger (`Swashbuckle.AspNetCore`)

### 🔹 Frontend (ส่วนแสดงผลผู้ใช้งาน)
- **Framework:** React 18 ร่วมกับ TypeScript เพื่อการตรวจสอบ Type ที่เข้มงวด
- **Build Tool:** Vite เพื่อการ Build และ HMR ที่รวดเร็ว
- **UI Component Library:** Material-UI (MUI `v5`) ออกแบบหน้าจอให้มีความทันสมัยและใช้งานง่าย
- **Routing:** React Router DOM สำหรับการนำทางแบบ SPA (Single Page Application) พร้อม `PermissionGuard` ป้องกันการเข้าถึงหน้าจอที่ไม่ได้รับอนุญาต
- **HTTP Client:** Axios (ตั้งค่า Proxy `/api` ไปที่ backend ผ่าน `vite.config.ts`) เพื่อเรียกใช้ API
- **Real-time Engine:** `@microsoft/signalr` ในการเชื่อมต่อ WebSocket
- **Alert & Toast:** SweetAlert2 สำหรับหน้าต่างแจ้งเตือนและข้อความตอบกลับ

### 🔹 Hardware Integration (การผสานรวมฮาร์ดแวร์)
- **RFID Readers:** ฮาร์ดแวร์ภายนอกที่ส่งข้อมูลและรับคำสั่งผ่านโปรโตคอล MQTT
- **Data Flow:** ฮาร์ดแวร์อ่านค่า RFID -> ส่งผ่านตังกลาง MQTT Broker -> Backend (MqttListenerService) แปลงค่าและบันทึกลง Database -> Backend กระจายข้อความผ่าน SignalR Hub -> หน้า Frontend จับ Event (`OnScan`) และส่งข้อมูลเข้าสู่ React State ทำให้ผู้ใช้เห็นรายการผ้าปรากฏขึ้นทันทีโดยไม่ต้องคลิกใดๆ

---

## 3. 🔌 เอกสารระบบ API (Exhaustive API Documentation)

API Controllers ทั้งหมดถูกพัฒนาเพื่อรองรับฟังก์ชันการทำงานที่ครอบคลุม โดยมีการรับส่งข้อมูลผ่านโมเดล DTO (Data Transfer Objects) รายละเอียด Controller และ Endpoints ทั้งหมดมีดังนี้:

### 1. `AuthController` (ระบบบัญชีและการยืนยันตัวตน)
- **POST `/api/Auth/Login`**: ล็อกอินเข้าสู่ระบบ ระบบจะส่งคืนข้อมูลผู้ใช้และสร้างคุกกี้เซสชัน
- **POST `/api/Auth/Logout`**: ออกจากระบบ รันคำสั่งล้างคุกกี้
- **POST `/api/Auth/RequestOtp`**: ขอรหัส OTP สำหรับตั้งรหัสผ่านใหม่ (ต้องระบุ Email)
- **POST `/api/Auth/VerifyOtp`**: ตรวจสอบความถูกต้องของรหัส OTP
- **POST `/api/Auth/ResetPassword`**: รีเซ็ตและตั้งรหัสผ่านใหม่

### 2. `CategoryController` (หมวดหมู่สินค้าผ้า)
- **GET `/api/Category`**: ดึงรายการหมวดหมู่ผ้าทั้งหมด
- **GET `/api/Category/{id}`**: ดึงข้อมูลหมวดหมู่ผ้าเฉพาะ ID
- **POST `/api/Category`**: สร้างหมวดหมู่ใหม่
- **PUT `/api/Category/{id}`**: แก้ไขชื่อหมวดหมู่
- **DELETE `/api/Category/{id}`**: ลบหมวดหมู่

### 3. `DamageReasonController` (เหตุผลในการชำรุด)
- **GET `/api/DamageReason`**: ดึงสาเหตุการชำรุดทั้งหมด
- **GET `/api/DamageReason/{id}`**: ดึงข้อมูลสาเหตุการชำรุดเฉพาะ ID
- **POST `/api/DamageReason`**: เพิ่มสาเหตุการชำรุดใหม่
- **PUT `/api/DamageReason/{id}`**: แก้ไขสาเหตุการชำรุด
- **DELETE `/api/DamageReason/{id}`**: ลบสาเหตุการชำรุด

### 4. `DashboardController` (ข้อมูลหน้าแรกและสถิติ)
- **GET `/api/Dashboard/Stats`**: ดึงข้อมูลสถิติรูปแบบตัวเลขรวม (จำนวนผ้าทั้งหมด, ผ้าซักอยู่, ผ้าพร้อมใช้งาน, ผ้าชำรุด, คำร้องที่รอดำเนินการ, จำนวนรับเข้า-ส่งออกรายวัน)
- **GET `/api/Dashboard/Charts`**: ดึงข้อมูลโครงสร้างอาร์เรย์สำหรับกราฟ (ข้อมูลหมวดหมู่ผ้า, กิจกรรมรายวัน, คำร้องขอรายเดือน, อัตราผ้าชำรุด, สถานะปริมาณรอบซัก)

### 5. `HospitalController` (สาขาและโรงพยาบาล)
- **GET `/api/Hospital`**: ดึงรายชื่อโรงพยาบาลทั้งหมด
- **GET `/api/Hospital/{id}`**: ดึงข้อมูลโรงพยาบาลเฉพาะ ID
- **POST `/api/Hospital`**: สร้างข้อมูลโรงพยาบาลใหม่
- **PUT `/api/Hospital/{id}`**: แก้ไขรายละเอียดโรงพยาบาล
- **DELETE `/api/Hospital/{id}`**: ลบข้อมูลโรงพยาบาล (มีการตรวจสอบเงื่อนไข Foreign Key ดักจับ Error หากมีการอ้างอิงอยู่)

### 6. `LaundryController` (ระบบการซักรีด)
- **POST `/api/Laundry/Send`**: ส่งผ้าออกไปซักตามรายการ RFID Code อัปเดตสถานะเป็น "Washing" บันทึกลง Logs พร้อมสถานที่
- **POST `/api/Laundry/Receive`**: รับผ้าที่ซักเสร็จแล้วกลับเข้ามา อัปเดตสถานะเป็น "Available" บันทึกลง Logs และเพิ่มจำนวนรอบซัก (+1 WashCount)
- **POST `/api/Laundry/Check`**: เช็คข้อมูลสถานะปัจจุบันและรายละเอียดสินค้าของรหัส RFID ที่ส่งเข้ามาเพื่อขึ้นแสดงบนหน้าจอ
- **GET `/api/Laundry/History`**: ประวัติการทำรายการซักรีด
- **POST `/api/Laundry/CancelTask`**: ยกเลิกกระบวนการซักและเปลี่ยนสถานะผ้ากลับไปที่จุดเดิม

### 7. `LinenController` (การบริหารจัดการผ้า)
- **GET `/api/Linen`**: ดึงรายการผ้าทั้งหมด
- **GET `/api/Linen/{id}`**: ดึงข้อมูลผ้าเฉพาะ ID หรือ RFID Code
- **POST `/api/Linen`**: แทรกข้อมูลผ้า 1 รายการ
- **PUT `/api/Linen/{id}`**: อัปเดตข้อมูลผ้า 1 รายการ
- **DELETE `/api/Linen/{id}`**: ลบข้อมูลผ้า 1 รายการ
- **POST `/api/Linen/Scan`**: ประมวลผลการสแกนอเนกประสงค์ผ่าน Hardware สแกน โดยรับ `ActionType` (`DISPATCH`, `RECEIVE`, `WASH`, `CHECK`) มาเปลี่ยนสถานะ
- **POST `/api/Linen/RegisterBatch`**: ลงทะเบียนผ้าใหม่ทีละหลายรายการแบบชุด (Batch) พร้อมคำนวณรอบซักและผูกข้อมูลสถานที่เริ่มต้นให้ทันที
- **POST `/api/Linen/Discard`**: แทงจำหน่ายผ้าทีละชิ้น
- **POST `/api/Linen/DiscardBatch`**: แทงจำหน่ายผ้าเป็นชุดพร้อมระบุเหตุผลการชำรุด (`DamageReasonId`)
- **GET `/api/Linen/Monitor/Latest`**: ดึงรายการบันทึกการเคลื่อนไหวล่าสุดเพื่อแสดงบนหน้าจอติดตาม

### 8. `LinenLogController` (ประวัติการใช้งานผ้า)
- **GET `/api/LinenLog`**: ดึงบันทึกเหตุการณ์ประวัติของผ้าทั้งหมด
- **GET `/api/LinenLog/{id}`**: ดึงบันทึกใดๆ ด้วย ID
- **POST `/api/LinenLog`**: บันทึกเหตุการณ์ผ้าด้วยตนเอง
- **PUT `/api/LinenLog/{id}`**: อัปเดตข้อมูลบันทึก
- **DELETE `/api/LinenLog/{id}`**: ลบบันทึกข้อมูลการหมุนเวียน

### 9. `NotificationController` (ระบบศูนย์กลางแจ้งเตือน)
- **GET `/api/Notification/MyNotifications`**: ดึงข้อความแจ้งเตือนส่วนตัวของผู้ถือเซสชัน
- **POST `/api/Notification/MarkAsRead`**: กำหนดสถานะ Notification ใดๆ ว่าอ่านแล้ว
- **POST `/api/Notification/MarkAllAsRead`**: กำหนด Notification ทั้งหมดให้อ่านแล้ว เพื่อให้ UI ซ่อนตัวเลขกลมๆ สีแดง
- **POST `/api/Notification/SendRole`**: ยิงคำสั่งสร้างแจ้งเตือนไปยังกลุ่ม Role เฉพาะเจาะจง พร้อมบรอดแคสต์ไปที่ SignalR
- **POST `/api/Notification/SendUser`**: ยิงคำสั่งสร้างแจ้งเตือนแบบเจาะจงรายบุคคล (User ID) พร้อมบรอดแคสต์ไปที่ SignalR

### 10. `ProductController` (แม่แบบแค็ตตาล็อกสินค้าผ้า)
- **GET `/api/Product`**: ดึงรายการสินค้าทั้งหมด
- **GET `/api/Product/{id}`**: ดึงข้อมูลสินค้าใดๆ ด้วย ID
- **POST `/api/Product`**: สร้างสินค้าใหม่ (ระบุชื่อ, รหัส, ขนาด, น้ำหนัก และรอบการซักล่วงหน้า)
- **PUT `/api/Product/{id}`**: แก้ไขสินค้า
- **DELETE `/api/Product/{id}`**: ลบสินค้าออกจากระบบ
- **GET `/api/Product/ExportStock`**: ส่วนส่งออกไฟล์รายงานแบบ API ดึงยอดสต็อกทั้งหมดในแต่ละหมวดหมู่ เพื่อแปลงสภาพหน้าบ้านเป็น Excel หรือ PDF (ด้วย React)

### 11. `ReaderController` (ระบบฮาร์ดแวร์ตู้และเสาสแกน)
- **GET `/api/Reader`**: ดึงรายการเครื่องอ่าน RFID ทั้งหมด
- **GET `/api/Reader/{id}`**: ดึงเครื่องอ่านเฉพาะตัว
- **POST `/api/Reader`**: เพิ่มข้อมูลและตั้งค่า IP ของเครื่องอ่านใหม่ลงระบบ
- **PUT `/api/Reader/{id}`**: อัปเดตการตั้งค่าของเครื่องอ่าน
- **DELETE `/api/Reader/{id}`**: ลบเครื่องอ่านออกจากระบบ
- **POST `/api/Reader/Command`**: ส่งคำสั่ง (Payload Command เช่น WAKE หรือ SLEEP) ไปยังอุปกรณ์ IoT เครื่องอ่าน RFID ผ่าน MQTT Protocol ใน Backend Service

### 12. `ReportController` (ระบบรายงาน)
- **GET `/api/Report/LinenMovement`**: สร้างรายงานการเคลื่อนไหวของผ้าและการหมุนเวียนระหว่างสถานที่
- **GET `/api/Report/DamagedLinen`**: สร้างรายงานผ้าที่ถูกแทงจำหน่ายหรือชำรุด พร้อมสรุปข้ออ้างอิงสาเหตุที่เกิดความเสียหายเยอะที่สุด

### 13. `RequestController` (คำร้องใบเบิกและการอนุมัติ)
- **GET `/api/Request`**: ดึงประวัติรายการคำร้องขอทั้งหมด
- **GET `/api/Request/{id}`**: ดึงคำร้องและไอเท็มประกอบคำร้อง (RequestItems)
- **POST `/api/Request`**: สร้างชุดคำร้องใหม่ (เบิก, เปลี่ยน, ส่งคืน) Backend มีระบบตรวจสอบเพื่อป้องกันคำขอเกินระดับสต็อกคลังกลาง (Stock Checking Logic)
- **PUT `/api/Request/{id}`**: อัปเดตรายละเอียดคำร้อง การเปลี่ยนสถานะไปถึงการ Approve/Reject แจ้งเตือนจะถูกยิงจากส่วนนี้
- **DELETE `/api/Request/{id}`**: ยกเลิกคำร้อง
- **GET `/api/Request/CheckStock/{productId}`**: ตรวจสอบสต็อคผ้าตัวแม่แบบ ว่าปริมาณคงเหลือสำหรับการตั้งเบิกมีจำนวนเท่าไหร่ (พร้อมลบสถานะผ้าที่ซักอยู่ไม่อนุญาตให้เบิก)

### 14. `RequestItemController` (รายการขอย่อยในคำร้อง)
- **GET `/api/RequestItem`**: สินค้าย่อยที่อยู่ใน Request
- **GET `/api/RequestItem/{id}`**: ข้อมูลเฉพาะรายการย่อย
- **POST `/api/RequestItem`**: ส่วนเพิ่มรายการย่อยเข้าไปยัง Request ที่มีอยู่
- **PUT `/api/RequestItem/{id}`**: อัปเดตรายการย่อย (เช่น ปรับจำนวน)
- **DELETE `/api/RequestItem/{id}`**: ลบรายการย่อย

### 15. `RequestStatusController` (ข้อมูลสถานะ Master Data)
- **GET `/api/RequestStatus`**: ดึง Master Data ของสถานะคำขอต่างๆ
- **GET `/api/RequestStatus/{id}`**: ดูข้อมูลเจาะจง
- **POST `/api/RequestStatus`**: สร้างข้อความสถานะใหม่
- **PUT `/api/RequestStatus/{id}`**: แก้ไขสถานะ
- **DELETE `/api/RequestStatus/{id}`**: ลบสถานะ

### 16. `RoleController` (บทบาทของพนักงานระบบ)
- **GET `/api/Role`**: ดูรายการยศหรือ Roles ทั้งหมด ระบบจะ Include สิทธิ์การเข้าถึงเมนูต่างๆ (`RolePermissions`) มาด้วย
- **GET `/api/Role/Permissions`**: ดึงรายการสิทธิ์ Master ขัั้นสูงสำหรับทำหน้าจอ Checkbox เลือกสิทธิ์ให้ทีมงาน
- **GET `/api/Role/{id}`**: ดึง Role เดี่ยวๆ 
- **POST `/api/Role`**: สร้างประเภทผู้ใช้งานใหม่ พร้อมแนบ Array จำนวนสิทธิ์ที่อนุญาต
- **PUT `/api/Role/{id}`**: แก้ไขชื่อ Role หรือ ปรับเปลี่ยน PermissionIds
- **DELETE `/api/Role/{id}`**: ลบ Role ทิ้ง

### 17. `RoomController` (ห้องย่อยภายในอาคารและวอร์ด)
- **GET `/api/Room`**: ดึงรายการห้องすべて
- **GET `/api/Room/{id}`**: ห้องเดี่ยวๆ 
- **POST `/api/Room`**: เพิ่มห้อง
- **PUT `/api/Room/{id}`**: แก้ไขข้อมูลห้อง
- **DELETE `/api/Room/{id}`**: ลบห้อง

### 18. `SettingController` (ระบบกำหนดค่าส่วนกลาง)
- **GET `/api/Setting`**: อ่าน Configuration พื้นฐานทั้งหมดของโปรเจกต์ เช่น อีเมล SMTP และจำนวนรอบซักเบื้องต้น
- **PUT `/api/Setting/Update`**: บันทึกการตั้งค่าที่ถูกเปลี่ยนแปลงโดย Admin ลงไปในกระแสฐานข้อมูล
- **POST `/api/Setting`**: เผื่อใช้สำหรับสร้าง Key ตัวแปร Config ตัวใหม่

### 19. `SpecialTagController` (แท็กกรณีเสริมสำหรับ RFID)
- **GET `/api/SpecialTag`**: อ่านแท็กฉุกเฉิน
- **GET `/api/SpecialTag/{id}`**: ดึงเฉพาะค่าแท็ก
- **POST `/api/SpecialTag`**: ลงทะเบียนบัญชีแท็กประเภทพิเศษ เช็คซ้ำก่อนว่ามี ID ในระบบหรือไม่
- **PUT `/api/SpecialTag/{id}`**: แก้ไขคุณสมบัติ
- **DELETE `/api/SpecialTag/{id}`**: ลบทิ้ง

### 20. `TitleController` (จัดการข้อมูลคำนำหน้าชื่อ)
- **GET `/api/Title`**: ดึงข้อมูลคำนำหน้า (เช่น นาย, นาง, นางสาว)
- **GET `/api/Title/{id}`**: ดึงคำนำหน้าตาม ID
- **POST `/api/Title`**: เพิ่มคำนำหน้า
- **PUT `/api/Title/{id}`**: แก้ไข
- **DELETE `/api/Title/{id}`**: ลบ

### 21. `TransportController` (หน้าต่างกระบวนการย้ายตำแหน่งผ้าดิบ)
- **POST `/api/Transport/Dispatch`**: ส่งผ้าออกจากการดูแลแบบ Physical เปลี่ยนรหัสผ้าจาก `Available` ไปเป็น `InTransit` อัปเดตพร้อมใส่ Record Logs
- **POST `/api/Transport/Receive`**: รับพัสดุผ้าเข้าถึงที่ เปลี่ยนจาก `InTransit` กลับไปเป็น `Available` หรือ `InUse` ขึ้นอยู่กับตำแหน่งเครื่องอ่าน และผูกกลับไปที่ `RequestId` เพื่อตัดจบสถานะการเบิกจ่าย

### 22. `UserController` (บริหารจัดการบุคลากรผู้ใช้งาน)
- **GET `/api/User`**: ทีมงานในระบบทั้งหมด
- **GET `/api/User/{id}`**: ดึงบัญชีบุคคลใดบุคคลหนึ่ง
- **POST `/api/User`**: ลงทะเบียนพนักงาน บังคับ Hash Password ก่อนเก็บ ป้องกันข้อมูล Foreign Key สับสน
- **PUT `/api/User/{id}`**: แก้ไขข้อมูลชื่อ นามสกุล หากรหัสผ่านถูกส่งมาเป็น Blank จะยึดชุดรหัสผ่านเดิมไว้ และไม่ไปเขียนทับวันที่สมัคร (CreatedAt)
- **DELETE `/api/User/{id}`**: การลบพนักงานออกจากระบบ

### 23. `VendorController` (จัดการข้อมูลบริษัทจำหน่าย หรือ ตัวแทน)
- **GET `/api/Vendor`**: ดึงบริษํททั้งหมด
- **GET `/api/Vendor/{id}`**: ดึงประวัติเฉพาะบริษัท
- **POST `/api/Vendor`**: ผูกเพิ่มข้อมูล Dealer 
- **PUT `/api/Vendor/{id}`**: อัปเดตข้อมูล Dealer
- **DELETE `/api/Vendor/{id}`**: ลบบริษัทจากระบบ API ครอบเช็ครัดกุม หากผูกติดกับ Linens ข้อมูลผ้าจริงในโลกแห่งความเป็นจริงแล้วจะไม่อนุญาตให้ลบและส่ง Error 400 ขัดขวาง

### 24. `WardController` (การจัดการกลุ่มหน่วยงานภายในเช่น วอร์ดชั้น 2)
- **GET `/api/Ward`**: ดึงรายการ Ward ทำการตบแต่งขุ้อมูลผ่าน Include อุปกรณ์โรงพยาบาลติดมาด้วย (Include Hospital Info)
- **POST `/api/Ward`**: เพิ่ม Ward ใหม่ และมีการทำ "Auto Sync รอมชอม" เข้าไปดึง `RoomController` เพื่อจำลอง Room ที่มีชื่อตรงกับ Ward ขึ้นมาให้ทันที เพื่ออำนวยความสะดวกให้ฝ่ายคลังผ้าที่ต้องชี้จุดหมายปลายทาง การทำงานเป็นฐาน Transaction Database สำเร็จลุล่วงไปด้วยกันทั้งหมด
- **DELETE `/api/Ward/{id}`**: ลบข้อมูล Ward ทิ้งออกจากระบบ

---

## 4. 🗄️ โครงสร้างฐานข้อมูล (Database Schema - Exhaustive Models)

ระบบใช้ Entity Framework Core สร้างโมเดลตารางทั้งหมด โครงสร้าง Class Properties ประกอบด้วย:

1. **`Hospital`**: ตารางโรงพยาบาล
   - `HospitalId` (int, PK), `HospitalName` (string), `Code` (string), `Address` (string), `ContactNumber` (string), `IsActive` (bool), `CreatedAt`, `UpdatedAt`
2. **`Ward`**: ตารางวอร์ดหรือหน่วยงาน
   - `WardId` (int, PK), `WardName` (string), `HospitalId` (int, FK), `IsActive`, `CreatedAt`, `UpdatedAt`
3. **`Room`**: ตารางสถานที่ย่อย
   - `RoomId` (int, PK), `RoomName` (string), `Description` (string), `WardId` (int, FK), `IsActive`, `CreatedAt`, `UpdatedAt`
4. **`Role`**: ตารางยศ
   - `RoleId` (int, PK), `RoleName` (string)
5. **`Permission`**: ตารางสิทธิ์ทั้งหมดที่เขียนตายตัวในระบบ
   - `PermissionId` (int, PK), `PermissionCode` (string), `Description` (string)
6. **`RolePermission`**: ตารางแมพความสัมพันธ์ Many-to-Many
   - `RoleId` (int, FK), `PermissionId` (int, FK) -> เป็น PK คู่กัน
7. **`User`**: ตารางข้อมูลผู้ที่ล็อกอินและการขอรหัสใหม่
   - `UserId` (int, PK), `TitleId` (int, FK), `FirstName` (string), `LastName` (string), `Username` (string), `PasswordHash` (string), `Email` (string), `Phone` (string), `RoleId` (int, FK), `HospitalId` (int, FK), `WardId` (int, FK), `IsActive`, `CreatedAt`, `OtpCode` (string), `OtpExpiry` (DateTime?)
8. **`Category`**: หมวดหมู่
   - `CategoryId` (int, PK), `CategoryName` (string), `Description` (string), `IsActive`
9. **`Product`**: สินค้าประเภทผ้าต้นแบบ (Master Product)
   - `ProductId` (int, PK), `ProductCode` (string), `ProductName` (string), `CategoryId` (int, FK), `SizeSpec` (string), `UnitName` (string), `MaxWashCount` (int), `StandardWeightKg` (decimal), `MaxLifespanDays` (int), `Color` (string), `IsDisposable` (bool), `DefaultRoomId` (int, FK), `IsActive`, `CreatedAt`, `UpdatedAt`
10. **`Vendor`**: ตัวแทนจำหน่าย
    - `VendorId` (int, PK), `VendorName` (string), `RegistrationNumber` (string), `ContactPerson` (string), `Phone` (string), `Email` (string), `Address` (string), `IsActive`
11. **`Linen`**: อสังหาริมทรัพย์ผ้าในโลกแห่งความเป็นจริงชิ้นใดชิ้นหนึ่ง
    - `LinenId` (int, PK), `RfidCode` (string, Unique), `ProductId` (int, FK), `VendorId` (int?, FK), `HospitalId` (int, FK), `WardId` (int?, FK), `Status` (string - e.g. 'Available', 'InUse', 'Discarded', 'Washing', 'InTransit'), `WashCount` (int), `MaxWashCount` (int), `CurrentLocation` (string), `RegisteredAt` (DateTime), `UpdatedAt` (DateTime), `IsActive` (bool)
12. **`LinenLog`**: ประวัติ Log ชิ้นใดชิ้นหนึ่ง
    - `LogId` (int, PK), `LinenId` (int, FK), `ReaderId` (int?, FK), `StatusBefore` (string), `StatusAfter` (string), `Action` (string), `UserId` (int?, FK), `CreatedAt`, `Description` (string)
13. **`DamageReason`**: เหตุผลที่สั่งพัง
    - `ReasonId` (int, PK), `ReasonName` (string), `Description` (string)
14. **`Reader`**: ตู้เซ็นเซอร์เครื่องอ่าน RFID Hardware
    - `ReaderId` (int, PK), `ReaderName` (string), `IPAddress` (string), `MacAddress` (string), `Location` (string), `IsActive` (bool), `ReaderFunction` (string)
15. **`RequestStatus`**: กลุ่มแบบแผนการส่งคำร้อง
    - `StatusId` (int, PK), `StatusName` (string), `Description` (string)
16. **`Request`**: ใบทำรายงานคำร้องการเบิกเปลี่ยน
    - `RequestId` (int, PK), `RequestCode` (string), `RequestType` (int), `RequestedByUserId` (int, FK), `ApprovedByUserId` (int?, FK), `TargetWardId` (int, FK), `CurrentStatusId` (int, FK), `CreatedAt`, `UpdatedAt`, `DispatchDate`, `ArrivalDate`
17. **`RequestItem`**: ไอเท็มย่อยแยกออกมา
    - `RequestItemId` (int, PK), `RequestId` (int, FK), `ProductId` (int, FK), `Quantity` (int), `DamageReasonId` (int?, FK)
18. **`Notification`**: ข้อความเตือนส่วนบุคคล
    - `Id` (int, PK), `Title` (string), `Message` (string), `Type` (string - 'INFO','SUCCESS','WARNING'), `UserId` (int?, FK), `RoleId` (int?, FK), `IsRead` (bool), `CreatedAt`, `TargetUrl` (string)
19. **`Setting`**: ตัวแปรภายใน
    - `Id` (int, PK), `Key` (string), `Value` (string), `Description` (string), `UpdatedAt`
20. **`SystemLog`**: ระบบจัดการเหตุการณ์ Log ระดับเซิร์ฟเวอร์กว้างทั้งหมด
    - `Id` (int, PK), `ActionType` (string), `EntityType` (string), `EntityId` (string), `UserId` (int?), `OldValues` (string JSON), `NewValues` (string JSON), `CreatedAt`
21. **`Title`**: คำนำหน้า
    - `TitleId` (int, PK), `TitleName` (string)
22. **`SpecialTag`**: รหัสแท็กของเล่นพิเศษ
    - `TagId` (string, PK), `Description` (string), `Action` (string)

---

## 5. 🖥️ หน้าจอการใช้งานและองค์ประกอบ (Exhaustive Frontend Mapping)

### ระบบโครงสร้างของ Vite React Application (src/pages)
1. **`Login.tsx`**: หน้าต่าง Auth รองรับ Cookie, เปลี่ยนเส้นทางไป `/` เมื่อเข้าระบบสำเร็จ หากล้มเหลวจะแจ้ง Error ทันที
2. **`ForgotPassword.tsx`**: ขั้นตอน 3 Step (กรอกอีเมลขอ OTP -> นำ OTP มายืนยัน -> กรอกรหัสใหม่ผ่านฟอร์มล้างช่องรหัสเดิม)
3. **`Dashboard.tsx` (`/dashboard` & `/stats`)**: หน้าสถิติพร้อมสรุป Component กราฟทั้งหมด โดยใช้ MUI Card มีทั้งตัวเลขเปรียบเทียบวงกลม, และ กราฟแท่งเพื่อดูหมวดหมู่และอายุผ้า พร้อมตารางรายการสแกนเรียลไทม์ 10 อันดับแรก
4. **`Home.tsx` (`/`)**: กึ่งแดชบอร์ด แสดงปุ่ม Quick Actions นำทางด่วน เพื่อให้เจ้าหน้าที่และพยาบาลไม่ต้องกดในเมนูด้านซ้ายอย่างเดียว
5. **`Hospital.tsx` (`/hospital`)**: ตาราง DataGrid CRUD ควบคุมโรงพยาบาล
6. **`Laundry.tsx` (`/laundry`)**: พื้นที่ปฏิบัติการสำหรับโรงซัก มี Tab 1 (ส่งให้ซัก: สแกน RFID แล้วนับโหลดน้ำหนักผ้า) Tab 2 (รับกลับจากซัก: สแกนเพื่อเคลียร์สถานะคืน) ขัั้นตอนนี้มีการกดยืนยัน Payload สื่อสาร
7. **`Linen.tsx` (`/linens`)**: หน้า "ลงทะเบียนผ้าใหม่ (Registration)" ระบบ Hybrid อนุญาตให้สร้างสินค้าแม่แบบหรือต่อยอดของเก่า แล้วสแกนแท็กยิง RFID เป็นชุดๆ เพื่ออัปโหลดขึ้นเซิร์ฟเวอร์
8. **`Requests.tsx` (`/requests`)**: การจัดการคำร้อง หน้าเดียวออกแบบเป็นรูปแบบ Tabs (สร้างใบเบิก, ค้างอนุมัติ, หน้าจอ Admin ที่ยืนยันมอบโอนสิทธ์พัสดุ)
9. **`Discard.tsx` (`/discard`)**: ตารางสแกนผ้าที่จะโละทิ้ง มีเมนู Dropdown ให้เลือกสาเหตุและหมายเหตุ
10. **`Notifications.tsx` (`/notifications`)**: ดึงข้อความแจ้งเตือนทั้งหมดมารวมในหน้าเดียว มีปุ่ม Mark All Read และลิสต์การ์ด
11. **`Reports.tsx` (`/reports`)**: เเอปพลิเคชั่นแปลงผลลัพธ์เป็นตารางสำหรับนำส่งผู้บริหาร
12. **`Settings.tsx` (`/settings`)**: บริหารค่าภายใน เช่น `MAX_WASH_THRESHOLD` ให้เปลี่ยนตัวเลขขัั้นต่ำ
13. **`Transport.tsx` (`/transport`)**: ระบบ Monitor ตัวหน้าจอตามสถานะว่า ตอนนี้รถบรรทุกวิ่งอยู่ตรงไหน มีผ้ากี่ผืนที่อยู่ในรายการ "In Transit" รอรับของ
14. **`Users.tsx` (`/users`)**: จัดการ CRUD ของบุคลากรทั้งหมด ทั้งข้อมูล อีเมล รหัสผ่าน เลือกระดับความสำคัญ Role และระบุสาขาเป้าหมาย
15. **`Vendor.tsx` (`/vendors`)**: จัดการข้อมูลบริษัทนำเข้า ตัวแทน
16. **`RfidConnect.tsx` (`/rfid-connect`)**: เมนูทางเทคนิคสำหรับการ Ping เครื่องอ่าน บังคับเปิดปิด Hardware Reader แบบ Manual จาก Server ทางไกล
17. **`SearchLinen.tsx` (`/search-linen`)**: ใส่รหัส RFID โดดๆ ไปค้นหาเพื่อดูว่าตอนนี้ผ้านี้อยู่ที่ใคร ประวัติเคยล้างกี่ครั้ง

### ระบบป้องกันรักษาความปลอดภัย `App.tsx` (Permission Guard)
ไฟล์หัวใจหลัก `App.tsx` เก็บสถานะ SignalR Listener ทั่วถึงทุกระบบ เมื่อทำงานได้ ค่าที่ได้จากการอ่าน RFID จะถูกปล่อย (Dispatch Custom Event) ผู้ใช้งานจำต้องผ่านกรอบ `PermissionGuard` Component 
ถ้ามีสิทธิ์ เช่น `MANAGE_REQUEST` ถึงจะมองเห็นหน้า `/requests` ในบทบาทผู้ดูแล แต่ถ้าไม่มีสิทธิ์ แต่จำเป็นต้องเบิก ระบบจะแปลงให้เห็นเฉพาะปุ่มเบิกเท่านั้น

---

## 6. 📡 การเชื่อมต่อฮาร์ดแวร์ (Hardware Integration - RFID & MQTT)

การทำงานของซอฟต์แวร์ควบคู่ไปกับเครื่องอ่าน RFID Reader ถูกสร้างขึ้นแบบขนาน (Concurrent Services):

1. **Protocol ระหว่าง Backend และ IoT**:
   - ใช้งาน `MQTTnet` โดยเปิดกระบวนการ `MqttListenerService` แบบ Background Task ไว้ตลอดการทำงาน 
   - RFID Readers ภายนอก จะต่อเข้าข่ายวง Wi-Fi หรือ LAN และเชื่อมต่อไปยัง Broker กลาง (เช่น Mosquitto) 
   - เมื่อเสาสัญญาณอ่านแท็กได้ ฮาร์ดแวร์จะกระจายข้อความ Topic เช่น `/rfid/scan` พร้อม Payload รหัสประจำแท็ก 16 หรือ 24 หลัก เข้ามา

2. **Protocol ระหว่าง Backend และ Frontend**:
   - Backend เมื่อจับค่า MQTT ได้แล้ว จะเก็บลงระบบ พร้อมโยน BroadCast ให้ SignalR (WebSocket) ตัว Hub กลางที่ทำไว้ที่ `http://localhost:5134/hubs/notification`
   - Client React (`App.tsx`) จะรับข้อความชนิด `OnScan` ทันที

3. **Window Notification System**:
   - หลังจาก React App ได้รับ `OnScan` แล้ว, จะใช้วิธียิง `window.dispatchEvent(new CustomEvent("RFID_SCANNED", ...))` 
   - Component ย่อย เช่น หน้า `Linen.tsx`, `Laundry.tsx` หรือ `Discard.tsx` ที่มีการฝังโค้ด `useEffect` จับ Event Listener ดังกล่าวเอาไว้ จะสะท้อนรหัสที่สแกนนำไปวิ่งชน API หรือขึ้นบนตารางโดยอัตโนมัติ

4. **การควบคุมฮาร์ดแวร์ (Publishing Commands)**:
   - กรณีที่ผู้ใช้กดปุ่มในหน้าจอ **ปลุกการสแกน (Wake Reader)**
   - API `<ReaderWakeButton />` จะวิ่งเข้าหา Backend `/api/Reader/Command`
   - Backend ทำหน้าที่เป็น `MqttPublisherService` จ่าย Payload `{ "cmd": "WAKE" }` คืนไปที่เครื่องอ่าน เพื่อเริ่มเปิดพลังงานสนามแม่เหล็กพร้อมรับข้อมูล

---

## 7. 📂 โครงสร้างโฟลเดอร์ (Directory Structure)

```text
📦 RFID
 ┣ 📂 Backend
 ┃ ┣ 📂 Controllers           # ควบคุม API ทุกระเบียบ Endpoints ของ Web API (24 ไฟล์เต็ม)
 ┃ ┣ 📂 DTOs                  # Data Transfer Objects จัดเรียงข้อมูลให้เบาลงก่อนทิ้งออกไป
 ┃ ┣ 📂 Models                # DB Classes (Entities 22 ตัว) และ LinenDbContext (EF Core)
 ┃ ┣ 📂 Migrations            # บันทึกส่วนเปลี่ยนแปลงฐานข้อมูลที่ต้อง Sync
 ┃ ┣ 📂 Services              # ตัวประมวลผลพื้นฐาน เช่น: EmailService.cs, MqttService.cs
 ┃ ┣ 📂 Hubs                  # SignalR Notification Hub
 ┃ ┣ 📜 Program.cs            # Entry Point สูงสุด บริหาร Dependency Injection & Builder Pipes
 ┃ ┗ 📜 appsettings.json      # Connection string ฐานข้อมูลรหัสผ่าน และ JWT Keys
 ┃
 ┗ 📂 Frontend
   ┣ 📂 src
   ┃ ┣ 📂 api                 # ตัวกั้นกลาง (axiosClient.ts) ส่ง/รับ Cookie และดักจับ 401 Unauthorized
   ┃ ┣ 📂 components          # UI สำเร็จรูปที่นำมาใช้ซ้ำ (Header, Sidebar, ReaderWakeButton, Alerts)
   ┃ ┣ 📂 layouts             # Layouts การจัดหน้าจอ (หน้ากากครอบระบบทั้งหมด)
   ┃ ┣ 📂 pages               # หน้า Screen และ View Logic แบ่งตามธุรกิจ (17 ไฟล์เต็มทุกอณู)
   ┃ ┣ 📂 theme               # Material UI Design Variables สำหรับคุมเอกลักษณ์สีองค์กร
   ┃ ┣ 📂 utils               # ยูทิลิตี้ส่วนกลาง เช่น notificationUtil.ts
   ┃ ┣ 📜 App.tsx             # ระบบการกำหนดเส้นทาง (Router) & SignalR Wrapper แบบแนบกอดแน่นกับ PermissionGuard
   ┃ ┗ 📜 main.tsx            # เริ่มต้นการสร้าง DOM ReactDOM
   ┣ 📜 package.json          # พึ่งพิงคำสั่ง Dependencies Scripts
   ┗ 📜 vite.config.ts        # Vite Server Proxy คุม Localhost
```

---

## 8. 🚀 คู่มือการติดตั้งและใช้งาน (Installation & Deployment Guide)

### ⚙️ สิ่งที่จำเป็นในเครื่องเซิร์ฟเวอร์และนักพัฒนา (Prerequisites)
1. **.NET SDK 9.0** ขึ้นไป สำหรับคอมไพล์แบ็กเอนด์
2. **Node.js** (v18, v20+) และ npm สำหรับเรนเดอร์ React App
3. **PostgreSQL** Database ติดตั้งเซอร์วิสในเครื่อง
4. (ตัวเลือก) อุปกรณ์ RFID แท้ หรือ Software MQTT Simulator (เช่น `MQTT Explorer`) ในการทดสอบการรับส่ง

### 1) การติดตั้งส่วนฐานข้อมูล (Database Initialization)
1. ใช้งาน UI (เช่น pgAdmin) ล็อกอินเข้า PostgreSQL วางรากฐานและสร้าง Database เปล่าๆ ชื่อ `LinenDB`
2. หรือปรับเปลี่ยนข้อมูลผู้ใช้รหัสผ่านเชื่อมต่อใน `Backend/appsettings.json` ตัวแปรชื่อว่า `"DefaultConnection"` ให้ตรงกับค่าของ Database เครื่องเป้าหมาย

### 2) การติดตั้งและการรันเซอร์วิส Backend
1. เปิด Command Line / Terminal ทิศทางไปยังโฟลเดอร์รัน Backend โดยตรง (`cd Backend`)
2. เติมคำสั่ง `dotnet restore` ดาวน์โหลด Package ทาง NuGet ให้ครบถ้วน
3. ใช้ฟีเจอร์ EntityFramework คอร์โดยการพิมพ์คำสั่ง `dotnet ef database update`
   - *หมายเหตุ: โปรแกรมจะวิเคราะห์โฟลเดอร์ `Migrations` และอัปเดตโมเดลเข้าสู่โครงร่าง PostgreSQL แบบอัตโนมัติ*
4. สั่งรันเซอร์วิสได้ด้วย: `dotnet run` 
5. Backend จะรันรับข้อมูลสแตนด์บายที่พอร์ท `http://localhost:5134` พร้อมทำงาน

### 3) การติดตั้งฝั่ง Frontend Web Application
1. เปิด Command Line แผงใหม่ และเข้าถึงโฟลเดอร์เป้าหมาย (`cd Frontend`)
2. ดาวน์โหลดแพ็กเกจ React และส่วนพึ่งพาระบุทั้งหมด: `npm install` 
3. ทันทีที่การติดตั้งสมบูรณ์ ให้รันสคริปต์ Webpack (Vite) ผ่านคำสั่ง: `npm run dev`
4. เบราว์เซอร์จะเปิดรันบนพอร์ทที่แจ้งไว้ (ปรกติแล้วคือ `http://localhost:5173` หากพอร์ทไม่ชนกัน)
5. `vite.config.ts` จะกระทำการ Proxy ทุกอย่างที่วิ่งเข้าหา `/api/...` เด้งเข้าไปหาพอร์ท 5134 ทันที ป้องกันปัญหาเรื่อง CORS ได้เป็นอย่างดี

> **ข้อมูลสำหรับผู้ดูแลระบบ (Initial Settings)**
> - หากมีการเปิดแอคเคาท์ทดลองหรือ Seed ข้อมูลเข้าสู่ตาราง `Users` 
> - **Username Default**: `admin`
> - **Password Default**: ขึ้นอยู่กับการ Hash หรือกฎที่ตั้งค่า
> - เมื่อเข้าสู่ระบบเสร็จสิ้น ไปที่หน้าตัังค่าเครื่องอ่าน (Reader Configuration) และกรอก IP หรือ Topic MQTT ของตัวอ่านจริงเพื่อให้การดักจับไหลลื่นและพร้อมทำงานทันที!