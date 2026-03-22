import { useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDir;
}

type Accessor<T> = (item: T) => string | number | boolean | null | undefined;

interface UseTableSortOptions<T> {
  columns: Record<string, Accessor<T>>;
  defaultSort?: { column: string; direction: SortDir };
}

export function useTableSort<T>({ columns, defaultSort }: UseTableSortOptions<T>) {
  const [sortState, setSortState] = useState<SortState>(
    defaultSort ?? { column: null, direction: null }
  );

  const toggleSort = useCallback((key: string) => {
    setSortState(prev => {
      if (prev.column !== key) return { column: key, direction: 'desc' };
      const next: SortDir = prev.direction === null ? 'desc' : prev.direction === 'desc' ? 'asc' : null;
      return { column: next === null ? null : key, direction: next };
    });
  }, []);

  const sortItems = useCallback((items: T[]): T[] => {
    const { column, direction } = sortState;
    if (!column || !direction || !(column in columns)) return items;
    const accessor = columns[column];
    return [...items].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      // null/undefined sort to the end regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, 'zh-TW');
      } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
        cmp = (av === bv ? 0 : av ? -1 : 1); // true first in natural order
      } else {
        cmp = (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0;
      }
      return direction === 'asc' ? cmp : -cmp;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortState]);

  return { sortState, toggleSort, sortItems };
}
