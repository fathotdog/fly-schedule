import { useQuery } from '@tanstack/react-query';
import { School, Users, AlertTriangle, TrendingUp, CalendarOff, RefreshCw, PlusCircle, UserPlus, BookOpen, CalendarDays, ArrowRight } from 'lucide-react';
import { getDashboard } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { StatCard } from './StatCard';
import { AlertPanel } from './AlertPanel';
import { ClassProgressTable } from './ClassProgressTable';
import { TeacherLoadTable } from './TeacherLoadTable';
import { PeriodHeatmap } from './PeriodHeatmap';
import { ShortcutsPanel } from './ShortcutsPanel';
import { GradeSummaryBar } from './GradeSummaryBar';

export function DashboardPage() {
  const { currentSemesterId, setActiveTab } = useScheduleStore();

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', currentSemesterId],
    queryFn: () => getDashboard(currentSemesterId!),
    enabled: currentSemesterId != null,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  if (!currentSemesterId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <TrendingUp className="w-10 h-10 text-on-surface-variant/30" />
        <p className="text-sm text-on-surface-variant">請先選擇學期以查看儀表板</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-on-surface-variant animate-pulse">載入中…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-error">載入失敗，請重新整理</div>
      </div>
    );
  }

  const { summary, classProgress, teacherLoad, alerts, periodDistribution, unscheduledPeriods, gradeSummary } = data;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Empty state: no classes configured yet
  if (summary.totalClasses === 0) {
    const steps = [
      { icon: PlusCircle, label: '建立班級', description: '先新增學校班級', tab: 'classes', step: 1 },
      { icon: UserPlus, label: '新增教師', description: '建立教師名單', tab: 'teachers', step: 2 },
      { icon: BookOpen, label: '配課', description: '指派教師與課程', tab: 'assignments', step: 3 },
      { icon: CalendarDays, label: '排課', description: '拖曳安排時段', tab: 'timetable', step: 4 },
    ];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold font-manrope text-on-surface">儀表板</h1>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8">
          <div className="max-w-xl mx-auto text-center">
            <TrendingUp className="w-10 h-10 text-primary/40 mx-auto mb-3" />
            <h2 className="text-base font-bold font-manrope text-on-surface mb-1">開始排課</h2>
            <p className="text-xs text-on-surface-variant mb-8">此學期尚未設定任何班級，請依照以下步驟完成設定。</p>
            <div className="grid grid-cols-4 gap-3">
              {steps.map(({ icon: Icon, label, description, tab, step }, idx) => (
                <div key={tab} className="relative">
                  {idx < steps.length - 1 && (
                    <ArrowRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant/30 z-10 hidden sm:block" />
                  )}
                  <button
                    onClick={() => setActiveTab(tab)}
                    className="w-full flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center relative">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{step}</span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface">{label}</div>
                    <div className="text-xs text-on-surface-variant/60 text-center">{description}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-manrope text-on-surface">儀表板</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-on-surface-variant/60">最後更新: {lastUpdated}</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-on-surface-variant ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Row 1 — stat cards + overall progress */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 grid grid-cols-4 gap-4">
          <StatCard icon={School} label="班級總數" value={summary.totalClasses} accent="blue" />
          <StatCard icon={Users} label="教師總數" value={summary.totalTeachers} accent="teal" />
          <StatCard icon={AlertTriangle} label="待處理警示" value={alerts.length} accent="red" />
          <StatCard
            icon={CalendarOff}
            label="未排節次"
            value={unscheduledPeriods}
            sub={`共 ${summary.totalAssignedPeriods} 節`}
            accent="amber"
          />
        </div>

        {/* Overall completion card */}
        <div className="col-span-4 bg-primary rounded-xl shadow-xl shadow-primary/10 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/8" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative">
            <TrendingUp className="w-5 h-5 text-white/70 mb-3" />
            <div className="text-3xl font-bold font-manrope leading-none mb-1">
              {summary.overallCompletionRate}%
            </div>
            <div className="text-xs text-white/70 mb-4">整體排課完成率</div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.min(summary.overallCompletionRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/50 mt-1.5">
              <span>已排 {summary.totalScheduledPeriods} 節</span>
              <span>共 {summary.totalAssignedPeriods} 節</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — grade summary */}
      {gradeSummary && gradeSummary.length > 0 && (
        <GradeSummaryBar gradeSummary={gradeSummary} />
      )}

      {/* Row 3 — shortcuts */}
      <ShortcutsPanel />

      {/* Row 4 — alerts + class progress */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '20rem' }}>
        <div className="col-span-4" style={{ minHeight: '20rem' }}>
          <AlertPanel alerts={alerts} />
        </div>
        <div className="col-span-8" style={{ minHeight: '20rem' }}>
          <ClassProgressTable classes={classProgress} />
        </div>
      </div>

      {/* Row 5 — teacher load */}
      <TeacherLoadTable teachers={teacherLoad} />

      {/* Row 6 — period heatmap */}
      <PeriodHeatmap distribution={periodDistribution} />
    </div>
  );
}
