import { cn } from '@/lib/utils';

type Accent = 'blue' | 'teal' | 'red' | 'amber';

const accentClasses: Record<Accent, string> = {
  blue: 'text-primary bg-primary/8',
  teal: 'text-tertiary bg-tertiary/8',
  red: 'text-error bg-error/8',
  amber: 'text-warning bg-warning/8',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'blue',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: Accent;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accentClasses[accent])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold font-manrope text-on-surface leading-tight">{value}</div>
        <div className="text-xs font-medium text-on-surface-variant mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-on-surface-variant/60 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
