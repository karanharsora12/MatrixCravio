import React, { useEffect, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.js';
import { api } from '../../lib/api.js';
import { formatCurrency, formatDate, getOrderStatusBadge } from '../../lib/utils.js';
import { Order } from '../../types/index.js';
import { Receipt, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SessionOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string;
  tableNumber: string;
  currencySymbol?: string;
}

export const SessionOrdersModal: React.FC<SessionOrdersModalProps> = ({
  isOpen,
  onClose,
  sessionToken,
  tableNumber,
  currencySymbol = '₹',
}) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionToken) {
      setIsLoading(true);
      api.get<any>(`/public/sessions/${sessionToken}/orders`)
        .then((res) => {
          if (res.success) {
            setOrders(res.orders || []);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, sessionToken]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Table Session Orders"
      description={`Orders placed at ${tableNumber}`}
      maxWidth="md"
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No previous orders in this table session yet.
        </div>
      ) : (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {orders.map((o) => {
            const statusBadge = getOrderStatusBadge(o.status);
            return (
              <div
                key={o.id}
                onClick={() => {
                  onClose();
                  navigate(`/order/${o.id}`);
                }}
                className="p-4 rounded-2xl border border-border/60 hover:border-primary/50 bg-card hover:bg-muted/20 cursor-pointer transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground">{o.orderNumber}</span>
                    <span className="text-[11px] text-muted-foreground block">{formatDate(o.createdAt)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Items preview */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {o.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between">
                      <span>{it.quantity}x {it.itemNameSnapshot} {it.variantNameSnapshot ? `(${it.variantNameSnapshot})` : ''}</span>
                      <span className="font-medium">{formatCurrency(it.totalPriceSnapshot, currencySymbol)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs font-bold">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="text-primary font-display">{formatCurrency(o.totalAmount, currencySymbol)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
};
