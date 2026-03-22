import { useScheduleStore } from '@/store/useScheduleStore';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/ui/search-select';
import { useTeachers } from '@/hooks/useTeachers';

export function TeacherSelector() {
  const { selectedTeacherId, setSelectedTeacherId } = useScheduleStore();
  const { data: teachers = [] } = useTeachers();

  return (
    <div>
      <Label className="text-xs text-on-surface-variant mb-1.5 block">教師</Label>
      <SearchSelect
        value={selectedTeacherId !== null ? String(selectedTeacherId) : "0"}
        onValueChange={(val) => setSelectedTeacherId(val === "0" ? null : Number(val))}
        placeholder="選擇教師"
        items={[{ value: '0', label: '選擇教師' }, ...teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' }))]}
        className="w-full shadow-card"
      />
    </div>
  );
}
