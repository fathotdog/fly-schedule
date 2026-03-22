import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '@/api/client';
import { EMPTY_ARR } from '@/lib/constants';

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers,
    placeholderData: EMPTY_ARR,
  });
}
