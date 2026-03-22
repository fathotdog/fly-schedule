import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeacherSchedule, getTimetable } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { cellKey } from '@/lib/timetable';
import type { CourseAssignmentProgress } from '@/api/types';

export function useConflictWarnings(courseAssignments?: CourseAssignmentProgress[]) {
  const {
    timetableViewMode, selectedCourseAssignmentId, currentSemesterId,
  } = useScheduleStore();

  const isClassMode = timetableViewMode === 'class';

  const selectedAssignment = courseAssignments?.find(ca => ca.id === selectedCourseAssignmentId) ?? null;
  const teacherId = selectedAssignment?.teacherId ?? null;
  const classId = selectedAssignment?.classId ?? null;

  // 班級模式：取教師課表（query key 與 TeacherSchedulePanel 相同，命中快取）
  const { data: teacherData } = useQuery({
    queryKey: ['teacherSchedule', currentSemesterId, teacherId],
    queryFn: () => getTeacherSchedule(currentSemesterId!, teacherId!),
    enabled: isClassMode && !!currentSemesterId && !!teacherId && !!selectedCourseAssignmentId,
  });

  // 教師模式：取班級課表（query key 與 ClassSchedulePanel 相同，命中快取）
  const { data: classData } = useQuery({
    queryKey: ['timetable', currentSemesterId, 'class', classId],
    queryFn: () => getTimetable(currentSemesterId!, classId!),
    enabled: !isClassMode && !!currentSemesterId && !!classId && !!selectedCourseAssignmentId,
  });

  const warnings = useMemo(() => {
    if (!selectedCourseAssignmentId) return new Set<string>();

    const slots = isClassMode ? teacherData?.slots : classData?.slots;
    if (!slots) return new Set<string>();

    const set = new Set<string>();
    for (const s of slots) {
      set.add(cellKey(s.dayOfWeek, s.periodId));
    }
    return set;
  }, [selectedCourseAssignmentId, isClassMode, teacherData?.slots, classData?.slots]);

  const warningMessage = isClassMode ? '教師此節次已有課' : '班級此節次已有課';

  return { warnings, warningMessage };
}
