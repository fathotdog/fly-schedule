import { create } from 'zustand';

interface ScheduleState {
  currentSemesterId: number | null;
  currentSemesterName: string | null;
  selectedClassId: number | null;
  selectedCourseAssignmentId: number | null;
  selectedTeacherId: number | null;
  activeTab: string;
  setCurrentSemesterId: (id: number | null, name?: string | null) => void;
  setSelectedClassId: (id: number | null) => void;
  setSelectedCourseAssignmentId: (id: number | null) => void;
  setSelectedTeacherId: (id: number | null) => void;
  setActiveTab: (tab: string) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  currentSemesterId: null,
  currentSemesterName: null,
  selectedClassId: null,
  selectedCourseAssignmentId: null,
  selectedTeacherId: null,
  activeTab: 'timetable',
  setCurrentSemesterId: (id, name) => set({ currentSemesterId: id, currentSemesterName: name || null, selectedClassId: null }),
  setSelectedClassId: (id) => set({ selectedClassId: id, selectedCourseAssignmentId: null }),
  setSelectedCourseAssignmentId: (id) => set({ selectedCourseAssignmentId: id }),
  setSelectedTeacherId: (id) => set({ selectedTeacherId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
