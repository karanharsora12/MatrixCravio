import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, description?: string, duration?: number) => void;
    error: (title: string, description?: string, duration?: number) => void;
    warning: (title: string, description?: string, duration?: number) => void;
    info: (title: string, description?: string, duration?: number) => void;
    custom: (item: Omit<ToastItem, 'id'>) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus so toast can also be called outside React tree if needed
type ToastListener = (toast: ToastItem) => void;
const toastListeners = new Set<ToastListener>();

export const toast = {
  success: (title: string, description?: string, duration = 4000) => {
    const item: ToastItem = { id: Math.random().toString(36).substring(2, 9), title, description, variant: 'success', duration };
    toastListeners.forEach((fn) => fn(item));
  },
  error: (title: string, description?: string, duration = 5000) => {
    const item: ToastItem = { id: Math.random().toString(36).substring(2, 9), title, description, variant: 'error', duration };
    toastListeners.forEach((fn) => fn(item));
  },
  warning: (title: string, description?: string, duration = 4500) => {
    const item: ToastItem = { id: Math.random().toString(36).substring(2, 9), title, description, variant: 'warning', duration };
    toastListeners.forEach((fn) => fn(item));
  },
  info: (title: string, description?: string, duration = 4000) => {
    const item: ToastItem = { id: Math.random().toString(36).substring(2, 9), title, description, variant: 'info', duration };
    toastListeners.forEach((fn) => fn(item));
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast, dismissToast: () => {} };
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [...prev.slice(-4), item]); // Keep at most 5 toasts visible

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        dismissToast(item.id);
      }, item.duration);
    }
  }, [dismissToast]);

  useEffect(() => {
    toastListeners.add(addToast);
    return () => {
      toastListeners.delete(addToast);
    };
  }, [addToast]);

  const contextValue: ToastContextType = {
    toast: {
      success: (title, description, duration) => toast.success(title, description, duration),
      error: (title, description, duration) => toast.error(title, description, duration),
      warning: (title, description, duration) => toast.warning(title, description, duration),
      info: (title, description, duration) => toast.info(title, description, duration),
      custom: (item) => addToast({ ...item, id: Math.random().toString(36).substring(2, 9) }),
    },
    dismissToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Render Toasts Container into document.body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className="fixed bottom-4 right-4 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
          >
            {toasts.map((t) => (
              <ToastCard key={t.id} item={t} onDismiss={() => dismissToast(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-card/95',
    error: 'border-rose-500/30 bg-card/95',
    warning: 'border-amber-500/30 bg-card/95',
    info: 'border-blue-500/30 bg-card/95',
  };

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in-0',
        borders[item.variant]
      )}
    >
      <div className="pt-0.5">{icons[item.variant]}</div>

      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-xs font-bold text-foreground leading-snug">{item.title}</h4>
        {item.description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/60 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
