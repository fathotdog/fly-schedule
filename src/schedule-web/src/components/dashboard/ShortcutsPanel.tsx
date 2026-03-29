import { CalendarDays, BookOpen, FileDown, Users, ChevronRight, Home, Download } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

interface Shortcut {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  tab: string;
}

const shortcuts: Shortcut[] = [
  { icon: CalendarDays, label: '前往排課', description: '拖曳配置課程時段', tab: 'timetable' },
  { icon: BookOpen, label: '前往配課', description: '設定教師課程分配', tab: 'assignments' },
  { icon: Users, label: '教師管理', description: '管理教師與節次上限', tab: 'teachers' },
  { icon: FileDown, label: '課程設定', description: '管理科目與顏色', tab: 'courses' },
  { icon: Home, label: '導師設定', description: '設定各班級導師', tab: 'homerooms' },
  { icon: Download, label: '匯出報表', description: '匯出課表 PDF/Excel', tab: 'timetable' },
];

export function ShortcutsPanel() {
  const { setActiveTab } = useScheduleStore();

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
      <div className="text-sm font-bold font-manrope text-on-surface mb-4">快捷操作</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shortcuts.map(({ icon: Icon, label, description, tab }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all hover:translate-x-0.5 group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-on-surface">{label}</div>
              <div className="text-xs text-on-surface-variant/60 mt-0.5 truncate">{description}</div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
