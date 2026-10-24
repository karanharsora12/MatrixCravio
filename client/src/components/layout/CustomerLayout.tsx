import React, { useState } from 'react';
import { useCartStore } from '../../features/cart/CartStore.js';
import { formatCurrency } from '../../lib/utils.js';
import { ShoppingBag, Bell, Clock, ChevronRight } from 'lucide-react';
import { CustomerCartDrawer } from '../../features/cart/CustomerCartDrawer.js';
import { WaiterCallModal } from '../../features/service/WaiterCallModal.js';
import { SessionOrdersModal } from '../../features/orders/SessionOrdersModal.js';

interface CustomerLayoutProps {
  children: React.ReactNode;
  restaurantName: string;
  restaurantLogo?: string;
  tableNumber: string;
  tableDisplayName?: string;
  qrToken: string;
  sessionToken?: string;
  currencySymbol?: string;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  children,
  restaurantName,
  restaurantLogo,
  tableNumber,
  tableDisplayName,
  qrToken,
  sessionToken,
  currencySymbol = '₹',
}) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWaiterOpen, setIsWaiterOpen] = useState(false);
  const [isSessionOrdersOpen, setIsSessionOrdersOpen] = useState(false);

  const itemCount = useCartStore((state) => state.getItemCount());
  const grandTotal = useCartStore((state) => state.getGrandTotal());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-28 md:pb-16 selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/50 px-4 py-3 shadow-sm transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurantLogo ? (
              <img src={restaurantLogo} alt={restaurantName} className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary font-display">
                MC
              </div>
            )}
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight font-display line-clamp-1">{restaurantName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {tableNumber}
                </span>
                {tableDisplayName && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline line-clamp-1">
                    • {tableDisplayName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Call Waiter & Session Orders) */}
          <div className="flex items-center gap-2">
            {sessionToken && (
              <button
                type="button"
                onClick={() => setIsSessionOrdersOpen(true)}
                className="h-9 px-2.5 rounded-xl border border-border/70 hover:bg-muted text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all"
                title="View Orders at this table"
              >
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Orders</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsWaiterOpen(true)}
              className="h-9 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Call Waiter / Request Service"
            >
              <Bell className="h-3.5 w-3.5 animate-pulse" />
              <span>Call Waiter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-3">{children}</main>

      {/* Floating Bottom Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-3 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom duration-300">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-primary hover:bg-primary/95 text-white p-3.5 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-between font-bold text-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-white/20">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-black text-white text-[10px] rounded-full flex items-center justify-center font-extrabold border-2 border-primary">
                  {itemCount}
                </span>
              </div>
              <span className="text-white text-xs font-medium">View Table Order</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-display">{formatCurrency(grandTotal, currencySymbol)}</span>
              <ChevronRight className="h-4 w-4 opacity-75" />
            </div>
          </button>
        </div>
      )}

      {/* Modals */}
      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        qrToken={qrToken}
        sessionToken={sessionToken}
        tableNumber={tableNumber}
      />

      <WaiterCallModal
        isOpen={isWaiterOpen}
        onClose={() => setIsWaiterOpen(false)}
        qrToken={qrToken}
        sessionToken={sessionToken}
        tableNumber={tableNumber}
      />

      {sessionToken && (
        <SessionOrdersModal
          isOpen={isSessionOrdersOpen}
          onClose={() => setIsSessionOrdersOpen(false)}
          sessionToken={sessionToken}
          tableNumber={tableNumber}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};
