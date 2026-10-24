import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.js';
import { Button } from '../../components/ui/Button.js';
import { useCartStore } from './CartStore.js';
import { formatCurrency } from '../../lib/utils.js';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Utensils } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useNavigate } from 'react-router-dom';

interface CustomerCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  qrToken: string;
  sessionToken?: string;
  tableNumber: string;
}

export const CustomerCartDrawer: React.FC<CustomerCartDrawerProps> = ({
  isOpen,
  onClose,
  qrToken,
  sessionToken,
  tableNumber,
}) => {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getServiceChargeAmount,
    getGrandTotal,
    currencySymbol,
    customerName,
    customerPhone,
    customerNotes,
    setCustomerDetails,
  } = useCartStore();

  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [notes, setNotes] = useState(customerNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const serviceCharge = getServiceChargeAmount();
  const total = getGrandTotal();

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    // Save details to store for session persistence
    setCustomerDetails(name, phone, notes);

    try {
      const orderPayload = {
        qrToken,
        sessionToken,
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        customerNotes: notes.trim() || undefined,
        idempotencyKey: 'idemp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          variantId: i.variant?.id || null,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions || undefined,
          addonIds: i.selectedAddons.map((a) => a.id),
        })),
      };

      const res: any = await api.post('/public/orders', orderPayload);

      if (res.success && res.orderId) {
        clearCart();
        onClose();
        navigate(`/order/${res.orderId}`);
      } else {
        setError(res.message || 'Failed to place order');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong while submitting your order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Your Table Order"
      description={`${tableNumber} • Review and confirm`}
      maxWidth="lg"
      footer={
        items.length > 0 && (
          <Button
            className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/25"
            isLoading={isSubmitting}
            onClick={handlePlaceOrder}
          >
            <span>Send Order to Kitchen • {formatCurrency(total, currencySymbol)}</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )
      }
    >
      {items.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">Your cart is empty</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Browse our appetizing menu and add delicious food items to place an order.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
            Explore Menu
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Items List */}
          <div className="space-y-3 divide-y divide-border/40 pr-1">
            {items.map((item) => (
              <div key={item.cartItemId} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground leading-snug">{item.name}</span>
                    {item.variant && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {item.variant.name}
                      </span>
                    )}
                  </div>

                  {item.selectedAddons.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      + {item.selectedAddons.map((a) => a.name).join(', ')}
                    </p>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[11px] text-amber-600 italic">
                      Note: &quot;{item.specialInstructions}&quot;
                    </p>
                  )}

                  <div className="text-xs font-semibold text-primary">
                    {formatCurrency(item.totalPrice, currencySymbol)}
                  </div>
                </div>

                {/* Quantity modifier */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-input bg-background/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.cartItemId)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Guest Info (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-border/40 pt-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="For order SMS status"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Order notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              General Kitchen Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Please bring drinks first, celebrate birthday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Bill Breakdown */}
          <div className="space-y-1.5 border-t border-border/60 pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Item Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxes & GST (5%)</span>
              <span className="font-medium text-foreground">{formatCurrency(tax, currencySymbol)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Restaurant Service Charge (5%)</span>
                <span className="font-medium text-foreground">{formatCurrency(serviceCharge, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
              <span>Grand Total</span>
              <span className="text-primary font-display">{formatCurrency(total, currencySymbol)}</span>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
        </div>
      )}
    </Dialog>
  );
};
