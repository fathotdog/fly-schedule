import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchSelect } from '@/components/ui/search-select';

export interface ClaimItem {
  courseId: number;
  courseName: string;
  courseColorCode: string;
  classId: number;
  classDisplayName: string;
  gradeYear: number;
  weeklyPeriods: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ClaimItem[];
  onClaim: (items: ClaimItem[]) => void;
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="rounded accent-primary cursor-pointer"
    />
  );
}

export function ClaimUnassignedDialog({ open, onOpenChange, items, onClaim }: Props) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filterCourseId, setFilterCourseId] = useState(0);
  const [filterGrade, setFilterGrade] = useState(0);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedKeys(new Set());
      setFilterCourseId(0);
      setFilterGrade(0);
    }
  }, [open]);

  const grades = useMemo(() => {
    const s = new Set<number>();
    items.forEach(i => s.add(i.gradeYear));
    return [...s].sort((a, b) => a - b);
  }, [items]);

  const courseOptions = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach(i => map.set(i.courseId, i.courseName));
    return [
      { value: '0', label: '全部課程' },
      ...[...map.entries()].map(([id, name]) => ({ value: String(id), label: name })),
    ];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterCourseId > 0 && i.courseId !== filterCourseId) return false;
      if (filterGrade > 0 && i.gradeYear !== filterGrade) return false;
      return true;
    });
  }, [items, filterCourseId, filterGrade]);

  const groups = useMemo(() => {
    const map = new Map<number, {
      courseId: number;
      courseName: string;
      courseColorCode: string;
      items: ClaimItem[];
    }>();
    for (const item of filtered) {
      if (!map.has(item.courseId)) {
        map.set(item.courseId, {
          courseId: item.courseId,
          courseName: item.courseName,
          courseColorCode: item.courseColorCode,
          items: [],
        });
      }
      map.get(item.courseId)!.items.push(item);
    }
    return [...map.values()];
  }, [filtered]);

  const itemKey = (item: ClaimItem) => `${item.courseId}-${item.classId}`;

  const toggleItem = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (courseId: number) => {
    const group = groups.find(g => g.courseId === courseId);
    if (!group) return;
    const keys = group.items.map(i => itemKey(i));
    const allSelected = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleConfirm = () => {
    const claimed = items.filter(i => selectedKeys.has(itemKey(i)));
    onClaim(claimed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>認領待配課程</DialogTitle>
        </DialogHeader>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <SearchSelect
            value={String(filterCourseId)}
            onValueChange={v => setFilterCourseId(Number(v))}
            placeholder="篩選課程"
            items={courseOptions}
            className="w-36"
          />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterGrade(0)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${filterGrade === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}
            >
              全部年級
            </button>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setFilterGrade(filterGrade === g ? 0 : g)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${filterGrade === g ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}
              >
                {g} 年級
              </button>
            ))}
          </div>
        </div>

        {/* Grouped table */}
        <div className="max-h-96 overflow-y-auto rounded-lg border">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">沒有符合條件的待配課程</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="text-left p-2 font-medium text-muted-foreground">課程 / 班級</th>
                  <th className="text-right p-2 pr-4 font-medium text-muted-foreground w-24">待配節數</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => {
                  const keys = group.items.map(i => itemKey(i));
                  const allSelected = keys.every(k => selectedKeys.has(k));
                  const someSelected = keys.some(k => selectedKeys.has(k));
                  return (
                    <>
                      <tr key={`group-${group.courseId}`} className="bg-muted/30">
                        <td className="p-2 text-center">
                          <IndeterminateCheckbox
                            checked={allSelected}
                            indeterminate={!allSelected && someSelected}
                            onChange={() => toggleGroup(group.courseId)}
                          />
                        </td>
                        <td className="p-2 font-medium" colSpan={2}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: group.courseColorCode }}
                            />
                            {group.courseName}
                            <span className="text-xs text-muted-foreground font-normal">
                              {group.items.length} 班
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.items.map(item => {
                        const key = itemKey(item);
                        return (
                          <tr
                            key={key}
                            className="hover:bg-muted/20 cursor-pointer"
                            onClick={() => toggleItem(key)}
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(key)}
                                onChange={() => toggleItem(key)}
                                onClick={e => e.stopPropagation()}
                                className="rounded accent-primary cursor-pointer"
                              />
                            </td>
                            <td className="p-2 pl-8 text-muted-foreground">
                              {item.classDisplayName}
                            </td>
                            <td className="p-2 pr-4 text-right tabular-nums">
                              {item.weeklyPeriods}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <span className="text-sm text-muted-foreground self-center mr-auto">
            已選 <span className="font-semibold text-foreground">{selectedKeys.size}</span> 筆
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedKeys.size === 0}>
            確認認領
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
