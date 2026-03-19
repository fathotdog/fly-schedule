import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimetable, getPeriods, createTimetableSlot, deleteTimetableSlot } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Plus, Minus, LayoutGrid } from 'lucide-react';
import type { TimetableSlot } from '@/api/types';
import { toast } from 'sonner';
import axios from 'axios';
import { DAY_NAMES } from '@/lib/constants';

export function TimetableGrid() {
  const qc = useQueryClient();
  const { currentSemesterId, selectedClassId, selectedCourseAssignmentId, setSelectedCourseAssignmentId, setSelectedTeacherId } = useScheduleStore();

  const { data } = useQuery({
    queryKey: ['timetable', currentSemesterId, selectedClassId],
    queryFn: () => getTimetable(currentSemesterId!, selectedClassId!),
    enabled: !!currentSemesterId && !!selectedClassId,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', currentSemesterId],
    queryFn: () => getPeriods(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const addMut = useMutation({
    mutationFn: (params: { dayOfWeek: number; periodId: number }) =>
      createTimetableSlot(currentSemesterId!, {
        courseAssignmentId: selectedCourseAssignmentId!,
        dayOfWeek: params.dayOfWeek,
        periodId: params.periodId,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['timetable'] });
      qc.invalidateQueries({ queryKey: ['teacherSchedule'] });
      const updated = qc.getQueryData<{ courseAssignments: { id: number; scheduledPeriods: number; weeklyPeriods: number }[] }>(
        ['timetable', currentSemesterId, selectedClassId]
      );
      const ca = updated?.courseAssignments.find(a => a.id === selectedCourseAssignmentId);
      if (ca && ca.scheduledPeriods >= ca.weeklyPeriods) {
        setSelectedCourseAssignmentId(null);
      }
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const conflicts = err.response.data?.conflicts as { type: string; message: string }[];
        conflicts?.forEach(c => toast.error(c.message));
      } else {
        toast.error('排課失敗');
      }
    },
  });

  const removeMut = useMutation({
    mutationFn: deleteTimetableSlot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable'] });
      qc.invalidateQueries({ queryKey: ['teacherSchedule'] });
    },
  });

  if (!selectedClassId) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 text-center flex flex-col items-center gap-3">
        <LayoutGrid className="w-12 h-12 text-primary/30" />
        <span className="text-on-surface-variant">請選擇班級以檢視課表</span>
      </div>
    );
  }

  const slots = data?.slots ?? [];

  const slotMap = new Map(slots.map(s => [`${s.dayOfWeek}-${s.periodId}`, s]));
  const getSlot = (day: number, periodId: number): TimetableSlot | undefined =>
    slotMap.get(`${day}-${periodId}`);

  return (
    <div className="overflow-auto">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="p-2 bg-surface-container-low text-primary rounded-lg w-16 text-[10px] font-bold uppercase tracking-widest">節次</th>
            {DAY_NAMES.map((name, i) => (
              <th key={i} className="p-2 bg-surface-container-low text-primary rounded-lg min-w-[140px] text-[10px] font-bold uppercase tracking-widest">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.filter(p => !p.isActivity).map(period => (
            <tr key={period.id}>
              <td className="p-2 text-center font-medium bg-surface-container-low rounded-lg">
                <div className="text-primary text-sm">{period.periodNumber}</div>
                <div className="text-[10px] text-on-surface-variant">{period.startTime?.substring(0, 5)}</div>
              </td>
              {[1, 2, 3, 4, 5].map(day => {
                const slot = getSlot(day, period.id);
                return (
                  <td key={day} className="p-0 h-20 relative rounded-lg border border-outline-variant/15 hover:border-primary/30 transition-shadow">
                    {slot ? (
                      <SlotCell slot={slot}
                        onRemove={() => removeMut.mutate(slot.id)}
                        onSelectTeacher={() => setSelectedTeacherId(slot.teacherId)} />
                    ) : (
                      <EmptyCell
                        canAdd={!!selectedCourseAssignmentId}
                        onAdd={() => addMut.mutate({ dayOfWeek: day, periodId: period.id })} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotCell({ slot, onRemove, onSelectTeacher }: {
  slot: TimetableSlot;
  onRemove: () => void;
  onSelectTeacher: () => void;
}) {
  return (
    <div className="h-full p-1.5 flex flex-col justify-between group rounded-xl hover:shadow-card"
      style={{
        backgroundColor: slot.courseColorCode + '20',
        borderLeft: `3px solid ${slot.courseColorCode}`,
      }}>
      <div>
        <div className="font-medium text-sm" style={{ color: slot.courseColorCode }}>{slot.courseName}</div>
        <button className="text-xs text-on-surface-variant hover:text-primary hover:underline"
          onClick={onSelectTeacher}>
          {slot.teacherName}
        </button>
      </div>
      <div className="flex justify-end opacity-0 group-hover:opacity-100">
        <button onClick={onRemove}
          className="p-1 rounded hover:bg-error-container text-error" title="移除">
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyCell({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  if (!canAdd) return <div className="h-full" />;
  return (
    <div className="h-full flex items-center justify-center cursor-pointer hover:bg-surface-container-low rounded-xl"
      onClick={onAdd}>
      <Plus className="w-5 h-5 text-outline-variant" />
    </div>
  );
}
