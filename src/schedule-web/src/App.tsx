import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';
import { getSemesters, setCurrentSemester } from '@/api/client';

import { SemesterTab } from '@/components/setup/SemesterTab';
import { ClassTab } from '@/components/setup/ClassTab';
import { SchoolDayTab } from '@/components/setup/SchoolDayTab';
import { StaffTitleTab } from '@/components/setup/StaffTitleTab';
import { TeacherTab } from '@/components/setup/TeacherTab';
import { CourseTab } from '@/components/setup/CourseTab';
import { CourseAssignmentTab } from '@/components/setup/CourseAssignmentTab';
import { PeriodTab } from '@/components/setup/PeriodTab';
import { HomeroomTab } from '@/components/setup/HomeroomTab';
import { SpecialRoomTab } from '@/components/setup/SpecialRoomTab';
import { TimetablePage } from '@/components/timetable/TimetablePage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AppContent() {
  const { currentSemesterId, setCurrentSemesterId, activeTab, setActiveTab, sidebarCollapsed } = useScheduleStore();
  const qc = useQueryClient();

  const { data: semesters = [] } = useQuery({ queryKey: ['semesters'], queryFn: getSemesters });

  useEffect(() => {
    const current = semesters.find(s => s.isCurrent);
    if (current && !currentSemesterId) {
      const name = `${current.academicYear}年 第${current.term}學期`;
      setCurrentSemesterId(current.id, name);
    }
  }, [semesters, currentSemesterId, setCurrentSemesterId]);

  async function handleSemesterChange(id: number) {
    const data = await setCurrentSemester(id);
    const name = `${data.academicYear}年 第${data.term}學期`;
    setCurrentSemesterId(data.id, name);
    qc.invalidateQueries();
  }

  const isTimetable = activeTab === 'timetable';

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <Navbar semesters={semesters} currentSemesterId={currentSemesterId} onSemesterChange={handleSemesterChange} />

      <main className={cn('pt-16 transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-64')}>
        <div className={isTimetable ? 'h-[calc(100vh-4rem)] p-4' : 'p-6'}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'semester' && <SemesterTab />}
          {activeTab === 'classes' && <ClassTab />}
          {activeTab === 'schoolDays' && <SchoolDayTab />}
          {activeTab === 'staffTitles' && <StaffTitleTab />}
          {activeTab === 'teachers' && <TeacherTab />}
          {activeTab === 'courses' && <CourseTab />}
          {activeTab === 'assignments' && <CourseAssignmentTab />}
          {activeTab === 'periods' && <PeriodTab />}
          {activeTab === 'homerooms' && <HomeroomTab />}
          {activeTab === 'rooms' && <SpecialRoomTab />}
          {activeTab === 'timetable' && <TimetablePage />}
        </div>
      </main>

      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
