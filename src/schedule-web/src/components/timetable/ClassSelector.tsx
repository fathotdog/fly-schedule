import { useQuery } from '@tanstack/react-query';
import { getClasses } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Label } from '@/components/ui/label';

export function ClassSelector() {
  const { currentSemesterId, selectedClassId, setSelectedClassId } = useScheduleStore();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  return (
    <div>
      <Label className="text-xs text-gray-500 mb-1.5 block">班級</Label>
      <select
        value={selectedClassId ?? ''}
        onChange={e => setSelectedClassId(e.target.value ? +e.target.value : null)}
        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value="">選擇班級</option>
        {classes.map(c => (
          <option key={c.id} value={c.id}>{c.displayName}</option>
        ))}
      </select>
    </div>
  );
}
