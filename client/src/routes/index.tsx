import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CustomerMenuPage } from '../features/customer-ordering/CustomerMenuPage.js';
import { OrderTrackingPage } from '../features/orders/OrderTrackingPage.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { ProtectedRoute } from '../features/auth/ProtectedRoute.js';
import { DashboardLayout } from '../components/layout/DashboardLayout.js';
import { OverviewDashboardPage } from '../features/dashboard/OverviewDashboardPage.js';
import { StaffOrdersPage } from '../features/orders/StaffOrdersPage.js';
import { KitchenDisplayPage } from '../features/kitchen/KitchenDisplayPage.js';
import { TableManagementPage } from '../features/tables/TableManagementPage.js';
import { MenuManagementPage } from '../features/menu/MenuManagementPage.js';
import { StaffServiceRequestsPage } from '../features/service/StaffServiceRequestsPage.js';
import { BillingPage } from '../features/billing/BillingPage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { SettingsPage } from '../features/settings/SettingsPage.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Customer QR Experience */}
      <Route path="/menu/:qrToken" element={<CustomerMenuPage />} />
      <Route path="/order/:orderId" element={<OrderTrackingPage />} />

      {/* Staff Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Restaurant Dashboard */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewDashboardPage />} />
          <Route path="orders" element={<StaffOrdersPage />} />
          <Route path="kitchen" element={<KitchenDisplayPage />} />
          <Route path="tables" element={<TableManagementPage />} />
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="service" element={<StaffServiceRequestsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Default Landing Fallback */}
      <Route path="/" element={<Navigate to="/menu/crv_tok_table_01_window" replace />} />
      <Route path="*" element={<Navigate to="/menu/crv_tok_table_01_window" replace />} />
    </Routes>
  );
};
