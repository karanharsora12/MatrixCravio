import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import http from 'http';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });

  return () => {
    server.close();
  };
});

describe('Matrix Cravio End-to-End API Flow', () => {
  let authToken: string;
  let sampleOrderId: string;
  let sampleTableId: string;
  let sampleSessionId: string;

  it('1. Resolves public table QR token and menu catalog', async () => {
    const res = await fetch(`${baseUrl}/api/public/qr/crv_tok_table_01_window`);
    const data: any = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.restaurant.name).toBe('Cravio Bistro & Lounge');
    expect(data.table.tableNumber).toBe('T-01');
    expect(data.session.sessionToken).toBeDefined();
    expect(data.categories.length).toBeGreaterThan(0);

    sampleTableId = data.table.id;
    sampleSessionId = data.session.id;
  });

  it('2. Submits a new contactless table order with recalculation', async () => {
    // Get menu to pick an item
    const qrRes = await fetch(`${baseUrl}/api/public/qr/crv_tok_table_01_window`);
    const qrData: any = await qrRes.json();
    const margherita = qrData.categories
      .flatMap((c: any) => c.items)
      .find((i: any) => i.name.includes('Margherita'));

    expect(margherita).toBeDefined();

    const orderPayload = {
      qrToken: 'crv_tok_table_01_window',
      customerName: 'Integration Tester',
      customerNotes: 'Extra hot please',
      idempotencyKey: 'test_idemp_' + Date.now(),
      items: [
        {
          menuItemId: margherita.id,
          variantId: margherita.variants?.[0]?.id || null,
          quantity: 2,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/public/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    const data: any = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.orderNumber).toMatch(/^#CRV-/);
    expect(data.orderId).toBeDefined();

    sampleOrderId = data.orderId;
  });

  it('3. Customer tracks order progress and timeline', async () => {
    const res = await fetch(`${baseUrl}/api/public/orders/${sampleOrderId}`);
    const data: any = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.id).toBe(sampleOrderId);
    expect(data.order.items.length).toBeGreaterThan(0);
    expect(data.order.timeline.length).toBeGreaterThan(0);
  });

  it('4. Authenticates staff owner and receives JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karan@craviobistro.com',
        password: 'cravio123',
      }),
    });

    const data: any = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    authToken = data.token;
  });

  it('5. Advances order through controlled state machine: PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED', async () => {
    // PENDING -> ACCEPTED
    let res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    let data: any = await res.json();
    expect(res.status).toBe(200);
    expect(data.order.status).toBe('ACCEPTED');

    // ACCEPTED -> PREPARING
    res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    data = await res.json();
    expect(res.status).toBe(200);
    expect(data.order.status).toBe('PREPARING');

    // PREPARING -> READY
    res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'READY' }),
    });
    data = await res.json();
    expect(res.status).toBe(200);
    expect(data.order.status).toBe('READY');

    // READY -> SERVED
    res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'SERVED' }),
    });
    data = await res.json();
    expect(res.status).toBe(200);
    expect(data.order.status).toBe('SERVED');
  });

  it('6. Rejects invalid state transitions (e.g. SERVED directly to PENDING)', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status: 'PENDING' }),
    });
    const data: any = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('7. Submits customer service assistance request', async () => {
    const res = await fetch(`${baseUrl}/api/public/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qrToken: 'crv_tok_table_01_window',
        type: 'request_water',
        notes: 'Chilled please',
      }),
    });
    const data: any = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.request.type).toBe('request_water');
  });

  it('8. Consolidates table bill and records payment', async () => {
    const billRes = await fetch(`${baseUrl}/api/billing/table/${sampleTableId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const billData: any = await billRes.json();
    expect(billRes.status).toBe(200);
    expect(billData.success).toBe(true);
    expect(parseFloat(billData.bill.grandTotal)).toBeGreaterThan(0);

    const payRes = await fetch(`${baseUrl}/api/billing/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        tableId: sampleTableId,
        sessionId: billData.session.id,
        paymentMethod: 'card',
        amount: parseFloat(billData.bill.balanceDue),
        closeSession: true,
      }),
    });

    const payData: any = await payRes.json();
    expect(payRes.status).toBe(201);
    expect(payData.success).toBe(true);
    expect(payData.receiptNumber).toMatch(/^REC-/);
  });
});
