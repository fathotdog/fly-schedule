import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PeriodDistributionDto } from '@/api/types';
import { DAY_NAMES_1BASED } from '@/lib/constants';

function heatColor(slotCount: number, totalClasses: number): string {
  if (totalClasses === 0 || slotCount === 0) return 'bg-surface-container text-on-surface-variant/40';
  const ratio = slotCount / totalClasses;
  if (ratio >= 0.9) return 'bg-primary text-white';
  if (ratio >= 0.7) return 'bg-primary/70 text-white';
  if (ratio >= 0.5) return 'bg-primary/50 text-on-surface';
  if (ratio >= 0.3) return 'bg-primary/25 text-on-surface';
  return 'bg-primary/10 text-on-surface-variant';
}

interface TooltipState {
  cell: PeriodDistributionDto;
  x: number;
  y: number;
}

export function PeriodHeatmap({ distribution }: { distribution: PeriodDistributionDto[] }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (distribution.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
        <div className="text-sm font-bold font-manrope text-on-surface mb-4">節次分布熱力圖</div>
        <div className="py-8 text-center text-xs text-on-surface-variant italic">尚無排課資料</div>
      </div>
    );
  }

  const activeDays = [...new Set(distribution.map(d => d.dayOfWeek))].sort();
  const periods = [...new Set(distribution.map(d => d.periodNumber))].sort((a, b) => a - b);
  const totalClasses = distribution[0]?.totalClasses ?? 0;

  // Build lookup: day -> period -> slot
  const lookup = new Map<string, PeriodDistributionDto>();
  for (const d of distribution) {
    lookup.set(`${d.dayOfWeek}-${d.periodNumber}`, d);
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold font-manrope text-on-surface">節次分布熱力圖</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-on-surface-variant/50">低</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(r => (
              <div key={r} className={cn('w-4 h-4 rounded-sm', heatColor(Math.round(r * totalClasses), totalClasses))} />
            ))}
          </div>
          <span className="text-[10px] text-on-surface-variant/50">高</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-[11px]">
          <thead>
            <tr>
              <th className="w-10 text-on-surface-variant/50 font-medium text-[10px] pb-2">節次</th>
              {activeDays.map(day => (
                <th key={day} className="font-semibold text-on-surface pb-2 px-1">{DAY_NAMES_1BASED[day] ?? `週${day}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <td className="text-on-surface-variant/50 font-medium py-0.5 text-[10px]">第{period}節</td>
                {activeDays.map(day => {
                  const cell = lookup.get(`${day}-${period}`);
                  const count = cell?.slotCount ?? 0;
                  return (
                    <td key={day} className="px-1 py-0.5">
                      <div
                        className={cn(
                          'rounded-lg py-1.5 px-1 font-medium leading-tight transition-all cursor-default',
                          heatColor(count, totalClasses)
                        )}
                        onMouseEnter={e => {
                          if (cell && count > 0) {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const parentRect = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect() ?? rect;
                            setTooltip({
                              cell,
                              x: rect.left - parentRect.left + rect.width / 2,
                              y: rect.top - parentRect.top,
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {count > 0 ? `${count}/${totalClasses}` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-on-surface text-surface text-[11px] rounded-lg px-3 py-2 shadow-lg min-w-[120px]">
            <div className="font-semibold mb-1">
              {DAY_NAMES_1BASED[tooltip.cell.dayOfWeek]} 第{tooltip.cell.periodNumber}節
            </div>
            <div className="text-surface/70 mb-1">{tooltip.cell.slotCount}/{tooltip.cell.totalClasses} 班有課</div>
            {tooltip.cell.classNames.length > 0 && (
              <div className="space-y-0.5">
                {tooltip.cell.classNames.map(n => (
                  <div key={n} className="text-surface/80">{n}</div>
                ))}
                {tooltip.cell.slotCount > tooltip.cell.classNames.length && (
                  <div className="text-surface/50">…等 {tooltip.cell.slotCount} 班</div>
                )}
              </div>
            )}
          </div>
          <div className="w-2 h-2 bg-on-surface rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
