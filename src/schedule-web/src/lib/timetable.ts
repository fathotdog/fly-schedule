import axios from 'axios';
import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';

export function cellKey(dayOfWeek: number, periodId: number) {
  return `${dayOfWeek}-${periodId}`;
}

export function makeSlotMap<T extends { dayOfWeek: number; periodId: number }>(slots: T[]) {
  return new Map(slots.map(s => [cellKey(s.dayOfWeek, s.periodId), s]));
}

export function invalidateTimetableQueries(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['timetable'] }),
    qc.invalidateQueries({ queryKey: ['teacherSchedule'] }),
  ]);
}

export function handleConflictError(err: unknown, fallbackMsg: string) {
  if (axios.isAxiosError(err) && err.response?.status === 409) {
    const conflicts = err.response.data?.conflicts as { type: string; message: string }[];
    conflicts?.forEach(c => toast.error(c.message));
  } else if (axios.isAxiosError(err)) {
    toast.error(`${fallbackMsg}（${err.response?.status ?? 'network error'}）`);
  } else {
    toast.error(fallbackMsg);
  }
}
