import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from 'sonner';
import { useScheduleStore } from '@/store/useScheduleStore';
import { getSemesters } from '@/api/client';
import { GraduationCap, Calendar, School, CalendarCheck, Award, Users, BookOpen, ClipboardList, Clock, Home, DoorOpen, LayoutGrid } from 'lucide-react';

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

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function AppContent() {
  const { currentSemesterId, setCurrentSemesterId } = useScheduleStore();

  useEffect(() => {
    getSemesters().then(semesters => {
      const current = semesters.find(s => s.isCurrent);
      if (current) setCurrentSemesterId(current.id);
    });
  }, [setCurrentSemesterId]);

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-white/90" />
          <h1 className="text-xl font-bold text-white">排課系統</h1>
        </div>
        {currentSemesterId && (
          <span className="text-sm text-white/80 bg-white/15 px-3 py-1 rounded-full">
            目前學期 ID: {currentSemesterId}
          </span>
        )}
      </header>

      <Tabs defaultValue="timetable" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-surface-alt px-6 pt-2 pb-1 justify-start flex-wrap h-auto gap-1 rounded-none border-b border-indigo-100">
          <TabsTrigger value="semester" className="gap-1.5"><Calendar className="w-3.5 h-3.5" />開學日</TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5"><School className="w-3.5 h-3.5" />班級</TabsTrigger>
          <TabsTrigger value="schoolDays" className="gap-1.5"><CalendarCheck className="w-3.5 h-3.5" />上課日</TabsTrigger>
          <TabsTrigger value="staffTitles" className="gap-1.5"><Award className="w-3.5 h-3.5" />職稱</TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5"><Users className="w-3.5 h-3.5" />教師</TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />課程</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" />配課</TabsTrigger>
          <TabsTrigger value="periods" className="gap-1.5"><Clock className="w-3.5 h-3.5" />節次</TabsTrigger>
          <TabsTrigger value="homerooms" className="gap-1.5"><Home className="w-3.5 h-3.5" />導師</TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5"><DoorOpen className="w-3.5 h-3.5" />專科教室</TabsTrigger>
          <div className="w-px h-6 bg-indigo-200 mx-2 self-center" />
          <TabsTrigger value="timetable" className="gap-1.5 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <LayoutGrid className="w-3.5 h-3.5" />排課
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="semester"><SemesterTab /></TabsContent>
          <TabsContent value="classes"><ClassTab /></TabsContent>
          <TabsContent value="schoolDays"><SchoolDayTab /></TabsContent>
          <TabsContent value="staffTitles"><StaffTitleTab /></TabsContent>
          <TabsContent value="teachers"><TeacherTab /></TabsContent>
          <TabsContent value="courses"><CourseTab /></TabsContent>
          <TabsContent value="assignments"><CourseAssignmentTab /></TabsContent>
          <TabsContent value="periods"><PeriodTab /></TabsContent>
          <TabsContent value="homerooms"><HomeroomTab /></TabsContent>
          <TabsContent value="rooms"><SpecialRoomTab /></TabsContent>
          <TabsContent value="timetable" className="h-full"><TimetablePage /></TabsContent>
        </div>
      </Tabs>

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
