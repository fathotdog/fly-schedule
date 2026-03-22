import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortState } from '@/hooks/useTableSort';

interface SortableTableHeadProps extends React.ComponentProps<'th'> {
  columnKey: string;
  sortState: SortState;
  onToggleSort: (key: string) => void;
}

export function SortableTableHead({
  columnKey,
  sortState,
  onToggleSort,
  children,
  className,
  ...props
}: SortableTableHeadProps) {
  const active = sortState.column === columnKey;
  const Icon = active && sortState.direction === 'asc'
    ? ChevronUp
    : active && sortState.direction === 'desc'
      ? ChevronDown
      : ChevronsUpDown;

  return (
    <TableHead
      className={cn('cursor-pointer select-none', className)}
      onClick={() => onToggleSort(columnKey)}
      {...props}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-on-surface-variant/40')} />
      </span>
    </TableHead>
  );
}
