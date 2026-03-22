import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimetable, getPeriods, createTimetableSlot, deleteTimetableSlot, moveTimetableSlot, swapTimetableSlots, checkConflicts, checkSwapConflicts } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Plus, Minus, LayoutGrid, GripVertical, User, AlertTriangle } from 'lucide-react';
import type { TimetableSlot, ConflictInfo } from '@/api/types';
import { DAY_NAMES, SCHOOL_DAYS } from '@/lib/constants';
import { cellKey, handleConflictError, invalidateTimetableQueries, makeSlotMap } from '@/lib/timetable';
import { cn } from '@/lib/utils';
import { useConflictWarnings } from '@/hooks/useConflictWarnings';

export function TimetableGrid() {
  const qc = useQueryClient();
  const {
    currentSemesterId, selectedClassId, selectedTeacherId,
    selectedCourseAssignmentId, setSelectedCourseAssignmentId,
    setSelectedTeacherId, setSelectedClassId,
    timetableViewMode,
  } = useScheduleStore();

  const isClassMode = timetableViewMode === 'class';
  const activeId = isClassMode ? selectedClassId : selectedTeacherId;

  const [draggedSlot, setDraggedSlot] = useState<TimetableSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dragConflicts, setDragConflicts] = useState<ConflictInfo[] | null>(null);
  const [conflictCellKey, setConflictCellKey] = useState<string | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetDragState = () => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    if (abortRef.current) abortRef.current.abort();
    setDragConflicts(null);
    setConflictCellKey(null);
  };

  useEffect(() => () => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const queryKey = ['timetable', currentSemesterId, isClassMode ? 'class' : 'teacher', activeId];

  const { data, isLoading: isTimetableLoading } = useQuery({
    queryKey,
    queryFn: () => getTimetable(
      currentSemesterId!,
      isClassMode ? activeId! : undefined,
      isClassMode ? undefined : activeId!,
    ),
    enabled: !!currentSemesterId && !!activeId,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', currentSemesterId],
    queryFn: () => getPeriods(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { warnings, warningMessage } = useConflictWarnings(data?.courseAssignments);

  const addMut = useMutation({
    mutationFn: (params: { dayOfWeek: number; periodId: number }) =>
      createTimetableSlot(currentSemesterId!, {
        courseAssignmentId: selectedCourseAssignmentId!,
        dayOfWeek: params.dayOfWeek,
        periodId: params.periodId,
      }),
    onSuccess: async () => {
      await invalidateTimetableQueries(qc);
      const updated = qc.getQueryData<{ courseAssignments: { id: number; scheduledPeriods: number; weeklyPeriods: number }[] }>(queryKey);
      const ca = updated?.courseAssignments.find(a => a.id === selectedCourseAssignmentId);
      if (ca && ca.scheduledPeriods >= ca.weeklyPeriods) {
        setSelectedCourseAssignmentId(null);
      }
    },
    onError: (err) => handleConflictError(err, '排課失敗'),
  });

  const removeMut = useMutation({
    mutationFn: deleteTimetableSlot,
    onSuccess: () => invalidateTimetableQueries(qc),
  });

  const moveMut = useMutation({
    mutationFn: (params: { slotId: number; dayOfWeek: number; periodId: number }) =>
      moveTimetableSlot(params.slotId, { dayOfWeek: params.dayOfWeek, periodId: params.periodId }),
    onSuccess: () => invalidateTimetableQueries(qc),
    onError: (err) => handleConflictError(err, '移動排課失敗'),
  });

  const swapMut = useMutation({
    mutationFn: (params: { slotId1: number; slotId2: number }) => swapTimetableSlots(params),
    onSuccess: () => invalidateTimetableQueries(qc),
    onError: (err) => handleConflictError(err, '交換排課失敗'),
  });

  if (!activeId) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 flex flex-col items-center gap-6">
        <LayoutGrid className="w-12 h-12 text-primary/30" />
        <div className="space-y-3 w-full max-w-xs">
          {(isClassMode ? [
            { step: 1, text: '在左側選擇班級' },
            { step: 2, text: '點選配課項目（課程 + 教師）' },
            { step: 3, text: '點擊空格排入節次' },
          ] : [
            { step: 1, text: '在左側選擇教師' },
            { step: 2, text: '點選配課項目（課程 + 班級）' },
            { step: 3, text: '點擊空格排入節次' },
          ]).map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{step}</span>
              <span>{text}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 text-xs text-on-surface-variant/60 mt-1 pl-9">
            <GripVertical className="w-3.5 h-3.5 shrink-0" />
            <span>已排節次可拖曳移動位置</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant/60 pl-9">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>{isClassMode ? '點擊教師名稱可查看課表，並直接在教師課表上排課' : '點擊班級名稱可查看課表，並直接在班級課表上排課'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isTimetableLoading) {
    return (
      <div className="overflow-auto">
        <div className="space-y-1.5">
          <div className="h-8 bg-muted rounded animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/60 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const slots = data?.slots ?? [];

  const slotMap = makeSlotMap(slots);
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
              {SCHOOL_DAYS.map(day => {
                const slot = getSlot(day, period.id);
                const key = cellKey(day, period.id);
                const isDropTarget = dragOverCell === key && !!draggedSlot && (!slot || slot.id !== draggedSlot.id);
                const isDropTargetEmpty = !slot && isDropTarget;
                const isDropTargetSwap = !!slot && isDropTarget;
                const hasConflict = conflictCellKey === key && !!dragConflicts && dragConflicts.length > 0;
                const hasCellWarning = !slot && !!selectedCourseAssignmentId && !draggedSlot && warnings.has(key);
                return (
                  <td
                    key={day}
                    className={cn(
                      'p-0 h-20 relative rounded-lg border border-outline-variant/15 hover:border-primary/30 transition-shadow',
                      isDropTargetEmpty && !hasConflict && 'border-primary/50 bg-primary/5 ring-2 ring-primary/30',
                      isDropTargetSwap && !hasConflict && 'border-amber-500/50 bg-amber-50/50 ring-2 ring-amber-500/30',
                      hasConflict && isDropTarget && 'border-red-500/50 bg-red-50/50 ring-2 ring-red-500/30',
                      hasCellWarning && !isDropTarget && 'bg-amber-500/[0.04]'
                    )}
                    onDragOver={(e) => {
                      if (draggedSlot && (!slot || slot.id !== draggedSlot.id)) e.preventDefault();
                    }}
                    onDragEnter={() => {
                      if (!draggedSlot || (slot && slot.id === draggedSlot.id)) return;
                      setDragOverCell(key);
                      resetDragState();
                      const captured = { draggedSlot, slot, key, day, periodId: period.id };
                      checkTimeoutRef.current = setTimeout(async () => {
                        const ctrl = new AbortController();
                        abortRef.current = ctrl;
                        try {
                          let result: { conflicts: ConflictInfo[]; hasConflicts: boolean };
                          if (!captured.slot) {
                            result = await checkConflicts(currentSemesterId!, {
                              courseAssignmentId: captured.draggedSlot.courseAssignmentId,
                              dayOfWeek: captured.day,
                              periodId: captured.periodId,
                              excludeSlotIds: [captured.draggedSlot.id],
                            });
                          } else {
                            result = await checkSwapConflicts(captured.draggedSlot.id, captured.slot.id);
                          }
                          if (!ctrl.signal.aborted) {
                            setDragConflicts(result.conflicts);
                            setConflictCellKey(captured.key);
                          }
                        } catch {
                          // aborted or network error — ignore
                        }
                      }, 150);
                    }}
                    onDragLeave={(e) => {
                      if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
                      setDragOverCell(null);
                      resetDragState();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      resetDragState();
                      if (draggedSlot && !slot) {
                        moveMut.mutate({ slotId: draggedSlot.id, dayOfWeek: day, periodId: period.id });
                      } else if (draggedSlot && slot && slot.id !== draggedSlot.id) {
                        swapMut.mutate({ slotId1: draggedSlot.id, slotId2: slot.id });
                      }
                      setDraggedSlot(null);
                      setDragOverCell(null);
                    }}
                  >
                    {conflictCellKey === key && dragConflicts && dragConflicts.length > 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50
                        bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg px-3 py-2 shadow-lg
                        pointer-events-none whitespace-nowrap max-w-[250px]">
                        {dragConflicts.map((c, i) => <div key={i}>{c.message}</div>)}
                      </div>
                    )}
                    {slot ? (
                      <SlotCell
                        slot={slot}
                        isClassMode={isClassMode}
                        isDragging={draggedSlot?.id === slot.id}
                        onRemove={() => removeMut.mutate(slot.id)}
                        onSecondaryClick={() => isClassMode ? setSelectedTeacherId(slot.teacherId) : setSelectedClassId(slot.classId)}
                        onDragStart={() => setDraggedSlot(slot)}
                        onDragEnd={() => {
                          setDraggedSlot(null);
                          setDragOverCell(null);
                          resetDragState();
                        }}
                      />
                    ) : (
                      <EmptyCell
                        canAdd={!!selectedCourseAssignmentId && !draggedSlot}
                        onAdd={() => addMut.mutate({ dayOfWeek: day, periodId: period.id })}
                        hasWarning={hasCellWarning}
                        warningMessage={warningMessage}
                      />
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

function SlotCell({ slot, isClassMode, isDragging, onRemove, onSecondaryClick, onDragStart, onDragEnd }: {
  slot: TimetableSlot;
  isClassMode: boolean;
  isDragging: boolean;
  onRemove: () => void;
  onSecondaryClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={cn(
        'h-full p-1.5 flex flex-col justify-between group rounded-xl hover:shadow-card cursor-grab active:cursor-grabbing transition-opacity',
        isDragging && 'opacity-40'
      )}
      style={{
        backgroundColor: slot.courseColorCode + '20',
        borderLeft: `3px solid ${slot.courseColorCode}`,
      }}>
      <div>
        <div className="font-medium text-sm" style={{ color: slot.courseColorCode }}>{slot.courseName}</div>
        <button className="text-xs text-on-surface-variant hover:text-primary hover:underline"
          onClick={onSecondaryClick}>
          {isClassMode ? slot.teacherName : slot.classDisplayName}
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

function EmptyCell({ canAdd, onAdd, hasWarning, warningMessage }: {
  canAdd: boolean; onAdd: () => void; hasWarning?: boolean; warningMessage?: string;
}) {
  if (!canAdd) return <div className="h-full" />;
  return (
    <div
      className={cn(
        'h-full flex items-center justify-center cursor-pointer rounded-xl group',
        hasWarning ? 'hover:bg-amber-500/10' : 'hover:bg-primary/5',
      )}
      onClick={onAdd}
      title={hasWarning ? warningMessage : '點擊排入此節次'}
    >
      {hasWarning ? (
        <>
          <AlertTriangle className="w-4 h-4 text-amber-500/60 group-hover:hidden" />
          <Plus className="w-5 h-5 text-amber-600 hidden group-hover:block" />
        </>
      ) : (
        <Plus className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
      )}
    </div>
  );
}
