# 🏥 Smart RFID Linen Management System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Backend](https://img.shields.io/badge/Backend-.NET%209-purple)
![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-cyan)
![Database](https://img.shields.io/badge/Database-PostgreSQL%2015-green)
![IoT](https://img.shields.io/badge/IoT-MQTT%20%2B%20RFID-orange)

</div>

---

## 1. 📋 ชื่อโปรเจกต์และภาพรวม (Project Title & Overview)

**Smart RFID Linen Management System** คือระบบบริหารจัดการผ้าโรงพยาบาลอัจฉริยะ โดยผสานเทคโนโลยี RFID (Radio-Frequency Identification) เข้ากับซอฟต์แวร์การจัดการสมัยใหม่แบบ Full-Stack เพื่อแก้ปัญหาสำคัญ 3 ประการในโรงพยาบาล ได้แก่:

1. **การสูญหายของผ้า** — ติดตามตำแหน่งผ้าแต่ละชิ้นแบบ Real-time ด้วย RFID Tag ที่ฝังอยู่ในผ้า
2. **การนับสต็อกที่ไม่แม่นยำ** — ระบบสแกนและอัปเดตจำนวนสต็อกโดยอัตโนมัติ แยกตามแผนก (Ward)
3. **กระบวนการซักรีดที่ขาดการควบคุม** — บันทึกรอบการซักของผ้าแต่ละชิ้น แจ้งเตือนอัตโนมัติเมื่อผ้าใกล้หมดอายุการใช้งาน

ระบบนี้ออกแบบมาสำหรับ **เจ้าหน้าที่คลังผ้า, หัวหน้าวอร์ด, และเจ้าหน้าที่โรงซัก** เพื่อให้สามารถจัดการวงจรชีวิตของผ้า (Linen Lifecycle) ได้อย่างครบถ้วน ตั้งแต่การลงทะเบียนใหม่, การเบิกจ่าย, การส่งซัก, การขนส่ง, ไปจนถึงการจำหน่ายออกจากระบบ

---

## 2. ⚙️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|---|---|---|
| **React** | 19.x | UI Framework หลัก |
| **Vite** | 7.x | Build Tool & Dev Server |
| **TypeScript** | ~5.9 | ภาษาหลักของ Frontend |
| **MUI (Material UI)** | 7.x | Component Library สำหรับ UI |
| **React Router DOM** | 7.x | การจัดการ Routing |
| **Axios** | 1.x | HTTP Client สำหรับเรียก API |
| **Recharts** | 3.x | แสดงกราฟและแผนภูมิ |
| **@microsoft/signalr** | 10.x | เชื่อมต่อ Real-time กับ Backend |
| **jsPDF + jspdf-autotable** | 4.x / 5.x | ออกรายงาน PDF |
| **xlsx** | 0.18.x | ออกรายงาน Excel |
| **SweetAlert2** | 11.x | Popup แจ้งเตือนผู้ใช้ |

### Backend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|---|---|---|
| **.NET** | 9.0 | Web API Framework หลัก |
| **ASP.NET Core** | 9.0 | RESTful API & SignalR Hub |
| **Entity Framework Core** | 9.0 | ORM สำหรับเชื่อมต่อฐานข้อมูล |
| **Npgsql EF Core** | 9.0 | PostgreSQL Provider |
| **MQTTnet** | 4.3.x | ไลบรารีสำหรับสื่อสารกับ RFID Hardware |
| **SignalR** | (Internal) | Real-time Push Notifications |
| **Swagger (Swashbuckle)** | 7.x | API Documentation & Testing |

### Database & Infrastructure
| เทคโนโลยี | บทบาท |
|---|---|
| **PostgreSQL 15** | ฐานข้อมูลหลัก (รันใน Docker) |
| **pgAdmin 4** | เครื่องมือจัดการฐานข้อมูลผ่าน Web UI |
| **Eclipse Mosquitto** | MQTT Broker สำหรับรับข้อมูลจาก RFID Reader (ESP32) |
| **Docker Compose** | จัดการ Service ทั้งหมด (DB, pgAdmin, MQTT, Tunnel) |
| **Cloudflare Tunnel** | เผย Frontend ที่รันบน Local Machine สู่ Internet |

### IoT Hardware
| ฮาร์ดแวร์ | บทบาท |
|---|---|
| **ESP32 + RFID Reader** | อุปกรณ์อ่าน RFID Tag บนผ้า ส่งข้อมูลผ่าน MQTT |
| **RFID UHF/HF Tags** | ติดบนผ้าแต่ละชิ้นเพื่อระบุตัวตน |
| **LED (Green/Yellow/Red)** | ไฟแสดงสถานะการสแกน บน ESP32 |

---

## 3. 🏛️ สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                           │
│  ┌─────────────┐  ┌───────────┐  ┌─────────────────────────┐   │
│  │ PostgreSQL  │  │  pgAdmin  │  │  Eclipse Mosquitto       │   │
│  │  Port:5432  │  │ Port:5050 │  │  Port:1883 (MQTT)       │   │
│  └──────┬──────┘  └───────────┘  │  Port:9001 (WebSocket)  │   │
│         │                        └────────────┬────────────┘   │
└─────────┼────────────────────────────────────┼─────────────────┘
          │                                     │
          │ EF Core                             │ MQTTnet
          ▼                                     ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (.NET 9)  Port: 5134               │
│                                                                │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  24 REST    │  │  MqttListener    │  │  SignalR Hub     │  │
│  │  Controllers│  │  Service         │  │  /hubs/          │  │
│  │  (API)      │◄─│  (Background)    │  │  notification    │  │
│  └──────┬──────┘  └──────────────────┘  └────────┬─────────┘  │
└─────────┼───────────────────────────────────────┼─────────────┘
          │ Axios (HTTP)                            │ @microsoft/signalr
          ▼                                         ▼
┌────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)  Port: 5173          │
│                                                                │
│  Login → Dashboard → Linen → Laundry → Discard → Reports...  │
│  (16 Pages, Permission-based Routing)                          │
└────────────────────────────────────────────────────────────────┘
          ▲
          │ MQTT Publish (reader/NAME/scan, reader/NAME/status)
┌─────────┴──────────────────────────────────────────────────────┐
│              IoT Hardware (ESP32 + RFID Reader)                │
│  - ส่ง Heartbeat ทุกไม่กี่วินาทีผ่าน reader/NAME/status       │
│  - ส่ง RFID Tag ID ผ่าน reader/NAME/scan เมื่อสแกนเจอ         │
│  - รับคำสั่ง WAKE/SLEEP/LED/SHUTDOWN จาก Backend              │
└────────────────────────────────────────────────────────────────┘
```

### การทำงานของ Real-time Flow:
1. **ESP32** สแกน RFID Tag → ส่ง MQTT Topic `reader/<ชื่อเครื่อง>/scan`
2. **MqttListenerService** (Backend) รับข้อความ → ประมวลผลตาม Mode ของเครื่องอ่าน → อัปเดตฐานข้อมูล
3. Backend ส่ง Event ผ่าน **SignalR** (`OnScan`) ไปยัง Frontend ที่เปิดอยู่ทุกหน้า
4. **Frontend** รับ Event → แสดงผลทันทีโดยไม่ต้อง Refresh หน้าเว็บ
5. Backend ควบคุม **LED** บน ESP32 ผ่าน MQTT (เหลือง = กำลังประมวลผล, เขียว = สำเร็จ, แดง = ไม่พบในระบบ)

---

## 4. ✨ ฟีเจอร์หลักของระบบ (Key Features)

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 📡 **Real-time RFID Monitoring** | ดู Feed การสแกน RFID แบบ Live บนหน้า Monitor โดยไม่ต้อง Refresh |
| 📊 **Dashboard & Analytics** | กราฟแสดงภาพรวมสต็อก, สถานะผ้า, จำนวนการซัก, คำร้อง แบบรายวัน/รายเดือน/รายปี |
| 🏷️ **ลงทะเบียนผ้า (Batch Register)** | ลงทะเบียนผ้าหลายชิ้นพร้อมกันด้วยการสแกน RFID หรือใส่ข้อมูลด้วยตนเอง รองรับทั้งผ้าปกติและผ้าใช้แล้วทิ้ง (Disposable) |
| ♻️ **ระบบ Reuse** | Tag RFID ที่เคยถูกจำหน่ายออก สามารถนำกลับมาลงทะเบียนใหม่ได้ |
| 🧺 **ระบบซักรีด (Laundry Flow)** | บันทึกการส่งซัก, รับเข้าโรงซัก, นับรอบการซักอัตโนมัติ |
| 🚛 **ระบบขนส่ง (Transport)** | จัดการใบคำร้องการขนส่ง, สแกนผ้าขาออก (Dispatch) และขาเข้า (Receive) |
| 🗑️ **ระบบจำหน่ายออก (Discard)** | แจ้งผ้าชำรุด/สูญหาย/หมดอายุ ทั้งแบบรายชิ้นและ Batch |
| 📋 **ระบบออกรายงาน** | รายงานความเคลื่อนไหว, รายงานผ้าชำรุด ส่งออกเป็น PDF และ Excel ได้ |
| 🔔 **ระบบแจ้งเตือน (Notifications)** | แจ้งเตือนเมื่อมีเหตุการณ์สำคัญ เช่น อุปกรณ์ Offline, เพิ่มอุปกรณ์ใหม่ |
| 🔌 **จัดการอุปกรณ์ (Reader Config)** | เพิ่ม/แก้ไข/ลบ RFID Reader, สั่ง Wake Up / Sleep / Shutdown ผ่าน MQTT |
| 🎛️ **Special Tag (Mode Card)** | ใช้การ์ด RFID พิเศษเพื่อเปลี่ยนโหมดของเครื่องอ่าน (เช่น โหมดซัก, โหมดจำหน่าย) |
| ⚙️ **การตั้งค่าระบบ (Settings)** | ปรับเกณฑ์แจ้งเตือนสต็อกต่ำ, อายุการใช้งานผ้า, และค่าระบบอื่น ๆ |
| 🔐 **ระบบสิทธิ์ (Role-Based Permissions)** | แต่ละ Role ได้รับสิทธิ์เฉพาะทาง (เช่น `VIEW_DASHBOARD`, `MANAGE_LINEN`, `VIEW_REPORT`) |
| 🔑 **Forgot Password ด้วย OTP** | รีเซ็ตรหัสผ่านผ่านระบบ OTP |

---

## 5. 🚀 คู่มือการติดตั้งและรันระบบ (Installation & Setup Guide)

### 5.1 สิ่งที่ต้องเตรียม (Prerequisites)

| เครื่องมือ | เวอร์ชันแนะนำ | วัตถุประสงค์ |
|---|---|---|
| **Docker Desktop** | ล่าสุด | รัน PostgreSQL, Mosquitto, pgAdmin |
| **.NET SDK** | 9.0 | รัน Backend |
| **Node.js** | 20+ (LTS) | รัน Frontend |
| **npm** | 10+ | จัดการ Package ของ Frontend |
| **Git** | ล่าสุด | Clone โปรเจกต์ |

### 5.2 ขั้นตอนการรัน Infrastructure (Docker)

```bash
# 1. Clone โปรเจกต์
git clone <repository-url>
cd RFID

# 2. รัน Docker Compose (PostgreSQL + pgAdmin + Mosquitto + Cloudflare Tunnel)
docker compose up -d

# ตรวจสอบว่า Container รันขึ้นครบ
docker compose ps
```

**Service ที่รันใน Docker:**

| Service | URL/Port | Username | Password |
|---|---|---|---|
| PostgreSQL | `localhost:5432` | `admin` | `123456` |
| pgAdmin | `http://localhost:5050` | `admin@linen.com` | `123456` |
| Mosquitto MQTT | `localhost:1883` | - | - |
| Cloudflare Tunnel | ดูใน Docker Log | - | - |

> **หมายเหตุ:** Cloudflare Tunnel จะสร้าง URL สาธารณะให้อัตโนมัติ สามารถดู URL ได้ด้วยคำสั่ง `docker logs linen_tunnel`

### 5.3 ขั้นตอนการรัน Backend (.NET)

```bash
# เข้า Directory ของ Backend
cd Backend

# (ครั้งแรก) Restore NuGet Packages
dotnet restore

# รัน Backend ในโหมด Development
dotnet run
```

**Backend จะรันที่:** `http://localhost:5134`

**Swagger UI (ทดสอบ API):** `http://localhost:5134/swagger`

> **การตั้งค่า Connection String:** ตรวจสอบในไฟล์ `Backend/appsettings.json` หรือ `appsettings.Development.json` ว่า Connection String ถูกต้อง:
> ```json
> {
>   "ConnectionStrings": {
>     "DefaultConnection": "Host=localhost;Port=5432;Database=linen_db;Username=admin;Password=123456"
>   }
> }
> ```

> **การสร้างฐานข้อมูล:** ระบบใช้ `context.Database.EnsureCreated()` ที่รันอัตโนมัติทุกครั้งที่ Start Backend ดังนั้นฐานข้อมูลจะถูกสร้างอัตโนมัติหากยังไม่มี

### 5.4 ขั้นตอนการรัน Frontend (Vite/React)

```bash
# เข้า Directory ของ Frontend
cd Frontend

# (ครั้งแรก) ติดตั้ง Dependencies
npm install

# รัน Dev Server
npm run dev
```

**Frontend จะรันที่:** `http://localhost:5173`

### 5.5 สรุปลำดับการเริ่มต้นระบบ

```
1. ▶️  docker compose up -d         (รัน Infrastructure)
2. ▶️  cd Backend && dotnet run      (รัน Backend API)
3. ▶️  cd Frontend && npm run dev    (รัน Frontend UI)
4. 🌐  เปิด http://localhost:5173   (เข้าใช้งานระบบ)
```

---

## 6. 📖 คู่มือการใช้งานระบบอย่างละเอียด (Detailed User Manual)

### 6.1 การเข้าสู่ระบบ (Login & Forgot Password)

#### หน้า Login (`/login`)
- กรอก **Username** และ **Password** แล้วกดปุ่ม **เข้าสู่ระบบ**
- ระบบจะบันทึกข้อมูลผู้ใช้และ **Permissions** ลงใน `localStorage` เพื่อควบคุมการเข้าถึงหน้าต่าง ๆ
- หากรหัสผ่านไม่ถูกต้อง ระบบจะแสดงข้อความแจ้งเตือน

#### หน้า Forgot Password (`/forgot-password`)
- กรอก **Username** เพื่อขอ OTP
- กรอก **OTP** ที่ได้รับ พร้อม **รหัสผ่านใหม่** เพื่อรีเซ็ต

> **หมายเหตุสำหรับ Admin:** บัญชีผู้ใช้สร้างผ่านหน้า **Users Management** โดย Admin เท่านั้น

---

### 6.2 หน้าหลัก — Monitor (หน้าแรก `/`)

หน้านี้เป็น **Public Page** ไม่ต้อง Login ก็เข้าได้ ทำหน้าที่แสดง Feed การสแกน RFID แบบ Real-time

**สิ่งที่แสดงผล:**
- ตาราง Feed แสดง RFID Code, ชื่อสินค้า, ตำแหน่ง, สถานะปัจจุบัน และเวลาสแกนล่าสุด
- สีสถานะในตาราง:
  - 🟢 **เขียว** — ผ้าสถานะปกติ (พร้อมใช้, ถูกใช้งาน)
  - 🟡 **เหลือง** — กำลังซัก, กำลังส่ง
  - 🔴 **แดง** — ไม่พบในระบบ (Alien Tag), จำหน่ายแล้ว (Disposed)

**การทำงาน:** ข้อมูลอัปเดตทันทีผ่าน **SignalR** เมื่อมีการสแกนเกิดขึ้นที่ RFID Reader ใด ๆ ในระบบ โดยไม่ต้อง Refresh หน้า

---

### 6.3 Dashboard (`/dashboard`)

**สิทธิ์ที่ต้องการ:** `VIEW_DASHBOARD`

**ข้อมูลที่แสดง:**
- **KPI Cards** แสดงสถิติภาพรวม:
  - จำนวนผ้าทั้งหมด
  - ผ้าเพิ่มใหม่วันนี้
  - กำลังซักอยู่
  - พร้อมใช้งาน
  - คำร้องที่รอดำเนินการ
  - ผ้าชำรุด / จำหน่ายออก

- **กราฟ (Charts)** จาก Recharts:
  - **Pie Chart** — สัดส่วนผ้าแยกตาม Category (สูงสุด 5 ประเภท)
  - **Bar Chart (7 วัน)** — จำนวนการเบิกใช้ vs การส่งซักรายวัน
  - **Line Chart (6 เดือน)** — จำนวนใบคำร้องรายเดือน
  - **Bar Chart Damaged (6 เดือน)** — ผ้าชำรุด/จำหน่ายออกรายเดือน
  - **Yearly Chart** — trendการเคลื่อนไหวผ้ารายเดือนของปีนี้

---

### 6.4 การจัดการสต็อกผ้า — Linen Management (`/linens`)

**สิทธิ์ที่ต้องการ:** `MANAGE_LINEN`

นี่คือหน้าหลักสำหรับการบริหารจัดการผ้าในคลัง มีแท็บหลัก ๆ ดังนี้:

#### แท็บ: สต็อกผ้าทั้งหมด
- ตารางแสดงผ้าทุกชิ้นที่ Active ในระบบ พร้อม RFID Code, ชื่อสินค้า, Category, สถานะ, จำนวนรอบซัก, ตำแหน่งปัจจุบัน
- ค้นหา Filter ตาม Category, สถานะ, หรือ RFID Code
- สามารถ **ลบถาวร** (Delete) ผ้ารายชิ้นหรือ Batch ได้

#### แท็บ: ลงทะเบียนผ้าใหม่ (Register)
**วิธีการลงทะเบียน:**
1. เลือก **ประเภทผ้า (Product)**, **โรงพยาบาล**, และ **ผู้จัดจำหน่าย (Vendor)**
2. **สแกน RFID** ผ่านเครื่องอ่านที่เชื่อมต่อ (ระบบรับ Event อัตโนมัติผ่าน `RFID_SCANNED`) หรือพิมพ์ RFID Code ด้วยตนเอง
3. กดปุ่ม **ลงทะเบียน (Batch)** เพื่อบันทึกทั้งหมด
4. ระบบรองรับ **Reuse** — หาก RFID Code เคยถูกจำหน่ายออกไปแล้ว สามารถนำกลับมาลงทะเบียนใหม่ได้โดยระบบจะรีเซ็ตรอบซักและสถานะ

#### แท็บ: ผ้าใช้แล้วทิ้ง (Disposable)
- แสดงผ้าที่มี Flag `IsDisposable = true` แยกต่างหาก
- มีฟีเจอร์สแกนและบันทึกการใช้งานพิเศษสำหรับผ้าประเภทนี้

---

### 6.5 ระบบซักรีด — Laundry (`/laundry`)

**สิทธิ์ที่ต้องการ:** `MANAGE_LAUNDRY`

**ขั้นตอนการทำงาน:**

| ขั้นตอน | Action | ผลที่เกิด |
|---|---|---|
| 1. สแกนผ้าขาออกจากวอร์ด | ส่งค่า `WASH` | สถานะ = "กำลังซัก", รอบซัก +1 |
| 2. สแกนรับเข้าโรงซัก | Mode `MODE_RECEIVE_LAUNDRY` | ตำแหน่ง = "โรงซัก (Laundry)" |
| 3. ซักเสร็จ นำกลับเข้าคลัง | Mode `MODE_RESTOCK` | สถานะ = "พร้อมใช้", ตำแหน่ง = "คลังผ้า (Stock)" |

**หน้าจอประกอบด้วย:**
- พื้นที่ Input RFID (รับ Event จากเครื่องอ่านอัตโนมัติ)
- ตารางแสดงรายการที่สแกนในรอบปัจจุบัน พร้อมรายละเอียดสินค้า
- สรุปยอดจำนวนที่สแกนและสถานะผลลัพธ์

---

### 6.6 ระบบจำหน่ายออก — Discard (`/discard`)

**สิทธิ์ที่ต้องการ:** `MANAGE_DISCARD`

ใช้สำหรับแจ้งผ้าที่ต้องการตัดออกจากระบบ

**วิธีใช้งาน:**

1. **แจ้งชำรุดรายชิ้น:**
   - สแกน RFID หรือพิมพ์ RFID Code
   - เลือก **สาเหตุ** (ชำรุด / สูญหาย / หมดอายุ)
   - กดบันทึก → ผ้าจะถูกตั้งสถานะ `IsActive = false`

2. **แจ้งชำรุดแบบ Batch:**
   - สแกนหลายชิ้นพร้อมกัน
   - เลือกสาเหตุ → กดบันทึกทั้งหมดพร้อมกัน

3. **ดูประวัติการจำหน่าย:**
   - ตารางแสดงรายการที่ถูกจำหน่ายออกไปแล้ว 50 รายการล่าสุด

> **หมายเหตุ:** ผ้าที่ถูก Discard แล้วจะ **ไม่หายออกจากฐานข้อมูล** เพียงแต่ตั้ง `IsActive = false` เพื่อเก็บประวัติไว้ และยังสามารถนำมา REUSE ได้ในอนาคตผ่านหน้า Linen Register

---

### 6.7 ระบบขนส่ง — Transport (`/transport`)

**สิทธิ์ที่ต้องการ:** `MANAGE_TRANSPORT`

จัดการการเคลื่อนย้ายผ้าระหว่างแผนกหรือโรงพยาบาล ผ่านระบบ **ใบคำร้อง (Request)**

**สถานะใบคำร้อง (Workflow):**
```
Pending (รอดำเนินการ)
    ↓ อนุมัติ
Approved (อนุมัติแล้ว)
    ↓ สแกนส่งออก (DISPATCH)
In Transit (กำลังขนส่ง)
    ↓ สแกนรับเข้า (RECEIVE)
Completed (เสร็จสิ้น)
```

**วิธีใช้งาน:**
1. สร้าง **ใบคำร้องใหม่** ระบุ Ward ปลายทาง, รายการผ้าที่ต้องการ
2. Approve ใบคำร้อง
3. **สแกนผ้า (Dispatch)** โดย Action = `DISPATCH` → สถานะผ้าเปลี่ยนเป็น "กำลังส่ง"
4. ปลายทาง **สแกนรับ (Receive)** โดย Action = `RECEIVE` → สถานะผ้าเปลี่ยนเป็น "พร้อมใช้"

---

### 6.8 ระบบออกรายงาน — Reports (`/reports`)

**สิทธิ์ที่ต้องการ:** `VIEW_REPORT`

#### รายงานความเคลื่อนไหว (Movement Report)
- กรองช่วงวันที่ได้
- กรองตามประเภทกิจกรรม (Add, Move, Wash, Discard, Restock, Dispatch, Receive)
- ตารางแสดง: วันที่, ประเภท, ชื่อสินค้า, Flow (ต้นทาง ➝ ปลายทาง), จำนวน

#### รายงานผ้าชำรุด (Damaged Report)
- กรองช่วงวันที่
- แสดงรายชิ้น: วันที่จำหน่าย, ชื่อสินค้า, หมวดหมู่, RFID Code, สาเหตุ, ตำแหน่งสุดท้าย

**การส่งออกรายงาน:**
- กด **Export PDF** → ออกไฟล์ PDF ผ่าน jsPDF
- กด **Export Excel** → ออกไฟล์ `.xlsx` ผ่านไลบรารี xlsx

---

### 6.9 การจัดการอุปกรณ์ RFID — RfidConnect (`/rfid-connect`)

**สิทธิ์ที่ต้องการ:** `CONNECT_RFID`

หน้านี้ใช้สำหรับเพิ่ม/จัดการ RFID Reader ที่ติดตั้งในโรงพยาบาล

#### การเพิ่ม Reader ใหม่
1. กรอก **ชื่อเครื่อง (Reader Name)** — ต้องตรงกับชื่อที่ตั้งใน Firmware ของ ESP32
2. เลือก **ประเภท (Reader Type)**, **ฟังก์ชัน**, **ตำแหน่งติดตั้ง**, **Room**
3. กด **เพิ่มอุปกรณ์** → ระบบจะส่ง Notification แจ้งเตือน Admin ทันที

#### การสั่งงานอุปกรณ์จากระยะไกล (Remote Command via MQTT)
| คำสั่ง | ผลที่เกิด |
|---|---|
| **Wake Up** | ส่งคำสั่ง `WAKE` ผ่าน MQTT → ESP32 เปิดเสา RFID อีกครั้ง |
| **Sleep** | ส่งคำสั่ง `SLEEP` ผ่าน MQTT → ESP32 เข้าโหมดประหยัดพลังงาน |
| **Shutdown** | ส่งคำสั่ง `SHUTDOWN` → ESP32 ปิดการทำงาน, สถานะ DB เปลี่ยนเป็น Offline |

#### ระบบ Auto Sleep / Auto Offline
- **หากไม่มี Activity เกิน 30 วินาที** → Backend ส่งคำสั่ง SLEEP ไปยัง Reader อัตโนมัติ
- **หากไม่มี Heartbeat เกิน 15 วินาที** → Backend ถือว่า Offline แสดงสถานะ 🔴

---

### 6.10 การจัดการใบคำร้อง — Requests (`/requests`)

**สิทธิ์ที่ต้องการ:** `MANAGE_REQUEST`

- สร้างใบคำร้องใหม่ (เบิกผ้า, คืนผ้า, ร้องขอซ่อม ฯลฯ)
- ดูรายการใบคำร้องทั้งหมด พร้อม Filter ตามสถานะ
- Approve / Reject ใบคำร้อง
- ดูรายการสินค้าในแต่ละใบคำร้อง

---

### 6.11 การตั้งค่าระบบ — Settings (`/settings`)

**สิทธิ์ที่ต้องการ:** `MANAGE_SETTING`

ตั้งค่าพารามิเตอร์ระบบผ่าน Key-Value Store ในตาราง `settings`

**ตัวอย่างค่าที่ตั้งได้:**
| Setting Key | ความหมาย |
|---|---|
| `low_stock_threshold` | เกณฑ์จำนวนผ้าขั้นต่ำ (แจ้งเตือนเมื่อต่ำกว่าค่านี้) |
| `max_wash_count` | จำนวนรอบซักสูงสุดเริ่มต้นสำหรับผ้าใหม่ |
| `max_lifespan_days` | อายุการใช้งานสูงสุด (วัน) |

**วิธีแก้ไขค่า:**
1. คลิกที่ค่าที่ต้องการแก้ไข
2. พิมพ์ค่าใหม่
3. กด **บันทึก** (API `PUT /api/Setting/Update`)

---

### 6.12 การจัดการผู้ใช้ — Users (`/users`)

**สิทธิ์ที่ต้องการ:** `MANAGE_USER`

- เพิ่ม/แก้ไข/ปิดใช้งาน (Deactivate) ผู้ใช้
- กำหนด Role ให้กับผู้ใช้แต่ละคน
- ดูรายการ Permission ของแต่ละ Role

---

### 6.13 Notifications (`/notifications`)

ดูรายการแจ้งเตือนทั้งหมดของตนเอง พร้อมสถานะอ่าน/ยังไม่อ่าน

**ประเภทการแจ้งเตือนในระบบ:**
- `INFO` — เพิ่มอุปกรณ์ใหม่, ส่งคำสั่งสำเร็จ
- `WARNING` — ลบอุปกรณ์
- `DANGER` — สั่งปิดอุปกรณ์ (Shutdown)

---

## 7. 🗄️ โครงสร้างฐานข้อมูล (Database Overview)

ฐานข้อมูลใช้ **PostgreSQL** และจัดการผ่าน **Entity Framework Core** ประกอบด้วยตารางหลัก ๆ ดังนี้:

### ตารางหลัก

| ตาราง | หน้าที่ |
|---|---|
| `linens` | เก็บข้อมูลผ้าแต่ละชิ้น (RFID Code, สถานะ, รอบซัก, ตำแหน่ง, วันหมดอายุ) |
| `products` | ประเภทผ้า (เช่น ผ้าปูที่นอน, เสื้อคลุมผู้ป่วย) พร้อม Category, สี, น้ำหนัก |
| `categories` | หมวดหมู่ผ้า (กลุ่ม) |
| `linen_logs` | บันทึกประวัติการเคลื่อนไหวของผ้าแต่ละชิ้น (ActivityType, From → To) |
| `requests` | ใบคำร้องการขนส่ง/เบิกจ่ายผ้า |
| `request_items` | รายการสินค้าในแต่ละใบคำร้อง |
| `request_statuses` | สถานะของใบคำร้อง (Pending, Approved, In Transit, Completed) |
| `readers` | ข้อมูล RFID Reader (ชื่อ, IP, สถานะ, โหมด, ตำแหน่งติดตั้ง) |
| `special_tags` | Card RFID พิเศษสำหรับเปลี่ยนโหมดของ Reader |
| `users` | ข้อมูลผู้ใช้ (ชื่อ, Username, Password Hash, Role, Ward, OTP) |
| `roles` | บทบาทของผู้ใช้ (Admin, Staff, Laundry, Ward Head ฯลฯ) |
| `permissions` | สิทธิ์การเข้าถึงฟีเจอร์ต่าง ๆ (Permission Code) |
| `role_permissions` | ตาราง Many-to-Many เชื่อม Role กับ Permission |
| `hospitals` | ข้อมูลโรงพยาบาลที่อยู่ในระบบ |
| `wards` | แผนกย่อยภายในโรงพยาบาล |
| `rooms` | ห้องภายใน Ward |
| `vendors` | ข้อมูลผู้จัดจำหน่ายผ้า |
| `damage_reasons` | สาเหตุการชำรุด (ชำรุด, สูญหาย, หมดอายุ) |
| `settings` | ค่าระบบแบบ Key-Value |
| `notifications` | การแจ้งเตือนสำหรับผู้ใช้/Role |
| `system_logs` | Log การกระทำสำคัญในระบบ (เช่น ลบข้อมูล, สแกน Unknown Tag) |
| `titles` | คำนำหน้าชื่อผู้ใช้ (นาย, นาง, นางสาว ฯลฯ) |

### ความสัมพันธ์สำคัญ (Key Relationships)

```
hospitals (1) ──── (N) wards (1) ──── (N) rooms
hospitals (1) ──── (N) users
hospitals (1) ──── (N) linens

linens (N) ──── (1) products (N) ──── (1) categories
linens (1) ──── (N) linen_logs

roles (1) ──── (N) users
roles (N) ──── (N) permissions  [ผ่าน role_permissions]

requests (1) ──── (N) request_items
request_items (N) ──── (1) products
```

---

## 8. 🔧 โครงสร้างโปรเจกต์ (Project Structure)

```
RFID/
├── docker-compose.yml          # ไฟล์ Docker สำหรับ Infrastructure
├── mosquitto/                  # Config ของ Mosquitto MQTT Broker
│   └── config/mosquitto.conf
│
├── Backend/                    # .NET 9 Web API
│   ├── Controllers/            # 24 API Controllers
│   │   ├── LinenController.cs      # จัดการผ้า (Scan, Register, Discard)
│   │   ├── DashboardController.cs  # Stats & Chart Data
│   │   ├── ReportController.cs     # รายงาน Movement & Damaged
│   │   ├── ReaderController.cs     # จัดการ RFID Reader & MQTT Commands
│   │   ├── RequestController.cs    # ใบคำร้องขนส่ง
│   │   ├── SettingController.cs    # ค่าระบบ
│   │   └── ...
│   ├── Models/                 # Entity Models & DbContext
│   │   ├── LinenDbContext.cs       # EF Core Context (ทุกตาราง)
│   │   ├── Linen.cs
│   │   └── ...
│   ├── Services/               # Background Services
│   │   ├── MqttListenerService.cs  # รับข้อมูลจาก ESP32 ผ่าน MQTT
│   │   ├── MqttPublisherService.cs # ส่งคำสั่งกลับไปยัง ESP32
│   │   └── EmailService.cs         # ส่ง Email OTP
│   ├── Hubs/
│   │   └── NotificationHub.cs      # SignalR Hub
│   └── Program.cs              # Startup Configuration
│
└── Frontend/                   # React 19 + Vite + TypeScript
    └── src/
        ├── App.tsx             # Routing & SignalR Handler & Permission Guard
        ├── pages/              # 16 หน้าหลัก
        │   ├── Home.tsx            # Monitor (Real-time Feed)
        │   ├── Dashboard.tsx       # Analytics & Charts
        │   ├── Linen.tsx           # จัดการสต็อกผ้า
        │   ├── Laundry.tsx         # ระบบซักรีด
        │   ├── Discard.tsx         # จำหน่ายออก
        │   ├── Transport.tsx       # ระบบขนส่ง
        │   ├── Requests.tsx        # ใบคำร้อง
        │   ├── Reports.tsx         # ออกรายงาน
        │   ├── RfidConnect.tsx     # จัดการ RFID Reader
        │   ├── Settings.tsx        # ตั้งค่าระบบ
        │   ├── Users.tsx           # จัดการผู้ใช้
        │   ├── Hospital.tsx        # จัดการโรงพยาบาล/Ward
        │   ├── Vendor.tsx          # จัดการผู้จัดจำหน่าย
        │   ├── Notifications.tsx   # การแจ้งเตือน
        │   ├── Login.tsx           # หน้า Login
        │   └── ForgotPassword.tsx  # รีเซ็ตรหัสผ่าน
        ├── components/         # Reusable Components
        ├── layouts/            # MainLayout (Sidebar + Navbar)
        ├── theme/              # MUI Theme
        ├── api/                # Axios HTTP Client
        └── utils/              # Utility Functions
```

---

## 9. 📝 หมายเหตุเพิ่มเติม (Notes)

- **Timezone:** ระบบทั้งหมดตั้งค่าเวลาไทย **(UTC+7)** โดยใช้ `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` และ Helper `ThaiTime()` ใน Backend
- **JSON Circular Reference:** ระบบแก้ปัญหา JSON Loop ด้วย `ReferenceHandler.IgnoreCycles` ใน ASP.NET Core
- **CORS:** Backend อนุญาต `http://localhost:5173` เท่านั้น (ปรับได้ใน `Program.cs`)
- **SignalR Auto Navigate:** เมื่อ Reader ตรวจจับ Special Tag โหมดพิเศษ Frontend จะ Navigate ไปยังหน้าที่เกี่ยวข้องโดยอัตโนมัติ (เช่น `SET_MODE_WASH` → ไปหน้า `/laundry`)

---

<div align="center">
<strong>จัดทำโดย: ทีมพัฒนา Smart RFID Linen Management System</strong><br>
สงวนลิขสิทธิ์ © 2026
</div>