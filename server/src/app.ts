import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes.js';
import { restaurantsRouter } from './modules/restaurants/restaurants.routes.js';
import { tablesRouter } from './modules/tables/tables.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { customerPortalRouter } from './modules/customer-portal/customer.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { serviceRouter } from './modules/service/service.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { auditLogsRouter } from './modules/audit-logs/audit-logs.routes.js';

export function createApp() {
  const app = express();

  // Security & Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'Matrix Cravio',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/restaurants', restaurantsRouter);
  app.use('/api/tables', tablesRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/public', customerPortalRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/service-requests', serviceRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit-logs', auditLogsRouter);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  return app;
}
