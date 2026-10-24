import { create } from 'zustand';
import { api } from '../../lib/api.js';
import { User } from '../../types/index.js';

interface RestaurantInfo {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  role: string;
  logoUrl?: string;
  currencySymbol?: string;
}

interface AuthState {
  user: User | null;
  currentRestaurant: RestaurantInfo | null;
  restaurants: RestaurantInfo[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  switchRestaurant: (restaurantId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentRestaurant: null,
  restaurants: [],
  token: localStorage.getItem('cravio_token'),
  isAuthenticated: !!localStorage.getItem('cravio_token'),
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res: any = await api.post('/auth/login', { email, password });
      if (res.success && res.token) {
        localStorage.setItem('cravio_token', res.token);
        set({
          user: res.user,
          currentRestaurant: res.currentRestaurant,
          restaurants: res.restaurants || [],
          token: res.token,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ error: res.message || 'Login failed', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('cravio_token');
    set({
      user: null,
      currentRestaurant: null,
      restaurants: [],
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  loadProfile: async () => {
    const token = localStorage.getItem('cravio_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res: any = await api.get('/auth/me');
      if (res.success && res.user) {
        set({
          user: res.user,
          currentRestaurant: res.currentRestaurant,
          restaurants: res.restaurants || [],
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('cravio_token');
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      localStorage.removeItem('cravio_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  switchRestaurant: async (restaurantId: string) => {
    try {
      const res: any = await api.post('/auth/switch-restaurant', { restaurantId });
      if (res.success && res.token) {
        localStorage.setItem('cravio_token', res.token);
        // Refresh profile
        const profileRes: any = await api.get('/auth/me');
        if (profileRes.success) {
          set({
            currentRestaurant: profileRes.currentRestaurant,
            token: res.token,
          });
          return true;
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  },
}));
