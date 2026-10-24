import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { Order, OrderStatus } from '../../types/index.js';
import { Button } from '../../components/ui/Button.js';
import {
  ChefHat,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Flame,
  ArrowRight,
} from 'lucide-react';

export const KitchenDisplayPage: React.FC = () => {
  const [queue, setQueue] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Play audio chime on new orders
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // AudioContext might be blocked until user interacts with document
    }
  };

  const fetchQueue = () => {
    api.get<any>('/orders/kitchen/queue')
      .then((res) => {
        if (res.success) {
          setQueue(res.queue || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQueue();

    const socket = getSocket();
    socket.on('new_order', () => {
      fetchQueue();
      playChime();
    });
    socket.on('order_status_updated', () => {
      fetchQueue();
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, [soundEnabled]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'ACCEPTED';
    if (currentStatus === 'PENDING') nextStatus = 'ACCEPTED';
    else if (currentStatus === 'ACCEPTED') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'SERVED';

    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to advance status');
    }
  };

  // Compute elapsed minutes
  const getElapsedMinutes = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / (1000 * 60)));
  };

  return (
    <div className="space-y-6">
      {/* KDS Header with Sound Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 text-white p-5 rounded-3xl shadow-lg border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
            <ChefHat className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-display tracking-wide">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-zinc-400">Real-time wood-fired cooking & order fulfillment queue</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{soundEnabled ? 'Chimes Active' : 'Muted'}</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-extrabold">
            {queue.length} Active Tickets
          </span>
        </div>
      </div>

      {/* Tickets Board */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Connecting to kitchen queue...</div>
      ) : queue.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card rounded-3xl border border-border/70">
          <ChefHat className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <h3 className="text-lg font-bold font-display text-foreground">Kitchen Queue Clear</h3>
          <p className="text-xs text-muted-foreground">All table orders have been prepared and served!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {queue.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isLate = elapsed > 20;

            const statusColors = {
              PENDING: 'border-amber-500 bg-amber-500/5',
              ACCEPTED: 'border-blue-500 bg-blue-500/5',
              PREPARING: 'border-orange-500 bg-orange-500/5',
              READY: 'border-purple-500 bg-purple-500/5',
              SERVED: 'border-emerald-500 bg-emerald-500/5',
              COMPLETED: 'border-zinc-500',
              CANCELLED: 'border-rose-500',
            };

            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all bg-card ${
                  statusColors[order.status]
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Table Number + Timer */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <div>
                      <span className="text-lg font-black font-display text-foreground block leading-tight">
                        {order.tableNumber}
                      </span>
                      <span className="text-[11px] font-semibold text-primary">{order.orderNumber}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-extrabold ${
                        isLate
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{elapsed}m</span>
                    </div>
                  </div>

                  {/* Customer / Kitchen Special Request */}
                  {order.customerNotes && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ Note: {order.customerNotes}
                    </div>
                  )}

                  {/* High Contrast Line Items */}
                  <div className="space-y-2">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="p-2 rounded-xl bg-muted/40 border border-border/40 space-y-0.5">
                        <div className="flex items-center justify-between text-sm font-extrabold text-foreground">
                          <span>{item.itemNameSnapshot}</span>
                          <span className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center text-xs font-black">
                            {item.quantity}
                          </span>
                        </div>
                        {item.variantNameSnapshot && (
                          <span className="text-xs font-semibold text-primary block">
                            Size: {item.variantNameSnapshot}
                          </span>
                        )}
                        {item.specialInstructions && (
                          <span className="text-xs text-rose-500 font-bold block">
                            ★ {item.specialInstructions}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Action Bump Button */}
                <div className="pt-2">
                  {order.status === 'PENDING' && (
                    <Button
                      className="w-full h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Accept Order Ticket
                    </Button>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <Button
                      className="w-full h-11 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                    >
                      <Flame className="h-4 w-4 mr-1.5" />
                      Start Cooking Now
                    </Button>
                  )}

                  {order.status === 'PREPARING' && (
                    <Button
                      className="w-full h-11 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Mark Plated & Ready
                    </Button>
                  )}

                  {order.status === 'READY' && (
                    <Button
                      className="w-full h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAdvanceStatus(order.id, order.status)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Hand to Waiter (Served)
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
