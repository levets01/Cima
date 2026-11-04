import * as React from 'react';
import { cn } from './button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  left?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, left, ...props }, ref) => {
  return (
    <div className="relative">
      {left && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{left}</div>}
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          left ? 'pl-9' : 'pl-3',
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
