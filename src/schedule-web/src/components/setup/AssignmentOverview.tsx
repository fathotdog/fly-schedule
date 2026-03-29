import { useState, useMemo } from 'react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { CourseAssignment } from '@/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { CourseDot } from '@/components/ui/course-dot';
import { Badge } from '@/components/ui/badge';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useClasses } from '@/hooks/useClasses';
import { useCourseAssignments } from '@/hooks/useCourseAssignments';

export function AssignmentOverview() {
  const { currentSemesterId } = useScheduleStore();
  const [filterClassId, setFilterClassId] = useState(0);

  const { data: classes = [] } = useClasses();
  const { data: allAssignments = [] } = useCourseAssignments();

  const filteredAssignments = filterClassId > 0
    ? allAssignments.filter(a => a.classId === filterClassId)
    : allAssignments;

  const { sortState, toggleSort, sortItems } = useTableSort<CourseAssignment>({
    columns: {
      class: (a) => a.classDisplayName,
      course: (a) => a.courseName,
      teacher: (a) => a.teacherName ?? '',
      weeklyPeriods: (a) => a.weeklyPeriods,
      scheduled: (a) => a.scheduledPeriods,
      status: (a) => a.scheduledPeriods >= a.weeklyPeriods ? 2 : a.scheduledPeriods > 0 ? 1 : 0,
    },
  });

  const classSummary = useMemo(() => classes.map(cls => {
    const classAssignments = allAssignments.filter(a => a.classId === cls.id);
    const totalPeriods = classAssignments.reduce((sum, a) => sum + a.weeklyPeriods, 0);
    const assignedPeriods = classAssignments
      .filter(a => a.teacherId !== null)
      .reduce((sum, a) => sum + a.weeklyPeriods, 0);
    return { cls, assigned: assignedPeriods, total: totalPeriods, totalPeriods };
  }), [allAssignments, classes]);

  const getBadgeStyle = (assigned: number, total: number) => {
    if (total === 0 || assigned === 0) return 'bg-surface-container text-on-surface-variant';
    if (assigned >= total) return 'bg-green-100 text-green-700';
    return 'bg-amber-100 text-amber-700';
  };

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">各班配課進度</p>
          <div className="flex flex-wrap gap-2">
            {classSummary.map(({ cls, assigned, total }) => (
              <button
                key={cls.id}
                onClick={() => setFilterClassId(filterClassId === cls.id ? 0 : cls.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  filterClassId === cls.id ? 'ring-2 ring-primary ring-offset-1' : ''
                } ${getBadgeStyle(assigned, total)}`}
              >
                {cls.displayName} {assigned}/{total}節
              </button>
            ))}
            {classSummary.length === 0 && (
              <p className="text-sm text-muted-foreground">尚無班級資料</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-end gap-4">
            <div>
              <Label>篩選班級</Label>
              <SearchSelect
                value={String(filterClassId)}
                onValueChange={val => setFilterClassId(Number(val))}
                placeholder="全部班級"
                items={[
                  { value: '0', label: '全部班級' },
                  ...classes.map(c => ({ value: String(c.id), label: c.displayName }))
                ]}
                className="w-40"
              />
            </div>
            <p className="text-sm text-muted-foreground pb-1">
              共 <span className="font-semibold text-foreground">{filteredAssignments.length}</span> 筆配課
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead columnKey="class" sortState={sortState} onToggleSort={toggleSort}>班級</SortableTableHead>
                <SortableTableHead columnKey="course" sortState={sortState} onToggleSort={toggleSort}>課程</SortableTableHead>
                <SortableTableHead columnKey="teacher" sortState={sortState} onToggleSort={toggleSort}>教師</SortableTableHead>
                <SortableTableHead columnKey="weeklyPeriods" sortState={sortState} onToggleSort={toggleSort} className="w-24">每週節數</SortableTableHead>
                <SortableTableHead columnKey="scheduled" sortState={sortState} onToggleSort={toggleSort} className="w-16">已排</SortableTableHead>
                <SortableTableHead columnKey="status" sortState={sortState} onToggleSort={toggleSort} className="w-20">狀態</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    尚無配課資料
                  </TableCell>
                </TableRow>
              ) : (
                sortItems(filteredAssignments).map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.classDisplayName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CourseDot color={a.courseColorCode} />
                        {a.courseName}
                      </div>
                    </TableCell>
                    <TableCell>{a.teacherName}</TableCell>
                    <TableCell className="text-center">{a.weeklyPeriods}</TableCell>
                    <TableCell className="text-center">{a.scheduledPeriods}</TableCell>
                    <TableCell>
                      {a.scheduledPeriods >= a.weeklyPeriods ? (
                        <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">完成</Badge>
                      ) : a.scheduledPeriods > 0 ? (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">部分</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-on-surface-variant">未排</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
