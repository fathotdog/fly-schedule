import { useQuery } from '@tanstack/react-query';
import { getTeacherSchedule, getPeriods } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五'];

export function TeacherSchedulePanel() {
  const { currentSemesterId, selectedTeacherId } = useScheduleStore();

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

  if (!selectedTeacherId || !data) {
    return (
      <div className="text-gray-400 text-sm text-center py-8 flex flex-col items-center gap-2">
        <User className="w-8 h-8 text-gray-300" />
        <span>點擊教師名稱查看課表</span>
      </div>
    );
  }

  const getSlot = (day: number, periodId: number) =>
    data.slots.find(s => s.dayOfWeek === day && s.periodId === periodId);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-primary" />
        <h3 className="font-medium">{data.teacherName} 的課表</h3>
        <Badge variant="secondary" className="ml-auto">{data.slots.length} 節</Badge>
      </div>
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="p-1 bg-grid-header text-primary rounded"></th>
            {DAY_NAMES.map((n, i) => (
              <th key={i} className="p-1 bg-grid-header text-primary rounded">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period.id}>
              <td className="p-1 text-center bg-grid-header rounded text-primary font-medium">{period.periodNumber}</td>
              {[1, 2, 3, 4, 5].map(day => {
                const slot = getSlot(day, period.id);
                return (
                  <td key={day} className="p-1 text-center h-10 rounded border border-grid-line"
                    style={slot ? { backgroundColor: slot.courseColorCode + '20' } : {}}>
                    {slot && (
                      <div>
                        <div className="font-medium" style={{ color: slot.courseColorCode }}>{slot.courseName}</div>
                        <div className="text-gray-500">{slot.classDisplayName}</div>
                      </div>
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
