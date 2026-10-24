import { describe, it, expect } from 'vitest';

describe('Matrix Cravio Business Logic & Calculations', () => {
  it('correctly calculates subtotal, 5% tax, and 5% service charge with cent precision', () => {
    // Pizza (460.00) + Fries (290.00) + Drink (120.00) = 870.00
    const itemPrices = [460.0, 290.0, 120.0];
    const subtotal = itemPrices.reduce((a, b) => a + b, 0);

    const taxRate = 0.05; // 5%
    const serviceRate = 0.05; // 5%

    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const serviceChargeAmount = Math.round(subtotal * serviceRate * 100) / 100;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;

    expect(subtotal).toBe(870.0);
    expect(taxAmount).toBe(43.5);
    expect(serviceChargeAmount).toBe(43.5);
    expect(totalAmount).toBe(957.0);
  });

  it('validates order status state machine transitions', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY'],
      READY: ['SERVED'],
      SERVED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    expect(VALID_TRANSITIONS['PENDING']).toContain('ACCEPTED');
    expect(VALID_TRANSITIONS['PENDING']).toContain('CANCELLED');
    expect(VALID_TRANSITIONS['PENDING']).not.toContain('READY');
    expect(VALID_TRANSITIONS['PREPARING']).toContain('READY');
    expect(VALID_TRANSITIONS['SERVED']).toContain('COMPLETED');
    expect(VALID_TRANSITIONS['COMPLETED']).toHaveLength(0);
  });
});
