# Matrix Cravio — Production Deployment Guide

Matrix Cravio is engineered as a production-ready SaaS application for restaurant tech infrastructure.

---

## 1. Prerequisites

- **Node.js**: v20+ LTS or v22
- **PostgreSQL**: v15, v16, or v18 with `pgcrypto` extension enabled
- **Reverse Proxy**: NGINX, Cloudflare, or AWS ALB (with WebSocket proxying enabled)
- **SSL Certificate**: HTTPS is required for QR camera auto-redirection on modern iOS and Android browsers.

---

## 2. Environment Configuration

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://db_user:strong_password@db_host:5432/matrix_cravio?sslmode=require
JWT_SECRET=production_strong_cryptographic_secret_key_minimum_32_characters
CLIENT_URL=https://cravio.yourdomain.com
```

### Frontend (`client/.env.production`)
```env
VITE_API_URL=https://api.cravio.yourdomain.com
```

---

## 3. Database Initialization

Execute the automated migration and seed scripts:
```bash
# 1. Run migrations to create all 20 tables & indexes
npm run db:migrate

# 2. (Optional) Run initial seed for demo data
npm run db:seed
```

---

## 4. Build & Run Production Services

### Backend Service:
```bash
cd server
npm run build
NODE_ENV=production node dist/server.js
# Or via PM2:
pm2 start dist/server.js --name "cravio-backend" -i max
```

### Frontend Static Build:
```bash
cd client
npm run build
# The optimized bundle will be generated in client/dist
```

---

## 5. NGINX Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name cravio.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cravio.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/cravio.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cravio.yourdomain.com/privkey.pem;

    # Frontend Single Page App
    root /var/www/matrix-cravio/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket / Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
