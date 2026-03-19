import { GraduationCap, Calendar, School, CalendarCheck, Award, Users, BookOpen, ClipboardList, Clock, Home, DoorOpen, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '基本設定',
    items: [
      { value: 'semester', label: '開學日', icon: Calendar },
      { value: 'classes', label: '班級', icon: School },
      { value: 'schoolDays', label: '上課日', icon: CalendarCheck },
      { value: 'periods', label: '節次', icon: Clock },
    ],
  },
  {
    label: '人員與課程',
    items: [
      { value: 'staffTitles', label: '職稱', icon: Award },
      { value: 'teachers', label: '教師', icon: Users },
      { value: 'courses', label: '課程', icon: BookOpen },
      { value: 'assignments', label: '配課', icon: ClipboardList },
      { value: 'homerooms', label: '導師', icon: Home },
      { value: 'rooms', label: '專科教室', icon: DoorOpen },
    ],
  },
  {
    label: '排課',
    items: [
      { value: 'timetable', label: '排課', icon: LayoutGrid },
    ],
  },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 flex flex-col z-40">
      {/* Branding */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/20">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-on-surface leading-tight">排課系統</div>
          <div className="text-[10px] text-on-surface-variant tracking-wide">Academic Scheduler</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-2 mb-1.5">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => onTabChange(item.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left relative',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
