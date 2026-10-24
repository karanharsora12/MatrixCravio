# Matrix Cravio — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates a staff member and issues a JWT token.
- **Request Body:**
  ```json
  {
    "email": "karan@craviobistro.com",
    "password": "cravio123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "email": "karan@craviobistro.com",
      "fullName": "Karan Sharma",
      "systemRole": "user"
    },
    "currentRestaurant": {
      "restaurantId": "uuid",
      "restaurantName": "Cravio Bistro & Lounge",
      "role": "owner"
    }
  }
  ```

### `GET /api/auth/me`
Retrieves current authenticated profile and restaurant scopes.
- **Headers:** `Authorization: Bearer <TOKEN>`

---

## 2. Customer Public QR Endpoints (No Login Required)

### `GET /api/public/qr/:token`
Resolves cryptographic table QR code, verifies establishment status, retrieves dining table, active session, and active menu.
- **URL Parameter:** `token` (e.g. `crv_tok_table_01_window`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "restaurant": {
      "name": "Cravio Bistro & Lounge",
      "taxPercentage": "5.00",
      "serviceChargePercentage": "5.00",
      "currencySymbol": "₹"
    },
    "table": {
      "id": "uuid",
      "tableNumber": "T-01",
      "displayName": "Table 1 (Window Side)"
    },
    "session": {
      "id": "uuid",
      "sessionToken": "sess_..."
    },
    "categories": [ ... ]
  }
  ```

### `POST /api/public/orders`
Submits contactless order. Recalculates all pricing server-side, validates availability, creates order items with snapshots, and triggers real-time events.
- **Request Body:**
  ```json
  {
    "qrToken": "crv_tok_table_01_window",
    "sessionToken": "sess_...",
    "customerName": "Aarav",
    "customerPhone": "+91 98765 43210",
    "customerNotes": "Extra crispy please",
    "items": [
      {
        "menuItemId": "uuid",
        "variantId": "uuid",
        "quantity": 2,
        "addonIds": ["uuid-dip"]
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "orderId": "uuid",
    "orderNumber": "#CRV-4921",
    "status": "PENDING",
    "totalAmount": "957.00"
  }
  ```

### `GET /api/public/orders/:orderId`
Live customer status tracker and state history.

### `POST /api/public/service-requests`
Submits table assistance call (`call_waiter`, `request_water`, `request_cutlery`, `request_bill`).

---

## 3. Order & Kitchen Management Endpoints

### `GET /api/orders`
Staff order list with status, date, and table filters.

### `GET /api/orders/kitchen/queue`
KDS active preparation queue (`PENDING`, `ACCEPTED`, `PREPARING`, `READY`).

### `PUT /api/orders/:id/status`
Controlled State Machine transition:
- Allowed transitions:
  - `PENDING` -> `ACCEPTED` | `CANCELLED`
  - `ACCEPTED` -> `PREPARING` | `CANCELLED`
  - `PREPARING` -> `READY`
  - `READY` -> `SERVED`
  - `SERVED` -> `COMPLETED`
- Emits Socket.IO `order_status_updated`.

---

## 4. Tables & QR Management Endpoints

- `GET /api/tables`: List tables with occupancy, latest QR token, and active orders.
- `POST /api/tables`: Create table and generate secure token.
- `PUT /api/tables/:id/status`: Update table status (`available`, `occupied`, `reserved`, `maintenance`).
- `POST /api/tables/:id/qr/generate`: Regenerate token and revoke older codes.

---

## 5. Billing & Payments Endpoints

- `GET /api/billing/table/:tableId`: Consolidate multi-order session bill, calculate subtotals, tax, service charge, and balance due.
- `POST /api/billing/payments`: Settle bill with payment method (`cash`, `card`, `upi`, `online`), generate tax receipt, and mark table available.
- `GET /api/billing/payments/history`: List transaction ledger.

---

## 6. Reports & Analytics Endpoints

- `GET /api/reports/overview`: Today's sales, volume, occupancy %, top items, and hourly sales distribution.
