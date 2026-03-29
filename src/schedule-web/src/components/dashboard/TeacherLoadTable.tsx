import { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';
import { ProgressBar } from './ProgressBar';
import type { TeacherLoadDto } from '@/api/types';

type SortDir = 'asc' | 'desc' | null;

export function TeacherLoadTable({ teachers }: { teachers: TeacherLoadDto[] }) {
  const { setActiveTab, setSelectedTeacherId } = useScheduleStore();
  const [titleFilter, setTitleFilter] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const titles = [...new Set(teachers.map(t => t.staffTitleName).filter(Boolean) as string[])].sort();

  const filtered = teachers.filter(t => titleFilter == null || t.staffTitleName === titleFilter);

  const sorted = (() => {
    const overloaded = filtered.filter(t => t.loadRate > 100);
    const normal = filtered.filter(t => t.loadRate <= 100);
    const sortFn = (a: TeacherLoadDto, b: TeacherLoadDto) =>
      sortDir === 'asc' ? a.loadRate - b.loadRate : sortDir === 'desc' ? b.loadRate - a.loadRate : 0;
    return [...overloaded.sort(sortFn), ...normal.sort(sortFn)];
  })();

  const handleRowClick = (t: TeacherLoadDto) => {
    setSelectedTeacherId(t.teacherId);
    setActiveTab('teachers');
  };

  const toggleSort = () => {
    setSortDir(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null);
  };

  const SortIcon = sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-bold font-manrope text-on-surface">教師節次負載</div>
        <div className="flex items-center gap-2">
          {titles.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={() => setTitleFilter(null)}
                className={cn('text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                  titleFilter == null ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}
              >全部</button>
              {titles.map(t => (
                <button
                  key={t}
                  onClick={() => setTitleFilter(titleFilter === t ? null : t)}
                  className={cn('text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                    titleFilter === t ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}
                >{t}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-32 shrink-0 text-xs text-on-surface-variant/50 font-bold uppercase tracking-wider">教師</div>
        <div className="w-24 shrink-0 text-xs text-on-surface-variant/50 font-bold uppercase tracking-wider text-center">配課/上限</div>
        <div className="w-20 shrink-0 text-xs text-on-surface-variant/50 font-bold uppercase tracking-wider text-center">已排</div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-xs text-on-surface-variant/50 font-bold uppercase tracking-wider">負荷</span>
          <button onClick={toggleSort} className="ml-auto flex items-center gap-0.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            負荷率 <SortIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {sorted.map(t => {
          const overload = t.loadRate > 100;
          return (
            <button
              key={t.teacherId}
              onClick={() => handleRowClick(t)}
              className="w-full text-left flex items-center gap-4 py-2.5 px-1 hover:bg-surface-container-low/50 rounded-lg transition-colors cursor-pointer group"
            >
              <div className="w-32 shrink-0">
                <div className="text-sm font-semibold text-on-surface">{t.teacherName}</div>
                {t.staffTitleName && (
                  <div className="text-xs text-on-surface-variant/60">{t.staffTitleName}</div>
                )}
              </div>
              <div className="w-24 shrink-0 text-xs text-on-surface-variant text-center">
                {t.assignedPeriods} / {t.maxWeeklyPeriods}
              </div>
              <div className="w-20 shrink-0 text-xs text-on-surface-variant text-center">
                {t.scheduledPeriods} 節
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <ProgressBar value={t.loadRate} variant={overload ? 'error' : 'primary'} />
                  {t.assignedPeriods > 0 && (
                    <ProgressBar
                      value={Math.round(t.scheduledPeriods / t.assignedPeriods * 100)}
                      variant="tertiary"
                      thin
                    />
                  )}
                </div>
                <span className={cn(
                  'text-xs font-semibold w-12 text-right shrink-0',
                  overload ? 'text-error' : 'text-on-surface-variant'
                )}>
                  {t.loadRate}%
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="py-6 text-center text-xs text-on-surface-variant italic">此學期尚無配課資料</div>
        )}
      </div>
    </div>
  );
}
