import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../../types/index.js';

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  taxPercentage: number;
  serviceChargePercentage: number;
  currencySymbol: string;

  setRestaurantPolicy: (taxPercentage: number, serviceChargePercentage: number, currencySymbol: string) => void;
  setCustomerDetails: (name: string, phone: string, notes?: string) => void;
  addItem: (item: Omit<CartItem, 'cartItemId' | 'totalPrice'>) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTaxAmount: () => number;
  getServiceChargeAmount: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',
      customerPhone: '',
      customerNotes: '',
      taxPercentage: 5,
      serviceChargePercentage: 5,
      currencySymbol: '₹',

      setRestaurantPolicy: (taxPercentage, serviceChargePercentage, currencySymbol) => {
        set({ taxPercentage, serviceChargePercentage, currencySymbol });
      },

      setCustomerDetails: (customerName, customerPhone, customerNotes = '') => {
        set({ customerName, customerPhone, customerNotes });
      },

      addItem: (newItem) => {
        const { items } = get();
        // Generate unique cart item hash based on itemId + variantId + sorted addonIds
        const addonKey = newItem.selectedAddons.map((a) => a.id).sort().join('_');
        const cartItemId = `${newItem.menuItemId}_${newItem.variant?.id || 'none'}_${addonKey}`;

        const existingIndex = items.findIndex((i) => i.cartItemId === cartItemId);
        if (existingIndex > -1) {
          const updatedItems = [...items];
          const item = updatedItems[existingIndex];
          const newQty = item.quantity + newItem.quantity;
          updatedItems[existingIndex] = {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty,
            specialInstructions: newItem.specialInstructions || item.specialInstructions,
          };
          set({ items: updatedItems });
        } else {
          const totalPrice = newItem.unitPrice * newItem.quantity;
          set({
            items: [...items, { ...newItem, cartItemId, totalPrice }],
          });
        }
      },

      updateQuantity: (cartItemId, delta) => {
        const { items } = get();
        const updated = items
          .map((item) => {
            if (item.cartItemId === cartItemId) {
              const newQty = item.quantity + delta;
              if (newQty <= 0) return null;
              return {
                ...item,
                quantity: newQty,
                totalPrice: item.unitPrice * newQty,
              };
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
        set({ items: updated });
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) });
      },

      clearCart: () => {
        set({ items: [], customerNotes: '' });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      getTaxAmount: () => {
        const subtotal = get().getSubtotal();
        const rate = get().taxPercentage / 100;
        return Math.round(subtotal * rate * 100) / 100;
      },

      getServiceChargeAmount: () => {
        const subtotal = get().getSubtotal();
        const rate = get().serviceChargePercentage / 100;
        return Math.round(subtotal * rate * 100) / 100;
      },

      getGrandTotal: () => {
        return get().getSubtotal() + get().getTaxAmount() + get().getServiceChargeAmount();
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cravio_cart_storage',
    }
  )
);
