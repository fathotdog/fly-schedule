import { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';
import { ProgressBar } from './ProgressBar';
import type { ClassProgressDto } from '@/api/types';

type StatusFilter = 'all' | 'unassigned' | 'not_started' | 'in_progress' | 'complete';
type SortDir = 'asc' | 'desc' | null;

function getStatus(c: ClassProgressDto): StatusFilter {
  if (c.totalWeeklyPeriods === 0) return 'unassigned';
  if (c.completionRate === 0) return 'not_started';
  if (c.completionRate >= 100) return 'complete';
  return 'in_progress';
}

const statusDot: Record<StatusFilter, string> = {
  all: '',
  unassigned: 'bg-on-surface-variant/30',
  not_started: 'bg-error',
  in_progress: 'bg-warning',
  complete: 'bg-tertiary',
};

const statusLabel: Record<StatusFilter, string> = {
  all: '全部',
  unassigned: '未配課',
  not_started: '未開始',
  in_progress: '進行中',
  complete: '完成',
};

function StatusDot({ status }: { status: StatusFilter }) {
  if (status === 'all') return null;
  return <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot[status])} />;
}

function progressVariant(status: StatusFilter) {
  if (status === 'unassigned') return 'muted' as const;
  if (status === 'complete') return 'tertiary' as const;
  if (status === 'not_started') return 'error' as const;
  return 'primary' as const;
}

export function ClassProgressTable({ classes }: { classes: ClassProgressDto[] }) {
  const { setActiveTab, setSelectedClassId } = useScheduleStore();
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const grades = [...new Set(classes.map(c => c.gradeYear))].sort((a, b) => a - b);

  const q = searchQuery.trim().toLowerCase();
  const filtered = classes
    .filter(c => gradeFilter == null || c.gradeYear === gradeFilter)
    .filter(c => statusFilter === 'all' || getStatus(c) === statusFilter)
    .filter(c =>
      q === '' ||
      c.classDisplayName.toLowerCase().includes(q) ||
      (c.homeroomTeacherName ?? '').toLowerCase().includes(q)
    );

  const sorted = sortDir == null
    ? filtered
    : [...filtered].sort((a, b) =>
        sortDir === 'asc' ? a.completionRate - b.completionRate : b.completionRate - a.completionRate
      );

  const byGrade = sorted.reduce<Record<number, ClassProgressDto[]>>((acc, c) => {
    (acc[c.gradeYear] ??= []).push(c);
    return acc;
  }, {});

  const handleRowClick = (c: ClassProgressDto) => {
    setSelectedClassId(c.classId);
    setActiveTab('timetable');
  };

  const toggleSort = () => {
    setSortDir(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null);
  };

  const SortIcon = sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="text-sm font-bold font-manrope text-on-surface">班級排課進度</div>
        <div className="flex items-center gap-2">
          {/* Grade filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setGradeFilter(null)}
              className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                gradeFilter == null ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}
            >全年</button>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
                className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors',
                  gradeFilter === g ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}
              >{g}年</button>
            ))}
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant border-none outline-none"
          >
            {(['all', 'unassigned', 'not_started', 'in_progress', 'complete'] as StatusFilter[]).map(s => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-1.5 w-3 h-3 text-on-surface-variant/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋班級或導師"
              className="text-[10px] pl-5 pr-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant placeholder-on-surface-variant/40 border-none outline-none w-28"
            />
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-1 shrink-0">
        <div className="w-4 shrink-0" />
        <div className="w-16 shrink-0 text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">班級</div>
        <div className="w-24 shrink-0 text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">導師</div>
        <div className="w-20 shrink-0 text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider text-center">節次</div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">進度</span>
          <button onClick={toggleSort} className="ml-auto flex items-center gap-0.5 text-[10px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            完成率 <SortIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.keys(byGrade).sort((a, b) => Number(a) - Number(b)).map(grade => (
          <div key={grade} className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1 px-1">
              {grade} 年級
            </div>
            <div className="divide-y divide-slate-50">
              {byGrade[Number(grade)].map(c => {
                const status = getStatus(c);
                return (
                  <button
                    key={c.classId}
                    onClick={() => handleRowClick(c)}
                    className="w-full text-left flex items-center gap-3 py-2.5 px-1 hover:bg-surface-container-low/50 rounded-lg transition-colors cursor-pointer group"
                  >
                    <StatusDot status={status} />
                    <div className="w-16 shrink-0 text-sm font-semibold text-on-surface font-manrope">{c.classDisplayName}</div>
                    <div className="w-24 shrink-0">
                      {c.hasHomeroomTeacher ? (
                        <span className="text-[11px] text-on-surface-variant">{c.homeroomTeacherName}</span>
                      ) : (
                        <span className="text-[11px] text-error/70 italic">未設導師</span>
                      )}
                    </div>
                    <div className="w-20 shrink-0 text-[11px] text-on-surface-variant text-center">
                      {c.scheduledPeriods} / {c.totalWeeklyPeriods} 節
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar value={c.completionRate} variant={progressVariant(status)} />
                      </div>
                      <span className={cn(
                        'text-[11px] font-semibold w-10 text-right shrink-0',
                        status === 'complete' ? 'text-tertiary' : status === 'not_started' ? 'text-error' : status === 'unassigned' ? 'text-on-surface-variant/40' : c.completionRate < 50 ? 'text-warning' : 'text-on-surface-variant'
                      )}>
                        {c.totalWeeklyPeriods === 0 ? '—' : `${c.completionRate}%`}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="py-8 text-center text-xs text-on-surface-variant italic">無符合條件的班級</div>
        )}
      </div>
    </div>
  );
}
