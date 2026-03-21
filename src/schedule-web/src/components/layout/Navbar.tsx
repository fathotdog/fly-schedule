import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';
import type { Semester } from '@/api/types';

interface NavbarProps {
  semesters: Semester[];
  currentSemesterId: number | null;
  onSemesterChange: (id: number) => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: '儀表板',
  semester: '開學日',
  classes: '班級管理',
  schoolDays: '上課日',
  periods: '節次設定',
  staffTitles: '職稱管理',
  teachers: '教師管理',
  courses: '課程管理',
  assignments: '配課管理',
  homerooms: '導師設定',
  rooms: '專科教室',
  timetable: '排課',
};

export function Navbar({ semesters, currentSemesterId, onSemesterChange }: NavbarProps) {
  const { sidebarCollapsed, activeTab } = useScheduleStore();
  const pageTitle = TAB_TITLES[activeTab] ?? '';

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between px-6 z-30 transition-all duration-300',
      sidebarCollapsed ? 'left-16' : 'left-64'
    )}>
      <span className="text-sm font-semibold text-on-surface">{pageTitle}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-on-surface-variant">目前學期：</span>
        {semesters.length === 0 ? (
          <span className="text-xs text-on-surface-variant italic">請先建立學期</span>
        ) : (
          <select
            value={currentSemesterId ?? ''}
            onChange={e => onSemesterChange(Number(e.target.value))}
            className="text-sm bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                {s.schoolName ? `${s.schoolName} ` : ''}{s.academicYear}年 第{s.term}學期
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
}
