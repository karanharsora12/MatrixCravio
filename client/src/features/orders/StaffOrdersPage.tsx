import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { Order, OrderStatus } from '../../types/index.js';
import { formatCurrency, formatDateTime, getOrderStatusBadge } from '../../lib/utils.js';
import { Button } from '../../components/ui/Button.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { toast } from '../../components/ui/Toast.js';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle,
  ChefHat,
  Sparkles,
  XCircle,
  Filter,
  Search,
  AlertTriangle,
} from 'lucide-react';

export const StaffOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation modal
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrders = () => {
    api.get<any>('/orders')
      .then((res) => {
        if (res.success) {
          setOrders(res.orders || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrders();

    const socket = getSocket();
    socket.on('new_order', () => {
      fetchOrders();
    });
    socket.on('order_status_updated', () => {
      fetchOrders();
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, targetStatus: OrderStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: targetStatus });
      toast.success('Order Status Updated', `Status set to ${targetStatus.toLowerCase()}`);
      fetchOrders();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return;
    setIsCancelling(true);
    try {
      await api.post(`/orders/${cancellingOrderId}/cancel`, { reason: cancelReason });
      setCancellingOrderId(null);
      setCancelReason('');
      toast.warning('Order Cancelled', 'The order has been cancelled.');
      fetchOrders();
    } catch (err: any) {
      toast.error('Failed to cancel order', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedStatus === 'active') {
      return ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status);
    }
    if (selectedStatus === 'all') return true;
    return o.status === selectedStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Live Order Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accept incoming table scans, track progress, and coordinate with the kitchen
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {orders.filter((o) => ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)).length} Active Live
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          {[
            { id: 'active', label: '⚡ Active Orders' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'PREPARING', label: 'In Prep' },
            { id: 'READY', label: 'Ready' },
            { id: 'SERVED', label: 'Served' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'all', label: 'All History' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedStatus(pill.id)}
              className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all select-none ${
                selectedStatus === pill.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order # or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Order Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading incoming orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-card rounded-3xl border border-border/60">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
          <p className="text-sm font-bold text-foreground">No orders in this view</p>
          <p className="text-xs text-muted-foreground">New QR orders submitted by customers will appear here in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const statusBadge = getOrderStatusBadge(order.status);

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header: Table + Status + Order Number */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base font-display text-foreground">
                          {order.tableNumber || 'Table'}
                        </span>
                        {order.tableDisplayName && (
                          <span className="text-xs text-muted-foreground font-medium">
                            • {order.tableDisplayName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-primary block mt-0.5">{order.orderNumber}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Time placed */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Placed at {formatDateTime(order.createdAt)}</span>
                  </div>

                  {/* Customer Notes */}
                  {order.customerNotes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-medium italic">
                      &quot;{order.customerNotes}&quot;
                    </div>
                  )}

                  {/* Line Items List */}
                  <div className="divide-y divide-border/40 space-y-1.5 pt-1">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="pt-1.5 first:pt-0 flex items-start justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">
                            {item.quantity}x {item.itemNameSnapshot}
                          </span>
                          {item.variantNameSnapshot && (
                            <span className="text-[10px] text-muted-foreground block">{item.variantNameSnapshot}</span>
                          )}
                          {item.specialInstructions && (
                            <span className="text-[10px] text-amber-600 block italic">
                              Note: {item.specialInstructions}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-muted-foreground">
                          {formatCurrency(item.totalPriceSnapshot, order.currencySymbol || '₹')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer: Total & State Machine Buttons */}
                <div className="border-t border-border/50 pt-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Bill Total</span>
                    <span className="font-extrabold text-sm text-foreground font-display">
                      {formatCurrency(order.totalAmount, order.currencySymbol || '₹')}
                    </span>
                  </div>

                  {/* Controlled State Machine Actions */}
                  <div className="flex items-center gap-2">
                    {order.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept Order
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-rose-500 hover:bg-rose-500/10 border-rose-200"
                          onClick={() => setCancellingOrderId(order.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        >
                          <ChefHat className="h-3.5 w-3.5 mr-1" /> Start Prep
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-rose-500 hover:bg-rose-500/10"
                          onClick={() => setCancellingOrderId(order.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}

                    {order.status === 'PREPARING' && (
                      <Button
                        size="sm"
                        className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Mark Order Ready
                      </Button>
                    )}

                    {order.status === 'READY' && (
                      <Button
                        size="sm"
                        className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                      >
                        <UtensilsCrossed className="h-3.5 w-3.5 mr-1" /> Food Delivered & Served
                      </Button>
                    )}

                    {order.status === 'SERVED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs font-bold"
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                      >
                        Mark Completed
                      </Button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <span className="text-[11px] text-muted-foreground w-full text-center block font-medium">
                        ✓ Settled & Completed
                      </span>
                    )}

                    {order.status === 'CANCELLED' && (
                      <span className="text-[11px] text-rose-500 w-full text-center block font-medium">
                        Order Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Dialog with Sticky Header & Footer */}
      <Dialog
        isOpen={!!cancellingOrderId}
        onClose={() => setCancellingOrderId(null)}
        title="Cancel Order"
        description="Provide a reason for kitchen and audit logs"
        maxWidth="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setCancellingOrderId(null)}>
              Dismiss
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              isLoading={isCancelling}
              onClick={handleConfirmCancel}
            >
              Confirm Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Cancellation Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Item sold out, guest changed mind"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-input text-xs bg-background/50 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
