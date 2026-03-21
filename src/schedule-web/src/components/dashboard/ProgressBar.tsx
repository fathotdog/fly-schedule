import { cn } from '@/lib/utils';

type ProgressVariant = 'primary' | 'tertiary' | 'error' | 'muted';

const variantClasses: Record<ProgressVariant, string> = {
  primary: 'bg-primary',
  tertiary: 'bg-tertiary',
  error: 'bg-error',
  muted: 'bg-on-surface-variant/30',
};

export function ProgressBar({
  value,
  max = 100,
  variant,
  thin = false,
}: {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  thin?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const autoVariant: ProgressVariant = variant ?? (value > 100 ? 'error' : value === 0 ? 'muted' : 'primary');
  return (
    <div className={cn('rounded-full bg-surface-container-highest overflow-hidden', thin ? 'h-1' : 'h-2')}>
      <div
        className={cn('h-full rounded-full transition-all', variantClasses[autoVariant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
