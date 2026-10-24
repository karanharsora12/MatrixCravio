import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { CustomerLayout } from '../../components/layout/CustomerLayout.js';
import { MenuItem, MenuCategory, Restaurant, DiningTable, TableSession } from '../../types/index.js';
import { ItemCustomizationModal } from './ItemCustomizationModal.js';
import { formatCurrency } from '../../lib/utils.js';
import { useCartStore } from '../cart/CartStore.js';
import { Search, Flame, Leaf, Wheat, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { toast } from '../../components/ui/Toast.js';

export const CustomerMenuPage: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<DiningTable | null>(null);
  const [session, setSession] = useState<TableSession | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiet, setSelectedDiet] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

  const setRestaurantPolicy = useCartStore((state) => state.setRestaurantPolicy);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!qrToken) return;

    setIsLoading(true);
    api.get<any>(`/public/qr/${qrToken}`)
      .then((res) => {
        if (res.success) {
          setRestaurant(res.restaurant);
          setTable(res.table);
          setSession(res.session);
          setCategories(res.categories || []);

          if (res.categories && res.categories.length > 0) {
            setActiveCategory(res.categories[0].id);
          }

          if (res.restaurant) {
            setRestaurantPolicy(
              parseFloat(res.restaurant.taxPercentage || '5.00'),
              parseFloat(res.restaurant.serviceChargePercentage || '0.00'),
              res.restaurant.currencySymbol || '₹'
            );
          }
        } else {
          setError(res.message || 'Unable to load menu');
        }
      })
      .catch((err) => {
        setError(err.message || 'Invalid or revoked QR token');
      })
      .finally(() => setIsLoading(false));
  }, [qrToken, setRestaurantPolicy]);

  // Filter items based on search and dietary filter
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const filteredItems = (cat.items || []).filter((item) => {
          const matchesSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

          const matchesDiet =
            selectedDiet === 'all' ||
            (selectedDiet === 'veg' && item.dietaryType === 'veg') ||
            (selectedDiet === 'non_veg' && item.dietaryType === 'non_veg') ||
            (selectedDiet === 'vegan' && item.dietaryType === 'vegan') ||
            (selectedDiet === 'featured' && item.isFeatured);

          return matchesSearch && matchesDiet;
        });

        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery, selectedDiet]);

  // Quick add without customization (if no variants or addon groups)
  const handleQuickAdd = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((item.variants && item.variants.length > 0) || (item.addonGroups && item.addonGroups.length > 0)) {
      setSelectedItemForModal(item);
    } else {
      addItem({
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        dietaryType: item.dietaryType,
        basePrice: parseFloat(item.basePrice),
        variant: null,
        selectedAddons: [],
        unitPrice: parseFloat(item.basePrice),
        quantity: 1,
      });
      toast.success('Added to Cart', item.name);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !restaurant || !table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-card border border-border p-8 rounded-3xl shadow-xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">Menu Unavailable</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error || 'This QR code is either expired, revoked, or the restaurant is currently closed.'}
          </p>
          <p className="text-xs text-muted-foreground">Please ask your server for a fresh QR code.</p>
        </div>
      </div>
    );
  }

  return (
    <CustomerLayout
      restaurantName={restaurant.name}
      restaurantLogo={restaurant.logoUrl}
      tableNumber={table.tableNumber}
      tableDisplayName={table.displayName}
      qrToken={qrToken!}
      sessionToken={session?.sessionToken}
      currencySymbol={restaurant.currencySymbol}
    >
      <div className="space-y-4">
        {/* Restaurant Hero Card */}
        {restaurant.coverUrl && (
          <div className="relative h-36 sm:h-44 rounded-3xl overflow-hidden shadow-sm">
            <img src={restaurant.coverUrl} alt={restaurant.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary font-display">
                Matrix Cravio Menu
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display leading-tight">{restaurant.name}</h2>
              {restaurant.tagline && (
                <p className="text-xs text-zinc-300 mt-0.5 line-clamp-1">{restaurant.tagline}</p>
              )}
            </div>
          </div>
        )}

        {/* Search & Dietary Filter */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes, burgers, pizzas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Dishes' },
              { id: 'veg', label: '🟢 Veg Only' },
              { id: 'non_veg', label: '🔴 Non-Veg' },
              { id: 'vegan', label: '🌱 100% Vegan' },
              { id: 'featured', label: '⭐ Cravio Specials' },
            ].map((diet) => (
              <button
                key={diet.id}
                type="button"
                onClick={() => setSelectedDiet(diet.id)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all select-none border ${
                  selectedDiet === diet.id
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                    : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
                }`}
              >
                {diet.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Category Tabs Bar */}
        <div className="sticky top-16 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md border-b border-border/40 overflow-x-auto no-scrollbar flex gap-2">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                setActiveCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
              }`}
            >
              {cat.name}
            </a>
          ))}
        </div>

        {/* Category Items Sections */}
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-base font-bold text-foreground">No dishes found</p>
            <p className="text-xs text-muted-foreground">Try clearing your search query or dietary filter</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3 pt-2">
              <div className="border-b border-border/40 pb-1.5">
                <h3 className="text-lg font-bold font-display text-foreground">{cat.name}</h3>
                {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {cat.items?.map((item) => {
                  const hasCustomizations =
                    (item.variants && item.variants.length > 0) || (item.addonGroups && item.addonGroups.length > 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemForModal(item)}
                      className="group relative flex items-start gap-3.5 p-3.5 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer select-none"
                    >
                      {/* Dish Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.dietaryType === 'veg' ? (
                            <span className="h-3 w-3 rounded-full border border-emerald-500 flex items-center justify-center p-0.5" title="Pure Veg">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                          ) : (
                            <span className="h-3 w-3 rounded-full border border-rose-500 flex items-center justify-center p-0.5" title="Non-Veg">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            </span>
                          )}

                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                            {item.name}
                          </h4>

                          {item.isFeatured && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.2 rounded font-bold border border-amber-500/20">
                              Special
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="font-extrabold text-sm text-foreground font-display">
                            {formatCurrency(item.basePrice, restaurant.currencySymbol)}
                          </span>
                          {hasCustomizations && (
                            <span className="text-[10px] text-muted-foreground font-medium">Customizable</span>
                          )}
                        </div>
                      </div>

                      {/* Dish Image & Add Button */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-24 w-24 rounded-2xl object-cover shadow-sm group-hover:scale-[1.02] transition-transform"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground text-xs font-semibold">
                            Cravio
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(item, e)}
                          className="absolute -bottom-2 bg-card hover:bg-primary text-primary hover:text-white border border-primary/40 px-3 py-1 rounded-xl shadow-md text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <span>{hasCustomizations ? 'ADD +' : 'ADD'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={!!selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
        item={selectedItemForModal}
        currencySymbol={restaurant.currencySymbol}
      />
    </CustomerLayout>
  );
};
