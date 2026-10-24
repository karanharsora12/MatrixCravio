import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { DiningTable, Payment } from '../../types/index.js';
import { Button } from '../../components/ui/Button.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { useConfirm } from '../../components/ui/AlertDialog.js';
import { toast } from '../../components/ui/Toast.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import { Receipt, CreditCard, DollarSign, CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../auth/AuthStore.js';

export const BillingPage: React.FC = () => {
  const currentRestaurant = useAuthStore((state) => state.currentRestaurant);
  const { confirm } = useConfirm();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [billData, setBillData] = useState<any>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);

  // Settlement Form
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'online'>('cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchTables = () => {
    api.get<any>('/tables')
      .then((res) => {
        if (res.success) {
          setTables(res.tables || []);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSelectTable = (table: DiningTable) => {
    setSelectedTable(table);
    setIsLoadingBill(true);
    api.get<any>(`/billing/table/${table.id}`)
      .then((res) => {
        if (res.success) {
          setBillData(res);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingBill(false));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billData || !selectedTable || !billData.session) return;

    const ok = await confirm({
      title: 'Confirm Bill Settlement',
      description: `Record ${paymentMethod.toUpperCase()} payment of ${formatCurrency(billData.bill.balanceDue, currentRestaurant?.currencySymbol || '₹')} and close table session for ${selectedTable.tableNumber}?`,
      confirmText: 'Settle & Close Table',
      cancelText: 'Cancel',
      variant: 'default',
    });

    if (!ok) return;

    setIsSubmittingPayment(true);
    try {
      const res: any = await api.post('/billing/payments', {
        tableId: selectedTable.id,
        sessionId: billData.session.id,
        paymentMethod,
        amount: parseFloat(billData.bill.balanceDue),
        closeSession: true,
      });

      if (res.success) {
        setIsSettleModalOpen(false);
        setLastReceipt({
          receiptNumber: res.receiptNumber,
          restaurantName: currentRestaurant?.restaurantName || 'Cravio Bistro',
          tableNumber: selectedTable.tableNumber,
          date: new Date().toISOString(),
          orders: billData.orders,
          bill: billData.bill,
          paymentMethod,
        });
        setIsReceiptModalOpen(true);
        toast.success('Payment Settled', `Receipt #${res.receiptNumber || ''} generated.`);
        fetchTables();
        handleSelectTable(selectedTable);
      }
    } catch (err: any) {
      toast.error('Payment Settlement Failed', err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Billing & Table Settlements</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Consolidate multi-order table sessions, collect payments, and generate official tax receipts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Tables with Sessions */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Select Dining Table
          </span>

          <div className="space-y-2">
            {tables.map((t) => {
              const isSelected = selectedTable?.id === t.id;
              const isOccupied = t.status === 'occupied';

              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTable(t)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-border/70 hover:bg-muted/40 bg-card'
                  }`}
                >
                  <div>
                    <span className="font-extrabold text-sm text-foreground block">{t.tableNumber}</span>
                    <span className="text-xs text-muted-foreground">{t.displayName}</span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                        isOccupied
                          ? 'bg-rose-500/10 text-rose-600 border-rose-300'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Consolidated Bill Details */}
        <div className="lg:col-span-2">
          {!selectedTable ? (
            <div className="py-20 text-center bg-card rounded-3xl border border-border/60 space-y-2">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-bold text-foreground">Select a table on the left</p>
              <p className="text-xs text-muted-foreground">Review consolidated order tickets and settle bill</p>
            </div>
          ) : isLoadingBill ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Calculating table bill...</div>
          ) : !billData?.hasActiveSession ? (
            <div className="py-20 text-center bg-card rounded-3xl border border-border/60 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-foreground">{selectedTable.tableNumber} is Free</h3>
              <p className="text-xs text-muted-foreground">No active dining session or unpaid orders on this table.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
              {/* Table Bill Header */}
              <div className="flex items-start justify-between border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Consolidated Bill</span>
                  <h2 className="text-xl font-black font-display text-foreground mt-0.5">
                    {selectedTable.tableNumber} • {selectedTable.displayName}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Guest: {billData.session.customerName || 'Walk-in Guests'} • Session opened at{' '}
                    {formatDateTime(billData.session.openedAt)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Balance Due</span>
                  <span className="text-2xl font-black font-display text-primary">
                    {formatCurrency(billData.bill.balanceDue, billData.restaurant.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Multi-Order Breakdown */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Orders Included in this Session ({billData.orders.length})
                </span>

                <div className="space-y-3">
                  {billData.orders.map((o: any) => (
                    <div key={o.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-foreground">{o.orderNumber}</span>
                        <span className="text-primary font-display">
                          {formatCurrency(o.totalAmount, billData.restaurant.currencySymbol)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {o.items?.map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.itemNameSnapshot} {it.variantNameSnapshot ? `(${it.variantNameSnapshot})` : ''}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(it.totalPriceSnapshot, billData.restaurant.currencySymbol)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Totals Summary */}
              <div className="space-y-2 border-t border-border/60 pt-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(billData.bill.subtotal, billData.restaurant.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes & GST ({billData.restaurant.taxPercentage}%)</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(billData.bill.taxAmount, billData.restaurant.currencySymbol)}
                  </span>
                </div>
                {parseFloat(billData.bill.serviceChargeAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Charge ({billData.restaurant.serviceChargePercentage}%)</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(billData.bill.serviceChargeAmount, billData.restaurant.currencySymbol)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-foreground pt-2 border-t border-border/40">
                  <span>Grand Total</span>
                  <span className="text-primary font-display">
                    {formatCurrency(billData.bill.grandTotal, billData.restaurant.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Settlement Button */}
              <div className="pt-2">
                <Button
                  className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                  onClick={() => setIsSettleModalOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Settle Bill & Free Table • {formatCurrency(billData.bill.balanceDue, billData.restaurant.currencySymbol)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settle Bill Modal */}
      <Dialog
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        title="Collect Payment & Settle Table"
        description="Choose payment method and close session"
        maxWidth="sm"
        onSubmit={handleRecordPayment}
        footer={
          <>
            <Button variant="outline" type="button" className="flex-1" onClick={() => setIsSettleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 font-bold" isLoading={isSubmittingPayment}>
              Confirm Settlement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
            <span className="text-xs font-semibold text-muted-foreground block">Amount to Collect</span>
            <span className="text-2xl font-black font-display text-primary mt-0.5 block">
              {formatCurrency(billData?.bill?.balanceDue || 0, billData?.restaurant?.currencySymbol)}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', label: '💵 Cash' },
                { id: 'card', label: '💳 Card' },
                { id: 'upi', label: '📱 UPI / QR' },
                { id: 'online', label: '🌐 Online' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                    paymentMethod === m.id
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                      : 'border-border/60 hover:bg-muted text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Printable Receipt Modal */}
      <Dialog
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Tax Invoice / Receipt"
        maxWidth="md"
        footer={
          lastReceipt && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" />
                Print Receipt
              </Button>
              <Button className="flex-1" onClick={() => setIsReceiptModalOpen(false)}>
                Done
              </Button>
            </div>
          )
        }
      >
        {lastReceipt && (
          <div className="space-y-4">
            {/* Receipt Sheet */}
            <div className="p-6 rounded-2xl border border-border bg-white text-zinc-900 font-mono text-xs space-y-4 shadow-sm">
              <div className="text-center space-y-1">
                <h3 className="font-black text-base uppercase font-display">{lastReceipt.restaurantName}</h3>
                <p className="text-[11px] text-zinc-600">Plot 42, Cyber Hub Boulevard, Gurugram</p>
                <p className="text-[10px] text-zinc-500">GSTIN: 07AAAAA0000A1Z5</p>
                <div className="border-b border-dashed border-zinc-400 my-2" />
                <div className="flex justify-between text-[11px]">
                  <span>Receipt: {lastReceipt.receiptNumber}</span>
                  <span>Table: {lastReceipt.tableNumber}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Date: {new Date(lastReceipt.date).toLocaleDateString()}</span>
                  <span>Time: {new Date(lastReceipt.date).toLocaleTimeString()}</span>
                </div>
                <div className="border-b border-dashed border-zinc-400 my-2" />
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                {lastReceipt.orders?.flatMap((o: any) => o.items || []).map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.quantity}x {it.itemNameSnapshot}</span>
                    <span>{formatCurrency(it.totalPriceSnapshot)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastReceipt.bill.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span>{formatCurrency(parseFloat(lastReceipt.bill.taxAmount) / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span>{formatCurrency(parseFloat(lastReceipt.bill.taxAmount) / 2)}</span>
                </div>
                {parseFloat(lastReceipt.bill.serviceChargeAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>{formatCurrency(lastReceipt.bill.serviceChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-400">
                  <span>PAID ({lastReceipt.paymentMethod.toUpperCase()}):</span>
                  <span>{formatCurrency(lastReceipt.bill.grandTotal)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-zinc-500 pt-3 border-t border-dashed border-zinc-400">
                <p>Thank you for dining at Cravio Bistro & Lounge!</p>
                <p>Scan again soon for exclusive member perks.</p>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
