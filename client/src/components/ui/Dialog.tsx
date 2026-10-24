import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  onSubmit,
  maxWidth = 'md',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  const renderContent = () => {
    if (onSubmit) {
      return (
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body Only */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="shrink-0 px-6 py-3.5 border-t border-border/50 bg-card/95 backdrop-blur-sm flex items-center justify-end gap-2.5 z-10">
              {footer}
            </div>
          )}
        </form>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Body Only */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-3.5 border-t border-border/50 bg-card/95 backdrop-blur-sm flex items-center justify-end gap-2.5 z-10">
            {footer}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog Shell with Fixed Header and Fixed Footer */}
      <div
        className={cn(
          'relative w-full rounded-3xl border border-border/80 bg-card shadow-2xl text-card-foreground duration-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col z-10 overflow-hidden',
          widthClasses[maxWidth],
          className
        )}
      >
        {/* Sticky Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border/40 flex items-center justify-between bg-card z-10">
          <div>
            {title && <h2 className="text-lg sm:text-xl font-bold font-display text-foreground leading-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content with scrollable body and sticky footer */}
        {renderContent()}
      </div>
    </div>
  );
};
