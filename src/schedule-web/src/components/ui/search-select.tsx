import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CheckIcon, ChevronRightIcon } from 'lucide-react';

interface SearchSelectItem {
  value: string;
  label: string;
  group?: string;
}

interface SearchSelectProps {
  value: string;
  onValueChange: (value: string | null, eventDetails?: any) => void;
  placeholder: string;
  items: SearchSelectItem[];
  className?: string;
}

function OptionItem({ item, value, onValueChange, setOpen, indented }: {
  item: SearchSelectItem;
  value: string;
  onValueChange: (v: string | null) => void;
  setOpen: (v: boolean) => void;
  indented?: boolean;
}) {
  return (
    <div
      role="option"
      aria-selected={item.value === value}
      onClick={() => { onValueChange(item.value); setOpen(false); }}
      className={cn(
        'relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 text-sm select-none hover:bg-accent hover:text-accent-foreground',
        indented ? 'pl-4' : 'pl-1.5'
      )}
    >
      {item.label}
      {item.value === value && (
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="size-4 pointer-events-none" />
        </span>
      )}
    </div>
  );
}

export function SearchSelect({ value, onValueChange, placeholder, items, className }: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const hasGroups = items.some(i => i.group !== undefined);
  const isCascading = hasGroups && search.length === 0;

  // Reset hoveredGroup when search becomes non-empty
  useEffect(() => {
    if (search.length > 0) {
      setHoveredGroup(null);
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [search]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      setHoveredGroup(null);
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (submenuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = items.find(i => i.value === value)?.label;
  const rect = open ? triggerRef.current?.getBoundingClientRect() : undefined;

  const handleGroupMouseEnter = (group: string, rowEl: HTMLDivElement) => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      const rowRect = rowEl.getBoundingClientRect();
      const mainRect = dropdownRef.current?.getBoundingClientRect();
      if (!mainRect) return;

      const submenuWidth = 240;
      let left = mainRect.right + 4;
      // flip left if not enough space on right
      if (left + submenuWidth > window.innerWidth) {
        left = mainRect.left - submenuWidth - 4;
      }
      let top = rowRect.top;
      // clamp bottom
      const estimatedHeight = 240;
      if (top + estimatedHeight > window.innerHeight) {
        top = window.innerHeight - estimatedHeight - 8;
      }

      setSubmenuPos({ top, left });
      setHoveredGroup(group);
    }, 30);
  };

  const handleGroupMouseLeave = () => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredGroup(null);
      setSubmenuPos(null);
    }, 150);
  };

  const handleSubmenuMouseEnter = () => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredGroup(null);
      setSubmenuPos(null);
    }, 150);
  };

  const renderItems = () => {
    if (filtered.length === 0) {
      return <div className="py-2 px-2 text-sm text-muted-foreground text-center">無結果</div>;
    }

    if (!hasGroups) {
      return filtered.map(item => (
        <OptionItem key={item.value} item={item} value={value} onValueChange={onValueChange} setOpen={setOpen} />
      ));
    }

    if (!isCascading) {
      // Flat grouped list when searching
      const ungrouped = filtered.filter(i => i.group === undefined);
      const grouped = filtered.filter(i => i.group !== undefined);
      const groupMap = new Map<string, SearchSelectItem[]>();
      for (const item of grouped) {
        const g = item.group || '其他';
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g)!.push(item);
      }
      return (
        <>
          {ungrouped.map(item => (
            <OptionItem key={item.value} item={item} value={value} onValueChange={onValueChange} setOpen={setOpen} />
          ))}
          {Array.from(groupMap.entries()).map(([group, groupItems]) => (
            <div key={group}>
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
                <span className="text-xs font-semibold tracking-widest uppercase text-primary/60 whitespace-nowrap">{group}</span>
                <div className="flex-1 h-px bg-outline-variant/20" />
              </div>
              {groupItems.map(item => (
                <OptionItem key={item.value} item={item} value={value} onValueChange={onValueChange} setOpen={setOpen} indented />
              ))}
            </div>
          ))}
        </>
      );
    }

    // Cascading mode
    const ungrouped = items.filter(i => i.group === undefined);
    const groupMap = new Map<string, SearchSelectItem[]>();
    for (const item of items.filter(i => i.group !== undefined)) {
      const g = item.group || '其他';
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(item);
    }

    const selectedGroup = items.find(i => i.value === value)?.group ?? null;

    return (
      <>
        {ungrouped.map(item => (
          <OptionItem key={item.value} item={item} value={value} onValueChange={onValueChange} setOpen={setOpen} />
        ))}
        {Array.from(groupMap.entries()).map(([group, _]) => (
          <div
            key={group}
            onMouseEnter={e => handleGroupMouseEnter(group, e.currentTarget)}
            onMouseLeave={handleGroupMouseLeave}
            className={cn(
              'relative flex w-full cursor-default items-center justify-between gap-1.5 rounded-md py-1 pl-1.5 pr-2 text-sm select-none',
              hoveredGroup === group ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              {selectedGroup === group && (
                <span className="size-1.5 rounded-full bg-primary shrink-0" />
              )}
              {selectedGroup !== group && <span className="size-1.5 shrink-0" />}
              {group}
            </span>
            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </>
    );
  };

  const hoveredGroupItems = hoveredGroup
    ? (items.filter(i => (i.group || '其他') === hoveredGroup))
    : [];

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-outline-variant/30 bg-transparent py-2 pr-2 pl-2.5 text-sm h-8 whitespace-nowrap transition-colors outline-none select-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn('flex-1 text-left line-clamp-1', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160), zIndex: 9999 }}
          className="rounded-2xl bg-surface-container-lowest text-on-surface shadow-sm ring-1 ring-outline-variant/10"
        >
          <div className="p-1.5 border-b border-outline-variant/15 sticky top-0 bg-surface-container-lowest z-[1]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋..."
              autoFocus
              className="w-full text-sm px-2 py-1 rounded outline-none bg-input/50 focus:bg-input transition-colors"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {renderItems()}
          </div>
        </div>,
        document.body
      )}
      {open && isCascading && hoveredGroup && submenuPos && hoveredGroupItems.length > 0 && createPortal(
        <div
          ref={submenuRef}
          style={{ position: 'fixed', top: submenuPos.top, left: submenuPos.left, width: 240, zIndex: 10000 }}
          className="rounded-2xl bg-surface-container-lowest text-on-surface shadow-md ring-1 ring-outline-variant/10 max-h-80 overflow-y-auto p-1"
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {hoveredGroupItems.map(item => (
            <OptionItem key={item.value} item={item} value={value} onValueChange={onValueChange} setOpen={setOpen} />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
