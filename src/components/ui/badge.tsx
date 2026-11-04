import * as React from 'react';
import { cn } from './button';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const badgeVariants = {
  default: 'border-transparent bg-accent text-accent-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive/10 text-destructive',
  outline: 'border-input bg-card text-muted-foreground',
  success: 'border-transparent bg-success-soft text-success',
  warning: 'border-transparent bg-warning-soft text-warning',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      badgeVariants[variant],
      className
    )}
    {...props}
  />
));
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
