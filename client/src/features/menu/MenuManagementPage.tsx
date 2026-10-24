import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { MenuItem, MenuCategory } from '../../types/index.js';
import { Button } from '../../components/ui/Button.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { ImageUpload } from '../../components/ui/ImageUpload.js';
import { formatCurrency } from '../../lib/utils.js';
import {
  BookOpen,
  Plus,
  Flame,
  Leaf,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { useAuthStore } from '../auth/AuthStore.js';

export const MenuManagementPage: React.FC = () => {
  const currentRestaurant = useAuthStore((state) => state.currentRestaurant);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);

  // Add Item form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dietaryType, setDietaryType] = useState<'veg' | 'non_veg' | 'vegan' | 'egg'>('veg');
  const [spicinessLevel, setSpicinessLevel] = useState(0);
  const [prepTime, setPrepTime] = useState(15);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [allergensText, setAllergensText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Item form state
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDietaryType, setEditDietaryType] = useState<'veg' | 'non_veg' | 'vegan' | 'egg'>('veg');
  const [editSpicinessLevel, setEditSpicinessLevel] = useState(0);
  const [editPrepTime, setEditPrepTime] = useState(15);
  const [editIsGlutenFree, setEditIsGlutenFree] = useState(false);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editAllergensText, setEditAllergensText] = useState('');

  // Add Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const fetchMenu = () => {
    api.get<any>('/menu')
      .then((res) => {
        if (res.success) {
          setCategories(res.categories || []);
          if (res.categories && res.categories.length > 0 && !categoryId) {
            setCategoryId(res.categories[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailability = async (itemId: string, current: boolean) => {
    try {
      await api.patch(`/menu/${itemId}/availability`, { isAvailable: !current });
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items?.map((item) =>
            item.id === itemId ? { ...item, isAvailable: !current } : item
          ),
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update item status');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently remove this dish from the menu?')) return;
    try {
      await api.delete(`/menu/items/${itemId}`);
      fetchMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to delete dish');
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategoryId(item.categoryId);
    setEditDescription(item.description || '');
    setEditBasePrice(String(item.basePrice));
    setEditImageUrl(item.imageUrl || '');
    setEditDietaryType(item.dietaryType || 'veg');
    setEditSpicinessLevel(item.spicinessLevel || 0);
    setEditPrepTime(item.preparationTimeMinutes || 15);
    setEditIsGlutenFree(Boolean(item.isGlutenFree));
    setEditIsFeatured(Boolean(item.isFeatured));
    setEditAllergensText(item.allergens ? item.allergens.join(', ') : '');
    setIsEditItemOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const allergens = editAllergensText
        ? editAllergensText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res: any = await api.put(`/menu/items/${editingItem.id}`, {
        name: editName,
        categoryId: editCategoryId,
        description: editDescription,
        basePrice: editBasePrice,
        imageUrl: editImageUrl,
        dietaryType: editDietaryType,
        spicinessLevel: editSpicinessLevel,
        preparationTimeMinutes: editPrepTime,
        isGlutenFree: editIsGlutenFree,
        isFeatured: editIsFeatured,
        allergens: allergens.length > 0 ? allergens : undefined,
      });

      if (res.success) {
        setIsEditItemOpen(false);
        setEditingItem(null);
        fetchMenu();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update dish');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant) return;
    setIsSubmitting(true);
    try {
      const allergens = allergensText
        ? allergensText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res: any = await api.post('/menu/items', {
        restaurantId: currentRestaurant.restaurantId,
        categoryId,
        name,
        description,
        basePrice,
        dietaryType,
        imageUrl,
        spicinessLevel,
        preparationTimeMinutes: prepTime,
        isGlutenFree,
        isFeatured,
        allergens: allergens.length > 0 ? allergens : undefined,
      });

      if (res.success) {
        setIsAddItemOpen(false);
        setName('');
        setDescription('');
        setBasePrice('');
        setImageUrl('');
        setAllergensText('');
        fetchMenu();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/menu/categories', {
        name: catName,
        description: catDesc || undefined,
      });
      if (res.success) {
        setIsAddCatOpen(false);
        setCatName('');
        setCatDesc('');
        fetchMenu();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const allItems = categories.flatMap((c) => c.items || []);
  const displayedItems =
    selectedCategoryId === 'all'
      ? allItems
      : allItems.filter((i) => i.categoryId === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Menu Catalog & Items</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage food categories, descriptions, dietary flags, photos, and instant 86-ing toggles
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsAddCatOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>

          <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Dish
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-3.5 py-1.5 rounded-xl border whitespace-nowrap transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
          }`}
        >
          All Categories ({allItems.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategoryId(c.id)}
            className={`px-3.5 py-1.5 rounded-xl border whitespace-nowrap transition-all ${
              selectedCategoryId === c.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
            }`}
          >
            {c.name} ({c.items?.length || 0})
          </button>
        ))}
      </div>

      {/* Items Table / Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading menu catalog...</div>
      ) : displayedItems.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-card rounded-3xl border border-border/60">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
          <p className="text-sm font-bold text-foreground">No dishes in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 shadow-sm space-y-3 bg-card transition-all flex flex-col justify-between ${
                item.isAvailable ? 'border-border/70 hover:border-primary/40' : 'border-rose-300/40 bg-muted/20 opacity-75'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border/50" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border/50">
                      Cravio
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground leading-snug line-clamp-1">{item.name}</span>
                      {item.dietaryType === 'veg' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Veg
                        </span>
                      )}
                      {item.dietaryType === 'non_veg' && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                          Non-Veg
                        </span>
                      )}
                      {item.dietaryType === 'vegan' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-600/10 px-1.5 py-0.2 rounded border border-emerald-600/20">
                          Vegan
                        </span>
                      )}
                      {item.isFeatured && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                    <span className="font-extrabold text-sm text-foreground font-display mt-1 block">
                      {formatCurrency(item.basePrice, currentRestaurant?.currencySymbol || '₹')}
                    </span>
                  </div>
                </div>

                {item.allergens && item.allergens.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Allergens: {item.allergens.join(', ')}
                  </p>
                )}
              </div>

              {/* Action Buttons: 86-ing Toggle, Edit & Delete */}
              <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    item.isAvailable
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-600'
                  }`}
                  title="Click to toggle item availability"
                >
                  {item.isAvailable ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Available</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span>86&apos;d (Sold Out)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit Dish & Photo"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dish Modal with Sticky Header, Scrollable Body, Sticky Footer & Portaled Select */}
      <Dialog
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Food Item"
        description="Add a new dish to the live customer menu"
        maxWidth="md"
        onSubmit={handleCreateItem}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Dish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Searchable Shadcn Select for Menu Category */}
          <Select
            label="Menu Category"
            searchable={true}
            placeholder="Search or pick category..."
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              description: c.description || undefined,
            }))}
            value={categoryId}
            onChange={setCategoryId}
          />

          <Input
            label="Dish Name"
            required
            placeholder="e.g. Truffle Forest Risotto"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Description & Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="Short appetizing description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Base Price (₹)"
              type="number"
              step="0.01"
              required
              placeholder="450.00"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />

            {/* Custom Shadcn Select for Dietary Type */}
            <Select
              label="Dietary Type"
              searchable={false}
              options={[
                {
                  value: 'veg',
                  label: 'Pure Veg',
                  icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />,
                },
                {
                  value: 'non_veg',
                  label: 'Non-Veg',
                  icon: <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />,
                },
                {
                  value: 'vegan',
                  label: '100% Vegan',
                  icon: <span className="text-xs">🌱</span>,
                },
                {
                  value: 'egg',
                  label: 'Contains Egg',
                  icon: <span className="text-xs">🍳</span>,
                },
              ]}
              value={dietaryType}
              onChange={(val) => setDietaryType(val as any)}
            />
          </div>

          {/* Interactive Image Upload Component */}
          <ImageUpload
            label="Dish Photo"
            value={imageUrl}
            onChange={setImageUrl}
            helperText="Drag & drop dish photo, browse files, or switch to URL"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Spiciness (0 to 3)"
              type="number"
              min={0}
              max={3}
              value={spicinessLevel}
              onChange={(e) => setSpicinessLevel(parseInt(e.target.value, 10))}
            />
            <Input
              label="Prep Time (Minutes)"
              type="number"
              min={1}
              value={prepTime}
              onChange={(e) => setPrepTime(parseInt(e.target.value, 10))}
            />
          </div>

          <Input
            label="Allergens (Comma-separated)"
            placeholder="e.g. dairy, gluten, nuts"
            value={allergensText}
            onChange={(e) => setAllergensText(e.target.value)}
          />

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={isGlutenFree}
                onChange={(e) => setIsGlutenFree(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>Gluten Free</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>Cravio Featured Special</span>
            </label>
          </div>
        </div>
      </Dialog>

      {/* Edit Dish Modal */}
      <Dialog
        isOpen={isEditItemOpen}
        onClose={() => {
          setIsEditItemOpen(false);
          setEditingItem(null);
        }}
        title="Edit Food Item"
        description="Update dish recipe, pricing, dietary flags, and photo"
        maxWidth="md"
        onSubmit={handleUpdateItem}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsEditItemOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update Dish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Searchable Shadcn Select for Menu Category */}
          <Select
            label="Menu Category"
            searchable={true}
            placeholder="Search or pick category..."
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              description: c.description || undefined,
            }))}
            value={editCategoryId}
            onChange={setEditCategoryId}
          />

          <Input
            label="Dish Name"
            required
            placeholder="e.g. Truffle Forest Risotto"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Description & Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="Short appetizing description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Base Price (₹)"
              type="number"
              step="0.01"
              required
              placeholder="450.00"
              value={editBasePrice}
              onChange={(e) => setEditBasePrice(e.target.value)}
            />

            {/* Custom Shadcn Select for Dietary Type */}
            <Select
              label="Dietary Type"
              searchable={false}
              options={[
                {
                  value: 'veg',
                  label: 'Pure Veg',
                  icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />,
                },
                {
                  value: 'non_veg',
                  label: 'Non-Veg',
                  icon: <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />,
                },
                {
                  value: 'vegan',
                  label: '100% Vegan',
                  icon: <span className="text-xs">🌱</span>,
                },
                {
                  value: 'egg',
                  label: 'Contains Egg',
                  icon: <span className="text-xs">🍳</span>,
                },
              ]}
              value={editDietaryType}
              onChange={(val) => setEditDietaryType(val as any)}
            />
          </div>

          {/* Interactive Image Upload Component */}
          <ImageUpload
            label="Dish Photo"
            value={editImageUrl}
            onChange={setEditImageUrl}
            helperText="Drag & drop new dish photo, browse files, or switch to URL"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Spiciness (0 to 3)"
              type="number"
              min={0}
              max={3}
              value={editSpicinessLevel}
              onChange={(e) => setEditSpicinessLevel(parseInt(e.target.value, 10))}
            />
            <Input
              label="Prep Time (Minutes)"
              type="number"
              min={1}
              value={editPrepTime}
              onChange={(e) => setEditPrepTime(parseInt(e.target.value, 10))}
            />
          </div>

          <Input
            label="Allergens (Comma-separated)"
            placeholder="e.g. dairy, gluten, nuts"
            value={editAllergensText}
            onChange={(e) => setEditAllergensText(e.target.value)}
          />

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={editIsGlutenFree}
                onChange={(e) => setEditIsGlutenFree(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>Gluten Free</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={editIsFeatured}
                onChange={(e) => setEditIsFeatured(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>Cravio Featured Special</span>
            </label>
          </div>
        </div>
      </Dialog>

      {/* Add Category Modal with Sticky Header, Scrollable Body & Sticky Footer */}
      <Dialog
        isOpen={isAddCatOpen}
        onClose={() => setIsAddCatOpen(false)}
        title="Add Menu Category"
        description="Organize your menu with a new section"
        maxWidth="sm"
        onSubmit={handleCreateCategory}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setIsAddCatOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Category
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Wood-Fired Pizzas"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Sourdough artisanal crusts"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  );
};
