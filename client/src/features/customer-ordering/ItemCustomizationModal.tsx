import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/ui/Dialog.js';
import { Button } from '../../components/ui/Button.js';
import { MenuItem, MenuItemVariant, Addon } from '../../types/index.js';
import { formatCurrency } from '../../lib/utils.js';
import { Minus, Plus, Flame, Leaf, Wheat, Info } from 'lucide-react';
import { useCartStore } from '../cart/CartStore.js';

interface ItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  currencySymbol?: string;
}

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  onClose,
  item,
  currencySymbol = '₹',
}) => {
  const addItem = useCartStore((state) => state.addItem);

  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Initialize variant when item changes
  useEffect(() => {
    if (item) {
      const defaultVariant = item.variants?.find((v) => v.isDefault) || item.variants?.[0] || null;
      setSelectedVariant(defaultVariant);
      setSelectedAddons([]);
      setSpecialInstructions('');
      setQuantity(1);
    }
  }, [item]);

  if (!item) return null;

  // Toggle addon selection
  const handleToggleAddon = (addon: Addon, maxSelections: number) => {
    const isAlreadySelected = selectedAddons.some((a) => a.id === addon.id);

    if (isAlreadySelected) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      // Check max selections for group
      const currentInGroup = selectedAddons.filter((a) => a.addonGroupId === addon.addonGroupId);
      if (currentInGroup.length >= maxSelections && maxSelections === 1) {
        // Swap selection
        setSelectedAddons([...selectedAddons.filter((a) => a.addonGroupId !== addon.addonGroupId), addon]);
      } else if (currentInGroup.length < maxSelections) {
        setSelectedAddons([...selectedAddons, addon]);
      }
    }
  };

  // Calculate unit price
  const basePrice = parseFloat(item.basePrice);
  const variantModifier = selectedVariant ? parseFloat(selectedVariant.priceModifier) : 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + parseFloat(a.price), 0);
  const unitPrice = basePrice + variantModifier + addonsTotal;
  const grandTotal = unitPrice * quantity;

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      dietaryType: item.dietaryType,
      basePrice,
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            priceModifier: parseFloat(selectedVariant.priceModifier),
          }
        : null,
      selectedAddons: selectedAddons.map((a) => ({
        id: a.id,
        name: a.name,
        price: parseFloat(a.price),
      })),
      unitPrice,
      quantity,
      specialInstructions: specialInstructions.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      description="Customize size, toppings, and special instructions"
      maxWidth="md"
      footer={
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center rounded-xl border border-input bg-background/50 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-foreground disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button className="flex-1 h-11 text-sm font-bold shadow-md shadow-primary/20" onClick={handleAddToCart}>
            Add to Order • {formatCurrency(grandTotal, currencySymbol)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Item Header & Image */}
        {item.imageUrl && (
          <div className="relative h-44 -mx-6 -mt-4 mb-3 overflow-hidden">
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
              <span className="font-bold text-base font-display">{item.name}</span>
              <span className="text-xs font-semibold bg-primary/90 px-2.5 py-1 rounded-full">
                {formatCurrency(unitPrice, currencySymbol)}
              </span>
            </div>
          </div>
        )}

        {/* Dietary badges & description */}
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {item.dietaryType === 'veg' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Leaf className="h-3 w-3" /> Pure Veg
              </span>
            )}
            {item.dietaryType === 'non_veg' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Non-Veg
              </span>
            )}
            {item.dietaryType === 'vegan' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                🌱 100% Vegan
              </span>
            )}
            {item.spicinessLevel > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Flame className="h-3 w-3" /> Spicy ({item.spicinessLevel}/3)
              </span>
            )}
            {item.isGlutenFree && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <Wheat className="h-3 w-3" /> Gluten Free
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          {item.allergens && item.allergens.length > 0 && (
            <p className="text-[11px] text-amber-600/90 font-medium mt-1">
              ⚠️ Allergens: {item.allergens.join(', ')}
            </p>
          )}
        </div>

        {/* Variants (Portion/Size) */}
        {item.variants && item.variants.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Size / Portion</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const mod = parseFloat(v.priceModifier);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary'
                        : 'border-border/60 hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <span className="text-sm">{v.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {mod > 0 ? `+${formatCurrency(mod, currencySymbol)}` : 'Standard'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Addon Groups */}
        {item.addonGroups &&
          item.addonGroups.map((group) => (
            <div key={group.id} className="space-y-2 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.name}</h4>
                <span className="text-[11px] text-muted-foreground">
                  {group.maxSelections > 1 ? `Up to ${group.maxSelections}` : 'Pick 1'}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.addons.map((add) => {
                  const isSelected = selectedAddons.some((a) => a.id === add.id);
                  const price = parseFloat(add.price);
                  return (
                    <label
                      key={add.id}
                      onClick={() => handleToggleAddon(add, group.maxSelections)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border/50 hover:bg-muted/30 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-input'
                          }`}
                        >
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <span className="text-xs">{add.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">
                        +{formatCurrency(price, currencySymbol)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

        {/* Special Instructions */}
        <div className="space-y-1.5 border-t border-border/40 pt-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Special Cooking Request
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Less spicy, dressing on the side, well done..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-input bg-background/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </Dialog>
  );
};
