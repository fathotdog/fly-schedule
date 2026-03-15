import { useQuery } from '@tanstack/react-query';
import { getTimetable } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function SubjectSelector() {
  const { currentSemesterId, selectedClassId, selectedCourseAssignmentId, setSelectedCourseAssignmentId, setSelectedTeacherId } = useScheduleStore();

  const { data } = useQuery({
    queryKey: ['timetable', currentSemesterId, selectedClassId],
    queryFn: () => getTimetable(currentSemesterId!, selectedClassId!),
    enabled: !!currentSemesterId && !!selectedClassId,
  });

  if (!selectedClassId || !data) return null;

  const { courseAssignments } = data;

  return (
    <div className="space-y-1">
      <h3 className="font-medium text-sm text-gray-500 mb-2">配課列表</h3>
      {courseAssignments.map(ca => {
        const isSelected = selectedCourseAssignmentId === ca.id;
        const isComplete = ca.scheduledPeriods >= ca.weeklyPeriods;
        return (
          <button
            key={ca.id}
            onClick={() => {
              setSelectedCourseAssignmentId(isSelected ? null : ca.id);
              setSelectedTeacherId(ca.teacherId);
            }}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between',
              isSelected ? 'ring-2 ring-primary bg-indigo-50' : 'hover:bg-gray-50',
              isComplete && 'opacity-60'
            )}
            style={isSelected ? {} : { borderLeft: `3px solid ${ca.courseColorCode}` }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: ca.courseColorCode }} />
              <span>{ca.teacherName}</span>
              <span className="text-gray-400">{ca.courseName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {isComplete && <Check className="w-3.5 h-3.5 text-green-600" />}
              <span className={cn(
                'text-xs font-mono',
                isComplete ? 'text-green-600' : 'text-orange-500'
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
