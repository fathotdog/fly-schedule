import { useQuery } from '@tanstack/react-query';
import { getCourseAssignments } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { EMPTY_ARR } from '@/lib/constants';

interface Options {
  classId?: number;
  teacherId?: number;
  enabled?: boolean;
}

export function useCourseAssignments({ classId, teacherId, enabled = true }: Options = {}) {
  const { currentSemesterId } = useScheduleStore();
  return useQuery({
    queryKey: ['courseAssignments', currentSemesterId, classId, teacherId],
    queryFn: () => getCourseAssignments(currentSemesterId!, classId, teacherId),
    enabled: !!currentSemesterId && enabled,
    placeholderData: EMPTY_ARR,
  });
}
