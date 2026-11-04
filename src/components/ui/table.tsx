import * as React from 'react';
import { cn } from './button';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}
const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <div className="overflow-x-auto">
    <table
      ref={ref}
      className={cn(
        'w-full text-sm caption-bottom [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0',
        className
      )}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

interface TheadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
const Thead = React.forwardRef<HTMLTableSectionElement, TheadProps>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('', className)} {...props} />
));
Thead.displayName = 'Thead';

interface TbodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
const Tbody = React.forwardRef<HTMLTableSectionElement, TbodyProps>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
Tbody.displayName = 'Tbody';

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  state?: string;
}
const Tr = React.forwardRef<HTMLTableRowElement, TrProps>(({ className, state, ...props }, ref) => (
  <tr ref={ref} className={cn('border-b transition-colors hover:bg-accent/40', state && `data-[state=${state}]`, className)} {...props} />
));
Tr.displayName = 'Tr';

interface ThProps extends React.HTMLAttributes<HTMLTableCellElement> {}
const Th = React.forwardRef<HTMLTableCellElement, ThProps>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn('h-11 px-4 text-left align-middle text-xs font-medium text-muted-foreground border-b bg-transparent', className)} {...props} />
));
Th.displayName = 'Th';

interface TdProps extends React.HTMLAttributes<HTMLTableCellElement> {
  colSpan?: number;
}
const Td = React.forwardRef<HTMLTableCellElement, TdProps>(({ className, colSpan, ...props }, ref) => (
  <td ref={ref} colSpan={colSpan} className={cn('h-11 p-4 align-middle', className)} {...props} />
));
Td.displayName = 'Td';

interface CaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}
const Caption = React.forwardRef<HTMLTableCaptionElement, CaptionProps>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
));
Caption.displayName = 'Caption';

export { Table, Thead as TableHeader, Tbody as TableBody, Tr as TableRow, Th as TableHead, Td as TableCell, Caption };
export { Thead, Tbody, Tr, Th, Td };
