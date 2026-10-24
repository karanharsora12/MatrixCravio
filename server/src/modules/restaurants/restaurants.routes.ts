import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { restaurants, restaurantSettings, restaurantUsers, users } from '../../database/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';

export const restaurantsRouter = Router();

// GET /api/restaurants/current
restaurantsRouter.get('/current', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'No restaurant associated with session' });
      return;
    }

    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    const [settings] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId)).limit(1);

    res.json({
      success: true,
      restaurant,
      settings: settings || null,
    });
  } catch (error) {
    console.error('Fetch restaurant error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/restaurants/current (Owners and Managers)
restaurantsRouter.put(
  '/current',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'No restaurant associated' });
        return;
      }

      const updateSchema = z.object({
        name: z.string().min(2).optional(),
        tagline: z.string().optional(),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        coverUrl: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        currencySymbol: z.string().optional(),
        taxPercentage: z.string().or(z.number()).transform(val => String(val)).optional(),
        serviceChargePercentage: z.string().or(z.number()).transform(val => String(val)).optional(),
        isOpen: z.boolean().optional(),
        openingTime: z.string().optional(),
        closingTime: z.string().optional(),
        allowOrdering: z.boolean().optional(),
        autoAcceptOrders: z.boolean().optional(),
      });

      const parsed = updateSchema.parse(req.body);

      const [updated] = await db
        .update(restaurants)
        .set({
          ...parsed,
          updatedAt: new Date(),
        })
        .where(eq(restaurants.id, restaurantId))
        .returning();

      res.json({ success: true, message: 'Restaurant profile updated successfully', restaurant: updated });
    } catch (error) {
      console.error('Update restaurant error:', error);
      res.status(500).json({ success: false, message: 'Failed to update restaurant profile' });
    }
  }
);

// GET /api/restaurants/settings
restaurantsRouter.get('/settings', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'No restaurant selected' });
      return;
    }

    const [settings] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId)).limit(1);

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/restaurants/settings
restaurantsRouter.put(
  '/settings',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'No restaurant selected' });
        return;
      }

      const settingsSchema = z.object({
        enableSoundNotifications: z.boolean().optional(),
        enableCustomerCancellation: z.boolean().optional(),
        customerCancellationWindowSeconds: z.number().optional(),
        printKitchenTokenOnAccept: z.boolean().optional(),
        taxRegistrationNumber: z.string().optional(),
        receiptFooterText: z.string().optional(),
      });

      const parsed = settingsSchema.parse(req.body);

      const [updated] = await db
        .update(restaurantSettings)
        .set({
          ...parsed,
          updatedAt: new Date(),
        })
        .where(eq(restaurantSettings.restaurantId, restaurantId))
        .returning();

      res.json({ success: true, message: 'Operational settings saved', settings: updated });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to save settings' });
    }
  }
);

// GET /api/restaurants/staff
restaurantsRouter.get(
  '/staff',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'No restaurant selected' });
        return;
      }

      const staffList = await db
        .select({
          id: restaurantUsers.id,
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          role: restaurantUsers.role,
          isActive: users.isActive,
          createdAt: restaurantUsers.createdAt,
        })
        .from(restaurantUsers)
        .innerJoin(users, eq(restaurantUsers.userId, users.id))
        .where(eq(restaurantUsers.restaurantId, restaurantId));

      res.json({ success: true, staff: staffList });
    } catch (error) {
      console.error('Fetch staff error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);
