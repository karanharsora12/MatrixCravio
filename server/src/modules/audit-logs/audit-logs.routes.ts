import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { auditLogs, users } from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';

export const auditLogsRouter = Router();

// GET /api/audit-logs
auditLogsRouter.get(
  '/',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;

      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          performedByName: users.fullName,
          performedByEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.restaurantId, restaurantId!))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);

      res.json({ success: true, logs });
    } catch (error) {
      console.error('Fetch audit logs error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);
