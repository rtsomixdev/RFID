# RFID Tracking System

## 💻 Tech Stack

### 🎨 Frontend (Client-side)
- **Framework:** React 19 (via Vite)
- **Language:** TypeScript
- **UI Library / Styling:** Material UI (MUI), Emotion
- **Routing:** React Router v7
- **HTTP Client:** Axios
- **Real-time Communication:** SignalR Client
- **Data Visualization & Export:** Recharts, jsPDF, XLSX
- **Alerts & Utility:** SweetAlert2, Date-fns, Day.js

### ⚙️ Backend (Server-side)
- **Framework:** ASP.NET Core 9 Web API
- **Language:** C# 13 (.NET 9)
- **ORM:** Entity Framework Core 9 (EF Core)
- **Database Provider:** PostgreSQL (Npgsql)
- **API Documentation:** Swagger / OpenAPI
- **IoT & Hardware Interface:** MQTTnet (For RFID reader integrations)
- **Real-time Engine:** ASP.NET Core SignalR
- **Security:** Cookie-Based Authentication, In-memory Rate Limiting

### 🗄️ Database & Infrastructure (Docker)
- **Database:** PostgreSQL (15-alpine)
- **Database Management:** pgAdmin 4
- **Message Broker (MQTT):** Eclipse Mosquitto
- **Network / Remote Access:** Cloudflare Tunnel (cloudflared)
- **Containerization:** Docker & Docker Compose