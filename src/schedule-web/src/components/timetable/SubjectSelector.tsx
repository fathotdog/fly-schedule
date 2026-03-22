import { useQuery } from '@tanstack/react-query';
import { getTimetable } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function SubjectSelector() {
  const {
    currentSemesterId, selectedClassId, selectedTeacherId,
    selectedCourseAssignmentId, setSelectedCourseAssignmentId,
    setSelectedTeacherId, setSelectedClassId,
    timetableViewMode,
  } = useScheduleStore();

  const isClassMode = timetableViewMode === 'class';
  const activeId = isClassMode ? selectedClassId : selectedTeacherId;

  const { data } = useQuery({
    queryKey: ['timetable', currentSemesterId, isClassMode ? 'class' : 'teacher', activeId],
    queryFn: () => getTimetable(
      currentSemesterId!,
      isClassMode ? activeId! : undefined,
      isClassMode ? undefined : activeId!,
    ),
    enabled: !!currentSemesterId && !!activeId,
  });

  if (!activeId || !data) return null;

  const { courseAssignments } = data;

  return (
    <div className="space-y-1">
      <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">配課列表</h3>
      {courseAssignments.map(ca => {
        const isSelected = selectedCourseAssignmentId === ca.id;
        const isComplete = ca.scheduledPeriods >= ca.weeklyPeriods;
        return (
          <button
            key={ca.id}
            disabled={isComplete && !isSelected}
            onClick={() => {
              if (isComplete && !isSelected) return;
              if (isClassMode) {
                setSelectedTeacherId(ca.teacherId);
              } else {
                setSelectedClassId(ca.classId);
              }
              setSelectedCourseAssignmentId(isSelected ? null : ca.id);
            }}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-all',
              isSelected ? 'ring-2 ring-primary bg-secondary-container' : 'hover:bg-surface-container-low',
              isComplete && 'opacity-60 cursor-not-allowed'
            )}
            style={isSelected ? {} : { borderLeft: `3px solid ${ca.courseColorCode}` }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: ca.courseColorCode }} />
              {isClassMode ? (
                <>
                  <span>{ca.teacherName}</span>
                  <span className="text-on-surface-variant">{ca.courseName}</span>
                </>
              ) : (
                <>
                  <span>{ca.courseName}</span>
                  <span className="text-on-surface-variant">{ca.classDisplayName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isComplete && <Check className="w-3.5 h-3.5 text-tertiary" />}
              <span className={cn(
                'text-xs font-mono',
                isComplete ? 'text-tertiary' : 'text-accent-orange'
              )}>
                {ca.scheduledPeriods}/{ca.weeklyPeriods}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
