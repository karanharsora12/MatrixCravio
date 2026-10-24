import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { formatCurrency, formatDateTime } from '../../lib/utils.js';
import {
  DollarSign,
  ShoppingBag,
  ChefHat,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Flame,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton.js';

export const OverviewDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get<any>('/reports/overview')
      .then((res) => {
        if (res.success) {
          setData(res);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const topItems = data?.topItems || [];
  const recentPayments = data?.recentPayments || [];
  const hourlySales = data?.hourlySales || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Today&apos;s Operations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time floor, kitchen, and sales performance</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/kitchen')}>
            <ChefHat className="h-4 w-4 mr-1.5 text-primary" />
            Kitchen Display
          </Button>
          <Button size="sm" onClick={() => navigate('/dashboard/orders')}>
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            Incoming Orders
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <Card className="hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Sales</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">
              {formatCurrency(metrics.todaySales || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Average ticket: {formatCurrency(metrics.averageOrderValue || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Today Orders */}
        <Card className="hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Orders</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">{metrics.todayOrdersCount || 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.pendingOrdersCount > 0 ? (
                <span className="text-amber-600 font-semibold">{metrics.pendingOrdersCount} pending approval</span>
              ) : (
                'All caught up'
              )}
            </p>
          </CardContent>
        </Card>

        {/* In Kitchen / Prep */}
        <Card className="hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Kitchen Prep</span>
            <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <ChefHat className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">
              {metrics.preparingOrdersCount || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Orders currently on grill & oven</p>
          </CardContent>
        </Card>

        {/* Table Occupancy */}
        <Card className="hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Table Occupancy</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-display text-foreground">{metrics.occupancyRate || 0}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.occupiedTables || 0} of {metrics.totalTables || 0} dining tables occupied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Sales Trend Bar Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Sales Pace</CardTitle>
          <p className="text-xs text-muted-foreground">Volume distribution across today&apos;s lunch & dinner services</p>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {hourlySales.map((slot: any) => {
              const maxSale = 4500;
              const heightPct = Math.min(100, Math.max(10, Math.round((slot.sales / maxSale) * 100)));
              return (
                <div key={slot.time} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(slot.sales)}
                  </span>
                  <div className="w-full bg-muted/60 rounded-t-lg relative flex items-end h-32 overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-primary group-hover:bg-primary/90 transition-all rounded-t-lg"
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground mt-1">{slot.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Top Items & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span>Best Selling Dishes</span>
            </CardTitle>
            <button
              onClick={() => navigate('/dashboard/menu')}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Menu Catalog →
            </button>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No order history yet today.</p>
            ) : (
              <div className="divide-y divide-border/40 space-y-2">
                {topItems.map((item: any, idx: number) => (
                  <div key={item.itemName} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center font-bold text-[11px] text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-foreground">{item.itemName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground block">{item.totalQuantity} sold</span>
                      <span className="text-[11px] text-muted-foreground">{formatCurrency(item.totalRevenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Settlements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              <span>Recent Payments</span>
            </CardTitle>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Billing Ledger →
            </button>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No payments recorded yet today.</p>
            ) : (
              <div className="divide-y divide-border/40 space-y-2">
                {recentPayments.map((p: any) => (
                  <div key={p.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">{p.receiptNumber}</span>
                      <span className="text-[11px] text-muted-foreground block capitalize">
                        Method: {p.paymentMethod} • {formatDateTime(p.createdAt)}
                      </span>
                    </div>
                    <span className="font-extrabold text-sm text-emerald-600 font-display">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
