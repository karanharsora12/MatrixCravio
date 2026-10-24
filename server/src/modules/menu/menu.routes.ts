import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/index.js';
import { 
  menuCategories, 
  menuItems, 
  menuItemVariants, 
  addonGroups, 
  addons, 
  menuItemAddonGroups 
} from '../../database/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { AuthenticatedRequest } from '../../shared/types.js';

export const menuRouter = Router();

// GET /api/menu (Full staff menu catalog)
menuRouter.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ success: false, message: 'Restaurant ID required' });
      return;
    }

    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(asc(menuCategories.displayOrder));

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(asc(menuItems.displayOrder));

    const variants = await db
      .select()
      .from(menuItemVariants)
      .orderBy(asc(menuItemVariants.displayOrder));

    const agList = await db
      .select()
      .from(addonGroups)
      .where(eq(addonGroups.restaurantId, restaurantId));

    const addonsList = await db
      .select()
      .from(addons)
      .orderBy(asc(addons.displayOrder));

    const itemAddonLinks = await db.select().from(menuItemAddonGroups);

    // Grouping
    const itemsWithDetails = items.map((item) => {
      const itemVariants = variants.filter((v) => v.menuItemId === item.id);
      const linkedGroupIds = itemAddonLinks.filter((l) => l.menuItemId === item.id).map((l) => l.addonGroupId);
      const itemGroups = agList
        .filter((g) => linkedGroupIds.includes(g.id))
        .map((g) => ({
          ...g,
          addons: addonsList.filter((a) => a.addonGroupId === g.id),
        }));

      return {
        ...item,
        variants: itemVariants,
        addonGroups: itemGroups,
      };
    });

    const categoryTree = categories.map((cat) => ({
      ...cat,
      items: itemsWithDetails.filter((i) => i.categoryId === cat.id),
    }));

    res.json({
      success: true,
      categories: categoryTree,
      addonGroups: agList.map((g) => ({
        ...g,
        addons: addonsList.filter((a) => a.addonGroupId === g.id),
      })),
    });
  } catch (error) {
    console.error('Fetch menu error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/menu/categories
menuRouter.post(
  '/categories',
  authenticate,
  authorizeRoles('owner', 'manager', 'chef', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().default('Utensils'),
        displayOrder: z.number().default(0),
      });

      const parsed = schema.parse(req.body);

      const [newCategory] = await db
        .insert(menuCategories)
        .values({
          restaurantId: restaurantId!,
          ...parsed,
        })
        .returning();

      res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ success: false, message: 'Failed to create category' });
    }
  }
);

// PUT /api/menu/categories/:id
menuRouter.put(
  '/categories/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'chef', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      });

      const parsed = schema.parse(req.body);

      const [updated] = await db
        .update(menuCategories)
        .set({ ...parsed, updatedAt: new Date() })
        .where(and(eq(menuCategories.id, id), eq(menuCategories.restaurantId, restaurantId!)))
        .returning();

      res.json({ success: true, category: updated });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  }
);

// DELETE /api/menu/categories/:id
menuRouter.delete(
  '/categories/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;

      await db
        .delete(menuCategories)
        .where(and(eq(menuCategories.id, id), eq(menuCategories.restaurantId, restaurantId!)));

      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
  }
);

// POST /api/menu/items
menuRouter.post(
  '/items',
  authenticate,
  authorizeRoles('owner', 'manager', 'chef', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user?.restaurantId;
      const itemSchema = z.object({
        categoryId: z.string().uuid(),
        name: z.string().min(1),
        description: z.string().optional(),
        basePrice: z.string().or(z.number()).transform(v => String(v)),
        imageUrl: z.string().optional(),
        dietaryType: z.enum(['veg', 'non_veg', 'vegan', 'egg']).default('veg'),
        isGlutenFree: z.boolean().default(false),
        spicinessLevel: z.number().int().min(0).max(3).default(0),
        preparationTimeMinutes: z.number().int().default(15),
        isFeatured: z.boolean().default(false),
        allergens: z.array(z.string()).optional(),
        variants: z.array(
          z.object({
            name: z.string(),
            priceModifier: z.string().or(z.number()).transform(v => String(v)),
            isDefault: z.boolean().default(false),
          })
        ).optional(),
        addonGroupIds: z.array(z.string().uuid()).optional(),
      });

      const parsed = itemSchema.parse(req.body);

      const [newItem] = await db
        .insert(menuItems)
        .values({
          restaurantId: restaurantId!,
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          basePrice: parsed.basePrice,
          imageUrl: parsed.imageUrl,
          dietaryType: parsed.dietaryType,
          isGlutenFree: parsed.isGlutenFree,
          spicinessLevel: parsed.spicinessLevel,
          preparationTimeMinutes: parsed.preparationTimeMinutes,
          isFeatured: parsed.isFeatured,
          allergens: parsed.allergens || null,
        })
        .returning();

      // Insert variants if provided
      if (parsed.variants && parsed.variants.length > 0) {
        for (let i = 0; i < parsed.variants.length; i++) {
          const v = parsed.variants[i];
          await db.insert(menuItemVariants).values({
            menuItemId: newItem.id,
            name: v.name,
            priceModifier: v.priceModifier,
            isDefault: v.isDefault,
            displayOrder: i,
          });
        }
      }

      // Link addon groups if provided
      if (parsed.addonGroupIds && parsed.addonGroupIds.length > 0) {
        for (let i = 0; i < parsed.addonGroupIds.length; i++) {
          await db.insert(menuItemAddonGroups).values({
            menuItemId: newItem.id,
            addonGroupId: parsed.addonGroupIds[i],
            displayOrder: i,
          });
        }
      }

      res.status(201).json({ success: true, item: newItem });
    } catch (error) {
      console.error('Create item error:', error);
      res.status(500).json({ success: false, message: 'Failed to create menu item' });
    }
  }
);

// PUT /api/menu/items/:id
menuRouter.put(
  '/items/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'chef', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;

      const schema = z.object({
        categoryId: z.string().uuid().optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        basePrice: z.string().or(z.number()).transform(v => String(v)).optional(),
        imageUrl: z.string().optional(),
        dietaryType: z.enum(['veg', 'non_veg', 'vegan', 'egg']).optional(),
        isGlutenFree: z.boolean().optional(),
        spicinessLevel: z.number().int().min(0).max(3).optional(),
        preparationTimeMinutes: z.number().int().optional(),
        isAvailable: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        allergens: z.array(z.string()).optional(),
      });

      const parsed = schema.parse(req.body);

      const [updated] = await db
        .update(menuItems)
        .set({ ...parsed, updatedAt: new Date() })
        .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId!)))
        .returning();

      res.json({ success: true, item: updated });
    } catch (error) {
      console.error('Update item error:', error);
      res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
  }
);

// PATCH /api/menu/items/:id/availability (Instant 86-ing / Restock by Chef or Staff)
menuRouter.patch('/:id/availability', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isAvailable } = req.body;
    const restaurantId = req.user?.restaurantId;

    const [updated] = await db
      .update(menuItems)
      .set({ isAvailable: Boolean(isAvailable), updatedAt: new Date() })
      .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId!)))
      .returning();

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Item availability toggle error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
});

// DELETE /api/menu/items/:id
menuRouter.delete(
  '/items/:id',
  authenticate,
  authorizeRoles('owner', 'manager', 'superadmin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const restaurantId = req.user?.restaurantId;

      await db
        .delete(menuItems)
        .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId!)));

      res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
      console.error('Delete item error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete menu item' });
    }
  }
);
