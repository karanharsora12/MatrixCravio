import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  CreditCard,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Skeleton } from '../../components/ui/Skeleton.js';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.get<any>('/reports/overview'), api.get<any>('/billing/payments/history')])
      .then(([repRes, payRes]) => {
        if (repRes.success) setReport(repRes);
        if (payRes.success) setPaymentsHistory(payRes.payments || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (paymentsHistory.length === 0) return;
    const headers = ['Receipt Number', 'Table', 'Payment Method', 'Amount', 'Date'];
    const rows = paymentsHistory.map((p) => [
      p.receiptNumber,
      p.tableNumber || 'N/A',
      p.paymentMethod,
      p.amount,
      new Date(p.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cravio_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const metrics = report?.metrics || {};
  const topItems = report?.topItems || [];
  const hourlySales = report?.hourlySales || [];

  return (
    <div className="space-y-6">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit restaurant performance, top revenue contributors, and export transactions
          </p>
        </div>

        <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Transactions (CSV)
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Sales</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">
              {formatCurrency(metrics.todaySales || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Average: {formatCurrency(metrics.averageOrderValue || 0)}/ticket</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Volume</span>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">{metrics.todayOrdersCount || 0} Orders</div>
            <p className="text-[11px] text-muted-foreground mt-1">All QR contactless checkouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Table Turnover</span>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">{metrics.occupancyRate || 0}% Occupancy</div>
            <p className="text-[11px] text-muted-foreground mt-1">{metrics.occupiedTables || 0} active dining tables</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Dishes Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Dishes</CardTitle>
          <p className="text-xs text-muted-foreground">Highest performing menu items ranked by quantity and gross revenue</p>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/40">
            {topItems.map((item: any, idx: number) => (
              <div key={item.itemName} className="py-3 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-extrabold text-sm text-foreground block">{item.itemName}</span>
                    <span className="text-[11px] text-muted-foreground">{item.totalQuantity} portions sold</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black font-display text-primary block">
                    {formatCurrency(item.totalRevenue)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Gross contribution</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Payment Ledger</CardTitle>
          <p className="text-xs text-muted-foreground">Recent tax invoices and closed table settlements</p>
        </CardHeader>
        <CardContent>
          {paymentsHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No payment records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-2.5">Receipt #</th>
                    <th className="pb-2.5">Table</th>
                    <th className="pb-2.5">Method</th>
                    <th className="pb-2.5">Amount</th>
                    <th className="pb-2.5">Date & Time</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paymentsHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 font-mono font-bold text-foreground">{p.receiptNumber}</td>
                      <td className="py-2.5">{p.tableNumber || 'N/A'}</td>
                      <td className="py-2.5 capitalize font-medium">{p.paymentMethod}</td>
                      <td className="py-2.5 font-extrabold text-primary font-display">{formatCurrency(p.amount)}</td>
                      <td className="py-2.5 text-muted-foreground">{formatDateTime(p.createdAt)}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
