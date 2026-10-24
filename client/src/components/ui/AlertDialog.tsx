import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, HelpCircle, X, Trash2 } from 'lucide-react';
import { Button } from './Button.js';
import { cn } from '../../lib/utils.js';

export type AlertVariant = 'destructive' | 'warning' | 'default';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    description: '',
    confirmText: 'Continue',
    cancelText: 'Cancel',
    variant: 'default',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      confirmText: 'Continue',
      cancelText: 'Cancel',
      variant: 'default',
      ...opts,
    });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Programmatic shadcn Confirm Dialog */}
      <AlertDialog
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
      />
    </ConfirmContext.Provider>
  );
};

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  isLoading?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const iconVariants = {
    destructive: (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shrink-0 border border-rose-500/20">
        <Trash2 className="h-5 w-5" />
      </div>
    ),
    warning: (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shrink-0 border border-amber-500/20">
        <AlertTriangle className="h-5 w-5" />
      </div>
    ),
    default: (
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
        <HelpCircle className="h-5 w-5" />
      </div>
    ),
  };

  const buttonVariants = {
    destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25',
    default: 'bg-primary hover:bg-primary/90 text-white shadow-primary/25',
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in zoom-in-95 fade-in space-y-4"
      >
        <div className="flex items-start gap-4">
          {iconVariants[variant]}

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-base font-extrabold font-display text-foreground leading-snug">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 text-xs font-semibold"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={cn('px-4 text-xs font-semibold shadow-md', buttonVariants[variant])}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
