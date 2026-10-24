# Matrix Cravio — Socket.IO Real-Time Architecture

The real-time layer coordinates instant order notification, kitchen ticket creation, status progression, and waiter assistance across clients.

---

## 1. Connection & Rooms

Clients establish a connection to the server root:
```ts
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');
```

### Server Rooms
1. `restaurant:{restaurantId}`: All front-of-house staff, managers, and cashiers for general updates.
2. `kitchen:{restaurantId}`: Dedicated KDS stations receiving order cards and preparation updates.
3. `table:{restaurantId}:{tableId}`: Waiters assigned to a specific table zone.
4. `order:{orderId}`: Single customer smartphone tracking their live order status without page reloads.

---

## 2. Client-to-Server Events

| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `join_restaurant` | `restaurantId: string` | Joins staff room for store-wide alerts |
| `join_kitchen` | `restaurantId: string` | Joins KDS ticket channel |
| `join_table` | `{ restaurantId: string, tableId: string }` | Waiter table assignment |
| `join_order` | `orderId: string` | Customer joins specific order room |

---

## 3. Server-to-Client Events

### A. `new_order`
Emitted when a customer successfully submits an order.
- **Target Rooms:** `restaurant:{id}`, `kitchen:{id}`, `table:{id}`
- **Payload:**
  ```json
  {
    "id": "uuid",
    "orderNumber": "#CRV-4921",
    "status": "PENDING",
    "subtotal": "870.00",
    "totalAmount": "957.00",
    "tableNumber": "T-01",
    "tableDisplayName": "Table 1 (Window Side)",
    "customerNotes": "Extra crispy",
    "items": [
      {
        "itemNameSnapshot": "Classic Neapolitan Margherita",
        "variantNameSnapshot": "10-inch Regular",
        "quantity": 1,
        "totalPriceSnapshot": "460.00"
      }
    ]
  }
  ```

### B. `order_status_updated`
Emitted whenever an order advances along the state machine.
- **Target Rooms:** `restaurant:{id}`, `kitchen:{id}`, `order:{id}`
- **Payload:**
  ```json
  {
    "id": "uuid",
    "orderNumber": "#CRV-4921",
    "status": "PREPARING",
    "tableNumber": "T-01"
  }
  ```

### C. `service_request_created`
Emitted when a customer clicks "Call Waiter", "Water Refill", or "Request Bill".
- **Target Rooms:** `restaurant:{id}`
- **Payload:**
  ```json
  {
    "id": "uuid",
    "tableNumber": "T-01",
    "type": "call_waiter",
    "status": "pending",
    "createdAt": "2026-10-24T04:15:00.000Z"
  }
  ```

### D. `service_request_updated`
Emitted when staff acknowledges or resolves a call.
- **Target Rooms:** `restaurant:{id}`
