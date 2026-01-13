# ใช้ Node.js
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# เปิด Port 5173 (Port มาตรฐานของ Vite) หรือ 3000 ตามที่คุณแก้
EXPOSE 3000

# คำสั่งรัน (เพิ่ม --host เพื่อให้ Docker มองเห็น)
CMD ["npm", "run", "dev", "--", "--host"]