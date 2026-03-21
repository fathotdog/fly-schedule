import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ScheduleState {
  currentSemesterId: number | null;
  currentSemesterName: string | null;
  selectedClassId: number | null;
  selectedCourseAssignmentId: number | null;
  selectedTeacherId: number | null;
  activeTab: string;
  sidebarCollapsed: boolean;
  setCurrentSemesterId: (id: number | null, name?: string | null) => void;
  setSelectedClassId: (id: number | null) => void;
  setSelectedCourseAssignmentId: (id: number | null) => void;
  setSelectedTeacherId: (id: number | null) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      currentSemesterId: null,
      currentSemesterName: null,
      selectedClassId: null,
      selectedCourseAssignmentId: null,
      selectedTeacherId: null,
      activeTab: 'dashboard',
      sidebarCollapsed: false,
      setCurrentSemesterId: (id, name) => set({ currentSemesterId: id, currentSemesterName: name || null, selectedClassId: null }),
      setSelectedClassId: (id) => set({ selectedClassId: id, selectedCourseAssignmentId: null }),
      setSelectedCourseAssignmentId: (id) => set({ selectedCourseAssignmentId: id }),
      setSelectedTeacherId: (id) => set({ selectedTeacherId: id }),
      setActiveTab: (tab) => set({ activeTab: tab, ...(tab === 'timetable' ? { sidebarCollapsed: true } : {}) }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'schedule-ui-state',
      partialize: (state) => ({
        currentSemesterId: state.currentSemesterId,
        currentSemesterName: state.currentSemesterName,
        activeTab: state.activeTab,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
