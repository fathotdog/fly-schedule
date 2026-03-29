import { Calendar, School, CalendarCheck, Award, Users, BookOpen, ClipboardList, Clock, Home, DoorOpen, LayoutGrid, PanelLeftClose, PanelLeftOpen, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';

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
    label: '總覽',
    items: [{ value: 'dashboard', label: '儀表板', icon: LayoutDashboard }],
  },
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
  const { sidebarCollapsed, toggleSidebar } = useScheduleStore();

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-surface-container-low border-r border-outline-variant/20 flex flex-col z-40 transition-all duration-300 overflow-hidden',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Branding */}
      <div className={cn(
        'flex items-center border-b border-outline-variant/20 shrink-0',
        sidebarCollapsed ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'
      )}>
        <img src="/bluemoutain.png" alt="山青" className="w-9 h-9 rounded-xl shrink-0 object-cover" />
        {!sidebarCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-sm font-bold text-on-surface leading-tight">排課系統</div>
            <div className="text-xs text-on-surface-variant tracking-wide">Academic Scheduler</div>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-5', sidebarCollapsed ? 'px-2' : 'px-3')}>
        {navGroups.map(group => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-2 mb-1.5 overflow-hidden whitespace-nowrap">
                {group.label}
              </div>
            )}
            {sidebarCollapsed && <div className="h-px bg-outline-variant/20 mb-1.5" />}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => onTabChange(item.value)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center rounded-xl text-sm font-medium transition-all relative',
                      sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-2 text-left',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    )}
                  >
                    {isActive && !sidebarCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="overflow-hidden whitespace-nowrap">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle button */}
      <div className={cn('border-t border-outline-variant/20 py-2', sidebarCollapsed ? 'px-2' : 'px-3')}>
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? '展開選單' : '收折選單'}
          className={cn(
            'w-full flex items-center rounded-xl py-2 text-sm font-medium transition-all text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span className="overflow-hidden whitespace-nowrap">收折選單</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
