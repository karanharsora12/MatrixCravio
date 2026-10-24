import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/AuthStore.js';
import { getSocket } from '../../lib/socket.js';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  QrCode,
  BookOpen,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu as MenuIcon,
  X,
  ExternalLink,
  Store,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRestaurant, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsSocketConnected(socket.connected);

    socket.on('connect', () => {
      setIsSocketConnected(true);
      if (currentRestaurant?.restaurantId) {
        socket.emit('join_restaurant', currentRestaurant.restaurantId);
        socket.emit('join_kitchen', currentRestaurant.restaurantId);
      }
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    if (currentRestaurant?.restaurantId) {
      socket.emit('join_restaurant', currentRestaurant.restaurantId);
      socket.emit('join_kitchen', currentRestaurant.restaurantId);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [currentRestaurant]);

  const navLinks = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/dashboard/orders', label: 'Live Orders', icon: UtensilsCrossed },
    { to: '/dashboard/kitchen', label: 'Kitchen KDS', icon: ChefHat },
    { to: '/dashboard/tables', label: 'Tables & QR', icon: QrCode },
    { to: '/dashboard/menu', label: 'Menu Catalog', icon: BookOpen },
    { to: '/dashboard/service', label: 'Service Calls', icon: Bell },
    { to: '/dashboard/billing', label: 'Billing & Cash', icon: Receipt },
    { to: '/dashboard/reports', label: 'Reports & Sales', icon: BarChart3 },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col md:flex-row font-sans selection:bg-primary/20">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border/60 shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white">
            <QrCode className="h-4 w-4" />
          </div>
          <span className="font-bold text-base font-display">Matrix Cravio</span>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl border border-border text-foreground hover:bg-muted"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Sticky and fixed on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/60 flex flex-col shrink-0 h-full md:sticky md:top-0 md:h-screen transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo & Name */}
        <div className="p-5 border-b border-border/40 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base font-display block leading-tight text-foreground">
                Matrix Cravio
              </span>
            </div>
          </div>
        </div>

        {/* Restaurant Selector */}
        <div className="px-3 py-3 border-b border-border/40 shrink-0">
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Store className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <span className="text-xs font-bold block truncate text-foreground">
                  {currentRestaurant?.restaurantName || 'Cravio Bistro'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Links Navigation - Scrollable inside sidebar if needed */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard'}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/25 font-extrabold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout - Sticky at bottom of sidebar */}
        <div className="p-3 border-t border-border/40 space-y-2 shrink-0 bg-card">

          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <span className="text-xs font-bold block truncate text-foreground">{user?.fullName || 'Staff User'}</span>
              <span className="text-[10px] text-muted-foreground truncate block">{user?.email}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View - Scrolls independently */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-background">
        <header className="hidden md:flex h-16 border-b border-border/50 bg-card/80 backdrop-blur-md px-6 items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-display">
              {currentRestaurant?.restaurantName || 'Cravio Bistro'}
            </span>
          </div>

          {/* Quick link to preview table QR scan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/menu/crv_tok_table_01_window', '_blank')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Customer Table 1 Preview</span>
            </button>
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
