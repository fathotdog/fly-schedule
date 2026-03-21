import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeacherSchedule, getPeriods, getCourseAssignments, createTimetableSlot } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DAY_NAMES, SCHOOL_DAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { handleConflictError, invalidateTimetableQueries, makeSlotMap } from '@/lib/timetable';

export function TeacherSchedulePanel() {
  const qc = useQueryClient();
  const { currentSemesterId, selectedTeacherId } = useScheduleStore();
  const [addTarget, setAddTarget] = useState<{ dayOfWeek: number; periodId: number; x: number; y: number } | null>(null);

  const { data } = useQuery({
    queryKey: ['teacherSchedule', currentSemesterId, selectedTeacherId],
    queryFn: () => getTeacherSchedule(currentSemesterId!, selectedTeacherId!),
    enabled: !!currentSemesterId && !!selectedTeacherId,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', currentSemesterId],
    queryFn: () => getPeriods(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: courseAssignments = [] } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, 'teacher', selectedTeacherId],
    queryFn: () => getCourseAssignments(currentSemesterId!, undefined, selectedTeacherId!),
    enabled: !!currentSemesterId && !!selectedTeacherId,
  });

  const addMut = useMutation({
    mutationFn: (params: { courseAssignmentId: number; dayOfWeek: number; periodId: number }) =>
      createTimetableSlot(currentSemesterId!, {
        courseAssignmentId: params.courseAssignmentId,
        dayOfWeek: params.dayOfWeek,
        periodId: params.periodId,
      }),
    onSuccess: () => {
      invalidateTimetableQueries(qc);
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
      setAddTarget(null);
    },
    onError: (err) => handleConflictError(err, '排課失敗'),
  });

  if (!selectedTeacherId || !data) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 text-sm text-center flex flex-col items-center gap-2">
        <User className="w-8 h-8 text-primary/30" />
        <span className="text-on-surface-variant">點擊教師名稱查看課表</span>
      </div>
    );
  }

  const slotMap = makeSlotMap(data.slots);
  const getSlot = (day: number, periodId: number) => slotMap.get(`${day}-${periodId}`);

  const availableAssignments = courseAssignments.filter(ca => ca.scheduledPeriods < ca.weeklyPeriods);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-on-surface">{data.teacherName} 的課表</h3>
        <Badge variant="secondary" className="ml-auto">{data.slots.length} 節</Badge>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="p-1 bg-surface-container-low text-primary rounded text-[9px] font-bold uppercase tracking-widest w-8"></th>
            {DAY_NAMES.map((n, i) => (
              <th key={i} className="p-1 bg-surface-container-low text-primary rounded text-[9px] font-bold uppercase tracking-widest">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.filter(p => !p.isActivity).map(period => (
            <tr key={period.id}>
              <td className="p-1 text-center bg-surface-container-low rounded text-primary font-medium">{period.periodNumber}</td>
              {SCHOOL_DAYS.map(day => {
                const slot = getSlot(day, period.id);
                return (
                  <td
                    key={day}
                    className={cn(
                      'p-1 text-center h-10 rounded border border-outline-variant/15 transition-colors overflow-hidden',
                      !slot && 'cursor-pointer hover:bg-surface-container-low hover:border-primary/30'
                    )}
                    style={slot ? { backgroundColor: slot.courseColorCode + '20' } : {}}
                    onClick={(e) => { if (!slot) setAddTarget({ dayOfWeek: day, periodId: period.id, x: e.clientX, y: e.clientY }); }}
                  >
                    {slot && (
                      <div>
                        <div className="font-medium" style={{ color: slot.courseColorCode }}>{slot.courseName}</div>
                        <div className="text-on-surface-variant">{slot.classDisplayName}</div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!addTarget} onOpenChange={(open) => { if (!open) setAddTarget(null); }}>
        <DialogContent
          className="max-w-xs !translate-x-0 !translate-y-0 !animate-none data-open:!animate-none data-closed:!animate-none !duration-0"
          style={addTarget ? {
            top: `${Math.min(addTarget.y, window.innerHeight - 350)}px`,
            left: `${Math.min(addTarget.x, window.innerWidth - 320)}px`,
          } : undefined}
        >
          <DialogHeader>
            <DialogTitle>選擇配課</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-auto">
            {availableAssignments.length === 0 ? (
              <div className="text-center text-on-surface-variant text-sm py-4">此教師所有配課皆已排滿</div>
            ) : (
              availableAssignments.map(ca => (
                <button
                  key={ca.id}
                  disabled={addMut.isPending}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-container-low flex items-center justify-between disabled:opacity-50"
                  onClick={() => addTarget && addMut.mutate({
                    courseAssignmentId: ca.id,
                    dayOfWeek: addTarget.dayOfWeek,
                    periodId: addTarget.periodId,
                  })}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: ca.courseColorCode }} />
                    <span>{ca.courseName}</span>
                    <span className="text-on-surface-variant">{ca.classDisplayName}</span>
                  </div>
                  <span className="text-xs font-mono text-accent-orange shrink-0 ml-2">
                    {ca.scheduledPeriods}/{ca.weeklyPeriods}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
