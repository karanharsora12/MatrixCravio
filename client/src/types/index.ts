export type UserRole = 'superadmin' | 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'user';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRequestType = 'call_waiter' | 'request_water' | 'request_cutlery' | 'request_bill' | 'cleaning';

export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'resolved';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  systemRole: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  currencyCode: string;
  currencySymbol: string;
  taxPercentage: string;
  serviceChargePercentage: string;
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
  allowOrdering: boolean;
  autoAcceptOrders: boolean;
}

export interface RestaurantSettings {
  id: string;
  restaurantId: string;
  enableSoundNotifications: boolean;
  enableCustomerCancellation: boolean;
  customerCancellationWindowSeconds: number;
  printKitchenTokenOnAccept: boolean;
  taxRegistrationNumber?: string;
  receiptFooterText?: string;
}

export interface DiningTable {
  id: string;
  restaurantId: string;
  tableNumber: string;
  displayName: string;
  zone: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  isActive: boolean;
  qrToken?: string | null;
  qrExpiresAt?: string | null;
  activeSession?: TableSession | null;
  activeOrdersCount?: number;
}

export interface TableSession {
  id: string;
  sessionToken: string;
  guestCount?: number;
  status: 'active' | 'billing' | 'closed';
  openedAt: string;
  closedAt?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface MenuItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  priceModifier: string;
  isDefault: boolean;
  displayOrder: number;
  isAvailable: boolean;
}

export interface Addon {
  id: string;
  addonGroupId: string;
  name: string;
  price: string;
  isAvailable: boolean;
  displayOrder: number;
}

export interface AddonGroup {
  id: string;
  name: string;
  description?: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  addons: Addon[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: string;
  imageUrl?: string;
  dietaryType: 'veg' | 'non_veg' | 'vegan' | 'egg';
  isGlutenFree: boolean;
  spicinessLevel: number;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  isFeatured: boolean;
  allergens?: string[] | null;
  displayOrder: number;
  variants?: MenuItemVariant[];
  addonGroups?: AddonGroup[];
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  items?: MenuItem[];
}

export interface CartItem {
  cartItemId: string; // unique key in cart
  menuItemId: string;
  name: string;
  imageUrl?: string;
  dietaryType: string;
  basePrice: number;
  variant?: {
    id: string;
    name: string;
    priceModifier: number;
  } | null;
  selectedAddons: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
  totalPrice: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId?: string;
  variantId?: string;
  itemNameSnapshot: string;
  variantNameSnapshot?: string;
  unitPriceSnapshot: string;
  quantity: number;
  totalPriceSnapshot: string;
  specialInstructions?: string;
  status: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  fromStatus?: string;
  toStatus: string;
  actorRole: string;
  notes?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber?: string;
  tableDisplayName?: string;
  zone?: string;
  sessionId?: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  taxAmount: string;
  serviceChargeAmount: string;
  discountAmount: string;
  totalAmount: string;
  customerNotes?: string;
  kitchenNotes?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  timeline?: OrderStatusHistoryItem[];
  currencySymbol?: string;
}

export interface ServiceRequest {
  id: string;
  tableId: string;
  tableNumber: string;
  tableDisplayName: string;
  zone?: string;
  type: ServiceRequestType;
  notes?: string;
  status: ServiceRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  assignedStaffName?: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'online';
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  createdAt: string;
  tableNumber?: string;
}
