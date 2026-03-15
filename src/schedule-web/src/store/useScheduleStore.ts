import { create } from 'zustand';

interface ScheduleState {
  currentSemesterId: number | null;
  selectedClassId: number | null;
  selectedCourseAssignmentId: number | null;
  selectedTeacherId: number | null;
  setCurrentSemesterId: (id: number | null) => void;
  setSelectedClassId: (id: number | null) => void;
  setSelectedCourseAssignmentId: (id: number | null) => void;
  setSelectedTeacherId: (id: number | null) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  currentSemesterId: null,
  selectedClassId: null,
  selectedCourseAssignmentId: null,
  selectedTeacherId: null,
  setCurrentSemesterId: (id) => set({ currentSemesterId: id, selectedClassId: null }),
  setSelectedClassId: (id) => set({ selectedClassId: id, selectedCourseAssignmentId: null }),
  setSelectedCourseAssignmentId: (id) => set({ selectedCourseAssignmentId: id }),
  setSelectedTeacherId: (id) => set({ selectedTeacherId: id }),
}));
