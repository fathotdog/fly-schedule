import { useQuery } from '@tanstack/react-query';
import { getTeacherSchedule, getPeriods } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DAY_NAMES } from '@/lib/constants';

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
      <div className="bg-surface-container-low rounded-2xl p-8 text-sm text-center flex flex-col items-center gap-2">
        <User className="w-8 h-8 text-primary/30" />
        <span className="text-on-surface-variant">點擊教師名稱查看課表</span>
      </div>
    );
  }

  const slotMap = new Map(data.slots.map(s => [`${s.dayOfWeek}-${s.periodId}`, s]));
  const getSlot = (day: number, periodId: number) => slotMap.get(`${day}-${periodId}`);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-on-surface">{data.teacherName} 的課表</h3>
        <Badge variant="secondary" className="ml-auto">{data.slots.length} 節</Badge>
      </div>
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="p-1 bg-surface-container-low text-primary rounded text-[9px] font-bold uppercase tracking-widest"></th>
            {DAY_NAMES.map((n, i) => (
              <th key={i} className="p-1 bg-surface-container-low text-primary rounded text-[9px] font-bold uppercase tracking-widest">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.filter(p => !p.isActivity).map(period => (
            <tr key={period.id}>
              <td className="p-1 text-center bg-surface-container-low rounded text-primary font-medium">{period.periodNumber}</td>
              {[1, 2, 3, 4, 5].map(day => {
                const slot = getSlot(day, period.id);
                return (
                  <td key={day} className="p-1 text-center h-10 rounded border border-outline-variant/15"
                    style={slot ? { backgroundColor: slot.courseColorCode + '20' } : {}}>
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
    </div>
  );
}
