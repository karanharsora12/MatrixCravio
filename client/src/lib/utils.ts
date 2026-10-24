import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus } from '../types/index.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, symbol: string = '₹'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateString;
  }
}

export function getOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700/50' };
    case 'ACCEPTED':
      return { label: 'Accepted', color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700/50' };
    case 'PREPARING':
      return { label: 'In Kitchen', color: 'bg-orange-500/10 text-orange-600 border-orange-300 dark:border-orange-700/50' };
    case 'READY':
      return { label: 'Ready to Serve', color: 'bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-700/50' };
    case 'SERVED':
      return { label: 'Food Served', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700/50' };
    case 'COMPLETED':
      return { label: 'Completed', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-300 dark:border-zinc-700/50' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-300 dark:border-red-700/50' };
    default:
      return { label: status, color: 'bg-zinc-100 text-zinc-800' };
  }
}

export function getTableStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return { label: 'Available', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300' };
    case 'occupied':
      return { label: 'Occupied', color: 'bg-rose-500/10 text-rose-600 border-rose-300' };
    case 'reserved':
      return { label: 'Reserved', color: 'bg-amber-500/10 text-amber-600 border-amber-300' };
    case 'maintenance':
      return { label: 'Maintenance', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-300' };
    default:
      return { label: status, color: 'bg-zinc-100 text-zinc-700' };
  }
}
