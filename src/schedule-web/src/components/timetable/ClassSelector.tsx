import { useQuery } from '@tanstack/react-query';
import { getClasses } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/ui/search-select';

export function ClassSelector() {
  const { currentSemesterId, selectedClassId, setSelectedClassId } = useScheduleStore();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  return (
    <div>
      <Label className="text-xs text-on-surface-variant mb-1.5 block">班級</Label>
      <SearchSelect
        value={selectedClassId !== null ? String(selectedClassId) : "0"}
        onValueChange={(val) => setSelectedClassId(val === "0" ? null : Number(val))}
        placeholder="選擇班級"
        items={[{ value: '0', label: '選擇班級' }, ...classes.map(c => ({ value: String(c.id), label: c.displayName }))]}
        className="w-full shadow-card"
      />
    </div>
  );
}
