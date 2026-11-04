import * as React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from './button';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
}

const ICONS = {
  info: <Info size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  error: <AlertCircle size={18} />,
};

const VARIANTS = {
  info: 'bg-secondary border-border text-secondary-foreground',
  success: 'bg-success-soft border-success/20 text-success',
  warning: 'bg-warning-soft border-warning/20 text-warning',
  error: 'bg-destructive/10 border-destructive/20 text-destructive',
};

export function Alert({ variant = 'info', title, description, className, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        VARIANTS[variant],
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex shrink-0 items-center">{ICONS[variant]}</div>
      <div className="text-sm">
        {title && <h4 className="font-semibold">{title}</h4>}
        {description && <p className="mt-1">{description}</p>}
      </div>
    </div>
  );
}

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
}

export function Toast({ isOpen, onClose, variant = 'info', title, description }: ToastProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <div className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border min-w-[350px] animate-in slide-in-from-right duration-200 ${VARIANTS[variant]}`}>
        <div className="flex shrink-0 items-center">{ICONS[variant]}</div>
        <div className="text-sm">
          <h4 className="font-semibold">{title}</h4>
          {description && <p className="mt-1">{description}</p>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-auto">
          <XIcon />
        </button>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>
  );
}

export type { AlertProps };
