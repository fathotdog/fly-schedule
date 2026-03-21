import { useScheduleStore } from '@/store/useScheduleStore';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/ui/search-select';
import { useClasses } from '@/hooks/useClasses';

export function ClassSelector() {
  const { selectedClassId, setSelectedClassId } = useScheduleStore();
  const { data: classes = [] } = useClasses();

  return (
    <div>
      <Label className="text-xs text-on-surface-variant mb-1.5 block">班級</Label>
      <SearchSelect
        value={selectedClassId !== null ? String(selectedClassId) : "0"}
        onValueChange={(val) => setSelectedClassId(val === "0" ? null : Number(val))}
        placeholder="選擇班級"
        items={[{ value: '0', label: '選擇班級' }, ...classes.map(c => ({ value: String(c.id), label: c.displayName, group: `${c.gradeYear} 年級` }))]}
        className="w-full shadow-card"
      />
    </div>
  );
}
