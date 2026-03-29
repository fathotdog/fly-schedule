import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';
import type { DashboardAlert } from '@/api/types';

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

const alertTabMap: Record<string, string> = {
  no_assignment: 'assignments',
  low_completion: 'timetable',
  no_homeroom: 'homerooms',
  overload: 'teachers',
  teacher_unscheduled: 'teachers',
  course_unbalanced: 'timetable',
  period_gap: 'timetable',
};

const classAlertTypes = new Set(['no_assignment', 'low_completion', 'no_homeroom', 'course_unbalanced', 'period_gap']);
const teacherAlertTypes = new Set(['overload', 'teacher_unscheduled']);

const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };

export function AlertPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const { setActiveTab, setSelectedClassId, setSelectedTeacherId } = useScheduleStore();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const sortedAlerts = [...alerts].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  const filteredAlerts = severityFilter === 'all'
    ? sortedAlerts
    : sortedAlerts.filter(a => a.severity === severityFilter);

  const counts = {
    error: alerts.filter(a => a.severity === 'error').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  const handleClick = (alert: DashboardAlert) => {
    const tab = alertTabMap[alert.type];
    if (tab) setActiveTab(tab);
    if (alert.relatedId) {
      if (classAlertTypes.has(alert.type)) setSelectedClassId(alert.relatedId);
      else if (teacherAlertTypes.has(alert.type)) setSelectedTeacherId(alert.relatedId);
    }
  };

  const tabs: { key: SeverityFilter; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: alerts.length },
    { key: 'error', label: '錯誤', count: counts.error },
    { key: 'warning', label: '警告', count: counts.warning },
    { key: 'info', label: '提示', count: counts.info },
  ];

  if (alerts.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex flex-col gap-3 h-full">
        <div className="text-sm font-bold font-manrope text-on-surface">警示</div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <CheckCircle className="w-8 h-8 text-tertiary" />
          <span className="text-xs text-on-surface-variant">目前無警示</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex flex-col gap-3 h-full overflow-hidden">
      <div className="text-sm font-bold font-manrope text-on-surface shrink-0">警示</div>

      {/* Severity filter tabs */}
      <div className="flex gap-1 shrink-0 flex-wrap">
        {tabs.map(({ key, label, count }) => (
          count !== 0 || key === 'all' ? (
            <button
              key={key}
              onClick={() => setSeverityFilter(key)}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                severityFilter === key
                  ? key === 'error' ? 'bg-error text-white'
                    : key === 'warning' ? 'bg-warning text-white'
                    : key === 'info' ? 'bg-primary text-white'
                    : 'bg-on-surface text-surface'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {label}
              {count != null && (
                <span className={cn(
                  'rounded-full px-1 min-w-[14px] text-center leading-tight',
                  severityFilter === key ? 'bg-white/20' : 'bg-surface-container-high'
                )}>
                  {count}
                </span>
              )}
            </button>
          ) : null
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredAlerts.map((alert, i) => {
          const isError = alert.severity === 'error';
          const isInfo = alert.severity === 'info';
          return (
            <button
              key={i}
              onClick={() => handleClick(alert)}
              className={cn(
                'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 transition-colors cursor-pointer group',
                isError
                  ? 'border-error bg-error/5 hover:bg-error/10'
                  : isInfo
                  ? 'border-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-warning bg-warning/5 hover:bg-warning/10'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                isError ? 'bg-error/15' : isInfo ? 'bg-primary/15' : 'bg-warning/15'
              )}>
                {isError
                  ? <XCircle className="w-3 h-3 text-error" />
                  : isInfo
                  ? <Info className="w-3 h-3 text-primary" />
                  : <AlertCircle className="w-3 h-3 text-warning" />}
              </div>
              <span className="text-xs text-on-surface leading-relaxed flex-1">{alert.message}</span>
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
        {filteredAlerts.length === 0 && (
          <div className="py-6 text-center text-xs text-on-surface-variant italic">此類別無警示</div>
        )}
      </div>
    </div>
  );
}
