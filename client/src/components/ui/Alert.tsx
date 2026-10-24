import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'default',
  title,
  children,
  ...props
}) => {
  const icons = {
    default: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  };

  const variants = {
    default: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    destructive: 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-2xl border p-3.5 text-xs flex items-start gap-3',
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="pt-0.5">{icons[variant]}</div>
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-bold tracking-tight leading-snug">{title}</h5>}
        <div className="text-[11px] leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
