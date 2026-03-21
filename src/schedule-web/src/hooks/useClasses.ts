import { useQuery } from '@tanstack/react-query';
import { getClasses } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { EMPTY_ARR } from '@/lib/constants';

export function useClasses() {
  const { currentSemesterId } = useScheduleStore();
  return useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
    placeholderData: EMPTY_ARR,
  });
}
