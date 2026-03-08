# 1. ใช้ Node.js ในการ Build โค้ด React
FROM node:18-alpine AS build
WORKDIR /app

# 2. Copy ไฟล์ package.json และติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# 3. Copy โค้ดทั้งหมดและรัน Build
COPY . ./
RUN npm run build

# 4. ใช้ Nginx (Web Server) ในการรันไฟล์หน้าเว็บที่ Build เสร็จแล้ว
FROM nginx:alpine
# Copy ไฟล์ที่ Build เสร็จจากขั้นตอนที่แล้ว ไปใส่ใน Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# ตั้งค่า Nginx ให้รองรับ React Router (ป้องกันปัญหา Refresh แล้ว Error 404)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]