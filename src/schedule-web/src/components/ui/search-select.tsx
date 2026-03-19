import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';

interface SearchSelectProps {
  value: string;
  onValueChange: (value: string | null, eventDetails?: any) => void;
  placeholder: string;
  items: { value: string; label: string }[];
  className?: string;
}

export function SearchSelect({ value, onValueChange, placeholder, items, className }: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = items.find(i => i.value === value)?.label;
  const rect = open ? triggerRef.current?.getBoundingClientRect() : undefined;

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
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
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
            {filtered.length === 0 ? (
              <div className="py-2 px-2 text-sm text-muted-foreground text-center">無結果</div>
            ) : (
              filtered.map(item => (
                <div
                  key={item.value}
                  role="option"
                  aria-selected={item.value === value}
                  onClick={() => { onValueChange(item.value); setOpen(false); }}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm select-none hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                  {item.value === value && (
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-4 pointer-events-none" />
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
