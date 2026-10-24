import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { users, restaurantUsers, restaurants } from '../../database/schema.js';
import { eq, and } from 'drizzle-orm';
import { config } from '../../config/index.js';
import { authenticate } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Invalid email or password format', errors: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    // Get user's restaurants and roles
    const userRestList = await db
      .select({
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        slug: restaurants.slug,
        role: restaurantUsers.role,
        logoUrl: restaurants.logoUrl,
      })
      .from(restaurantUsers)
      .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
      .where(eq(restaurantUsers.userId, user.id));

    // Default primary restaurant
    const primaryRest = userRestList[0] || null;

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.systemRole,
      restaurantId: primaryRest?.restaurantId,
      role: primaryRest?.role || user.systemRole,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.systemRole,
        phone: user.phone,
      },
      currentRestaurant: primaryRest,
      restaurants: userRestList,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or disabled' });
      return;
    }

    const userRestList = await db
      .select({
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        slug: restaurants.slug,
        role: restaurantUsers.role,
        logoUrl: restaurants.logoUrl,
        currencySymbol: restaurants.currencySymbol,
      })
      .from(restaurantUsers)
      .innerJoin(restaurants, eq(restaurantUsers.restaurantId, restaurants.id))
      .where(eq(restaurantUsers.userId, user.id));

    const activeRestaurantId = req.user?.restaurantId || userRestList[0]?.restaurantId;
    const currentRestaurant = userRestList.find(r => r.restaurantId === activeRestaurantId) || userRestList[0] || null;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.systemRole,
        phone: user.phone,
      },
      currentRestaurant,
      restaurants: userRestList,
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/switch-restaurant
authRouter.post('/switch-restaurant', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.body;
    const userId = req.user!.userId;

    const [mapping] = await db
      .select()
      .from(restaurantUsers)
      .where(and(eq(restaurantUsers.userId, userId), eq(restaurantUsers.restaurantId, restaurantId)))
      .limit(1);

    if (!mapping && req.user!.systemRole !== 'superadmin') {
      res.status(403).json({ success: false, message: 'You do not have access to this restaurant' });
      return;
    }

    const tokenPayload = {
      userId,
      email: req.user!.email,
      fullName: req.user!.fullName,
      systemRole: req.user!.systemRole,
      restaurantId,
      role: mapping?.role || req.user!.systemRole,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.json({ success: true, token, restaurantId, role: tokenPayload.role });
  } catch (error) {
    console.error('Switch restaurant error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
