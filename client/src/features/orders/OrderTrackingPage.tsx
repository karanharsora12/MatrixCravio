import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { Order, OrderStatus } from '../../types/index.js';
import { formatCurrency, formatDateTime, getOrderStatusBadge } from '../../lib/utils.js';
import { CheckCircle2, Clock, ChefHat, Utensils, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Skeleton } from '../../components/ui/Skeleton.js';

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = () => {
    if (!orderId) return;
    api.get<any>(`/public/orders/${orderId}`)
      .then((res) => {
        if (res.success && res.order) {
          setOrder(res.order);
        } else {
          setError(res.message || 'Order not found');
        }
      })
      .catch((err) => setError(err.message || 'Failed to load order tracking'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrder();

    // Socket real-time updates for this order
    const socket = getSocket();
    if (orderId) {
      socket.emit('join_order', orderId);

      socket.on('order_status_updated', (updatedOrder: any) => {
        if (updatedOrder.id === orderId) {
          fetchOrder(); // re-fetch full timeline and items
        }
      });
    }

    return () => {
      socket.off('order_status_updated');
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-card border border-border p-8 rounded-3xl space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold font-display">Order Not Found</h2>
          <p className="text-sm text-muted-foreground">{error || 'This order could not be located.'}</p>
        </div>
      </div>
    );
  }

  const steps: Array<{ status: OrderStatus; label: string; icon: any; desc: string }> = [
    { status: 'PENDING', label: 'Order Placed', icon: Clock, desc: 'Sent to restaurant kitchen' },
    { status: 'ACCEPTED', label: 'Kitchen Accepted', icon: CheckCircle2, desc: 'Chef reviewing ticket' },
    { status: 'PREPARING', label: 'In Preparation', icon: ChefHat, desc: 'Cooking fresh for your table' },
    { status: 'READY', label: 'Ready for Service', icon: Sparkles, desc: 'Plated and ready to bring out' },
    { status: 'SERVED', label: 'Food Served', icon: Utensils, desc: 'Enjoy your meal!' },
  ];

  const statusOrder: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 font-sans selection:bg-primary/20">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-xs font-bold text-muted-foreground font-display">Matrix Cravio Live</span>
        </div>

        {/* Order Status Banner */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-3 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />

          <div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">Table Order</span>
            <h1 className="text-2xl font-extrabold font-display mt-0.5">{order.orderNumber}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.tableNumber} {order.tableDisplayName ? `(${order.tableDisplayName})` : ''} • Placed at {formatDateTime(order.createdAt)}
            </p>
          </div>

          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 space-y-1">
              <span className="font-bold text-sm">Order Cancelled</span>
              <p className="text-xs">{order.cancellationReason || 'Cancelled by staff or guest.'}</p>
            </div>
          ) : (
            /* Animated Progress Stepper */
            <div className="pt-4 space-y-4 text-left">
              {steps.map((step, idx) => {
                const stepIndex = statusOrder.indexOf(step.status);
                const isPassed = currentIndex >= stepIndex;
                const isCurrent = order.status === step.status;
                const Icon = step.icon;

                return (
                  <div key={step.status} className="flex items-start gap-3.5 relative">
                    {/* Stepper Line */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 -bottom-3 w-0.5 transition-colors ${
                          currentIndex > stepIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    )}

                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                        isCurrent
                          ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20 scale-110'
                          : isPassed
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight block">{step.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Items Breakdown */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-muted-foreground">Order Summary</h3>

          <div className="divide-y divide-border/40 space-y-2.5">
            {order.items?.map((item) => (
              <div key={item.id} className="pt-2.5 first:pt-0 flex items-start justify-between text-xs">
                <div>
                  <span className="font-bold text-foreground">
                    {item.quantity}x {item.itemNameSnapshot}
                  </span>
                  {item.variantNameSnapshot && (
                    <span className="text-muted-foreground block text-[11px]">{item.variantNameSnapshot}</span>
                  )}
                  {item.specialInstructions && (
                    <span className="text-amber-600 block text-[11px] italic">
                      Note: &quot;{item.specialInstructions}&quot;
                    </span>
                  )}
                </div>
                <span className="font-semibold text-foreground">
                  {formatCurrency(item.totalPriceSnapshot, order.currencySymbol || '₹')}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotal, order.currencySymbol || '₹')}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Taxes</span>
              <span className="font-medium">{formatCurrency(order.taxAmount, order.currencySymbol || '₹')}</span>
            </div>
            {parseFloat(order.serviceChargeAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Service Charge</span>
                <span className="font-medium">{formatCurrency(order.serviceChargeAmount, order.currencySymbol || '₹')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/40">
              <span>Total Amount</span>
              <span className="text-primary font-display">
                {formatCurrency(order.totalAmount, order.currencySymbol || '₹')}
              </span>
            </div>
          </div>
        </div>

        {/* Reassurance Notice */}
        <div className="text-center p-4 rounded-2xl bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Need anything else for your table?</p>
          <p>You can order additional items at any time or request assistance from our staff.</p>
        </div>
      </div>
    </div>
  );
};
