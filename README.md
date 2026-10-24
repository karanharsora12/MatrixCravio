# Matrix Cravio
### QR-Based Restaurant Ordering & Management System
**Scan. Crave. Enjoy.**

Part of the **Matrix Product Ecosystem**.

---

## 🍽️ Overview

**Matrix Cravio** is a modern, commercial-grade QR-based restaurant ordering and management platform. It empowers diners to enjoy a contactless, table-specific ordering experience from their smartphones while providing restaurant operators with a centralized, real-time command center for kitchen operations, table sessions, billing, and reports.

---

## 🚀 Key Features

### 1. Customer Ordering Portal (Mobile-First Experience)
- **Zero App Installation & Frictionless Guest Ordering**: Guests scan a table QR code and immediately access the branded menu without mandatory registration.
- **Table Session Continuity**: Groups can place multiple rounds of orders over time that aggregate seamlessly onto a single table session.
- **Interactive Customization**: Select portion sizes/variants (e.g. 10" Regular vs 14" Grande) and add-ons (sauces, double cheeses, toppings) with real-time recalculation.
- **Dietary & Allergen Clarity**: Visual indicators for Veg, Non-Veg, Vegan, Gluten-Free, spiciness ratings (0-3), and allergen alerts.
- **Live Order Progress Tracker**: Real-time status stepper (`PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `SERVED`) connected via Socket.IO.
- **Waiter Call & Assistance**: 1-tap table requests for Waiter, Chilled Water, Cutlery, or Table Bill with instant kitchen/floor alerts.

### 2. Restaurant Management Dashboard
- **Executive Operations Dashboard**: Real-time KPIs for gross sales, order volume, pending kitchen tickets, and table occupancy rate with hourly pace trends.
- **Kitchen Display System (KDS)**: High-contrast touch-friendly order tickets with preparation timers, audio alerts on incoming tickets, and status bump buttons.
- **Live Orders Command Board**: Filter orders by status or table, inspect customer special requests, and control transitions with defined cancellation permissions.
- **Dining Tables & Cryptographic QR Engine**: Manage physical zones (Indoor, Terrace, VIP Lounge, Bar), generate and preview cryptographic QR tokens, and print professional table tent cards.
- **Menu Catalog Management**: Instant 86-ing / Sold Out toggles, category organization, variant and addon group configuration.
- **Consolidated Billing & Payments**: Multi-order table consolidation, tax (GST) and service charge calculations, cash/card/UPI payment recording, and printable tax receipts.
- **Reports & Analytics**: Best-selling dishes, category revenue contribution, and exportable CSV transaction logs.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, TanStack Query, Zustand, React Router v7
- **Backend**: Node.js, Express, TypeScript, Socket.IO, Drizzle ORM, Zod, Bcrypt, JWT
- **Database**: PostgreSQL 18 with Drizzle ORM and `pgcrypto`
- **Testing**: Vitest automated unit and end-to-end integration tests

---

## 📦 Project Structure

```
MatrixCravio/
├── client/                     # Vite + React + TypeScript Frontend
│   ├── src/
│   │   ├── app/                # App entry & QueryClient provider
│   │   ├── components/         # UI component library & layouts
│   │   │   ├── layout/         # CustomerLayout, DashboardLayout
│   │   │   └── ui/             # Button, Badge, Card, Dialog, Input, Skeleton
│   │   ├── features/           # Feature-based modular layers
│   │   │   ├── auth/           # Login & session store
│   │   │   ├── billing/        # Consolidated table bills & payments
│   │   │   ├── cart/           # Zustand persistent cart store
│   │   │   ├── customer-ordering/ # Table menu & customization modal
│   │   │   ├── dashboard/      # Overview operational KPIs
│   │   │   ├── kitchen/        # Dedicated KDS with chimes & timers
│   │   │   ├── menu/           # Food catalog & 86-ing controls
│   │   │   ├── orders/         # Live order management & tracker
│   │   │   ├── reports/        # Analytics & CSV exports
│   │   │   ├── service/        # Waiter assistance requests
│   │   │   ├── settings/       # Restaurant settings & team roster
│   │   │   └── tables/         # Tables & QR label generator
│   │   ├── lib/                # API client & Socket.IO client
│   │   └── types/              # Domain TypeScript types
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Environment configuration
│   │   ├── database/           # Drizzle schema, migrations, and seed script
│   │   ├── middleware/         # JWT auth & RBAC authorization
│   │   ├── modules/            # Feature modules (auth, menu, orders, tables, etc.)
│   │   ├── sockets/            # Socket.IO room management & event dispatchers
│   │   ├── shared/             # Shared types & constants
│   │   ├── app.ts              # Express application factory
│   │   └── server.ts           # HTTP & WebSocket server startup
│   └── src/__tests__/          # Vitest automated test suites
└── docs/                       # Technical architecture & ER diagrams
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database & Environment
Ensure PostgreSQL is running and update `server/.env` if required:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/matrix_cravio
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```

### 3. Run Migrations & Seed Data
```bash
# Execute Drizzle PostgreSQL migration for all 20 tables:
npm run db:migrate

# Seed commercial data (restaurants, menu, tables, QR tokens, users):
npm run db:seed
```

### 4. Run Both Server & Client
```bash
npm run dev
```
- **Backend API & Sockets**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

---

## 🔑 Default Credentials for Demo

| Role | Email | Password |
| :--- | :--- | :--- |
| **Restaurant Owner** | `karan@craviobistro.com` | `cravio123` |
| **Floor Manager** | `priya@craviobistro.com` | `manager123` |
| **Head Chef (KDS)** | `chef.raj@craviobistro.com` | `chef123` |
| **Table Waiter** | `waiter.arun@craviobistro.com` | `waiter123` |
| **Billing Cashier** | `cashier.neha@craviobistro.com` | `cashier123` |
| **System Admin** | `admin@cravio.matrix.com` | `admin123` |

### 📱 Customer Table QR Previews
- **Table 1 (Window Side)**: `http://localhost:5173/menu/crv_tok_table_01_window`
- **Table 2 (Center Booth)**: `http://localhost:5173/menu/crv_tok_table_02_booth`
- **Table 5 (Skyline Terrace)**: `http://localhost:5173/menu/crv_tok_table_05_terrace`

---

## 🧪 Automated Testing

Execute the comprehensive Vitest test suites (covering order calculation precision, state transitions, authentication, public QR resolution, order creation, and billing):
```bash
npm run test:server
```

---

## 📄 License
Commercial proprietary software within the Matrix Product Ecosystem.
