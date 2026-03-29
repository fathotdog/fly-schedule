import { cn } from '@/lib/utils';
import type { GradeSummaryDto } from '@/api/types';

function completionColor(rate: number) {
  if (rate >= 100) return 'bg-tertiary';
  if (rate >= 60) return 'bg-primary';
  if (rate >= 30) return 'bg-warning';
  return 'bg-error';
}

export function GradeSummaryBar({ gradeSummary }: { gradeSummary: GradeSummaryDto[] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 px-6 py-4">
      <div className="text-xs font-bold font-manrope text-on-surface mb-3">年級摘要</div>
      <div className="flex gap-3 flex-wrap">
        {gradeSummary.map(g => {
          const schedRate = g.totalPeriods > 0
            ? Math.round(g.scheduledPeriods / g.totalPeriods * 100)
            : 0;
          return (
            <div
              key={g.gradeYear}
              className="flex-1 min-w-[120px] bg-surface-container rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold font-manrope text-on-surface">{g.gradeYear} 年級</span>
                <span className="text-xs text-on-surface-variant/60">{g.classCount} 班</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', completionColor(g.avgCompletionRate))}
                    style={{ width: `${Math.min(g.avgCompletionRate, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs font-semibold shrink-0',
                  g.avgCompletionRate >= 100 ? 'text-tertiary' : g.avgCompletionRate < 30 ? 'text-error' : 'text-on-surface-variant'
                )}>
                  {g.avgCompletionRate}%
                </span>
              </div>
              <div className="text-xs text-on-surface-variant/50">
                已排 {g.scheduledPeriods} / {g.totalPeriods} 節（{schedRate}%）
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
