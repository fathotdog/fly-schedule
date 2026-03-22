import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getTeachers, assignTeacher, unassignTeacher } from '@/api/client';
import { useClasses } from '@/hooks/useClasses';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { CourseDot } from '@/components/ui/course-dot';
import { Badge } from '@/components/ui/badge';
import { BookOpen, RotateCcw } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { CourseAssignment } from '@/api/types';
import { ClaimUnassignedDialog } from './ClaimUnassignedDialog';
import type { ClaimItem } from './ClaimUnassignedDialog';
import { EMPTY_ARR } from '@/lib/constants';

export function BatchAssignmentByTeacherPanel() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [selectedTeacherId, setSelectedTeacherId] = useState(0);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });

  const { data: claimedAssignments = EMPTY_ARR, isLoading: loadingClaimed } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, 'teacher', selectedTeacherId],
    queryFn: () => getCourseAssignments(currentSemesterId!, undefined, selectedTeacherId),
    enabled: !!currentSemesterId && selectedTeacherId > 0,
  });

  const { data: allAssignments = EMPTY_ARR } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId],
    queryFn: () => getCourseAssignments(currentSemesterId!),
    enabled: !!currentSemesterId && selectedTeacherId > 0,
  });

  const { data: classes = [] } = useClasses();

  const unassignedAssignments = useMemo(
    () => allAssignments.filter(a => a.teacherId === null && a.weeklyPeriods > 0),
    [allAssignments]
  );

  const claimItems: ClaimItem[] = useMemo(() => {
    const classMap = new Map(classes.map(c => [c.id, c]));
    return unassignedAssignments.map(a => ({
      id: a.id,
      courseId: a.courseId,
      courseName: a.courseName,
      courseColorCode: a.courseColorCode,
      classId: a.classId,
      classDisplayName: a.classDisplayName,
      gradeYear: classMap.get(a.classId)?.gradeYear ?? 0,
      weeklyPeriods: a.weeklyPeriods,
    }));
  }, [unassignedAssignments, classes]);

  const { sortState, toggleSort, sortItems } = useTableSort<CourseAssignment>({
    columns: {
      course: (a) => a.courseName,
      class: (a) => a.classDisplayName,
      weeklyPeriods: (a) => a.weeklyPeriods,
      scheduled: (a) => a.scheduledPeriods,
    },
  });

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);
  const totalClaimedPeriods = useMemo(() => claimedAssignments.reduce((sum, a) => sum + a.weeklyPeriods, 0), [claimedAssignments]);
  const maxPeriods = selectedTeacher?.maxWeeklyPeriods ?? 0;

  const assignMut = useMutation({
    mutationFn: (assignmentIds: number[]) =>
      assignTeacher(currentSemesterId!, { assignmentIds, teacherId: selectedTeacherId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
    },
  });

  const unassignMut = useMutation({
    mutationFn: (assignmentId: number) =>
      unassignTeacher(currentSemesterId!, { assignmentIds: [assignmentId] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
    },
  });

  const handleClaim = (items: ClaimItem[]) => {
    const ids = items.map(item => item.id);
    if (ids.length > 0) assignMut.mutate(ids);
  };

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <div className="space-y-4">
      {/* Teacher selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>選擇教師</Label>
              <SearchSelect
                value={String(selectedTeacherId)}
                onValueChange={val => setSelectedTeacherId(Number(val))}
                placeholder="選擇教師"
                items={[
                  { value: '0', label: '選擇教師' },
                  ...teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' }))
                ]}
                className="w-40"
              />
            </div>
            {selectedTeacherId > 0 && selectedTeacher && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClaimDialogOpen(true)}
                className="pb-1"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                認領待配課程 ({unassignedAssignments.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTeacherId > 0 && selectedTeacher && (() => {
        const remaining = maxPeriods - totalClaimedPeriods;
        const overLimit = remaining < 0;
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl px-4 py-3 bg-primary/8">
              <p className="text-xs text-muted-foreground mb-1">已認領節數</p>
              <p className="text-2xl font-bold text-primary">{totalClaimedPeriods}<span className="text-sm font-normal ml-1">節</span></p>
            </div>
            <div className="rounded-xl px-4 py-3 bg-surface-container">
              <p className="text-xs text-muted-foreground mb-1">上限節數</p>
              <p className="text-2xl font-bold text-on-surface">{maxPeriods}<span className="text-sm font-normal ml-1">節</span></p>
            </div>
            <div className={`rounded-xl px-4 py-3 ${overLimit ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
              <p className="text-xs text-muted-foreground mb-1">{overLimit ? '超出上限' : '剩餘節數'}</p>
              <p className={`text-2xl font-bold ${overLimit ? 'text-amber-700' : 'text-green-700'}`}>
                {Math.abs(remaining)}<span className="text-sm font-normal ml-1">節</span>
              </p>
            </div>
          </div>
        );
      })()}

      {selectedTeacherId > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              已認領課程
              <Badge variant="secondary">{claimedAssignments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingClaimed ? (
              <p className="text-sm text-muted-foreground py-4 text-center">載入中...</p>
            ) : claimedAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">尚未認領任何課程</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead columnKey="course" sortState={sortState} onToggleSort={toggleSort}>課程</SortableTableHead>
                    <SortableTableHead columnKey="class" sortState={sortState} onToggleSort={toggleSort}>班級</SortableTableHead>
                    <SortableTableHead columnKey="weeklyPeriods" sortState={sortState} onToggleSort={toggleSort} className="w-20">每週節數</SortableTableHead>
                    <SortableTableHead columnKey="scheduled" sortState={sortState} onToggleSort={toggleSort} className="w-16 text-center">已排</SortableTableHead>
                    <TableHead className="w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortItems(claimedAssignments).map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CourseDot color={a.courseColorCode} />
                          {a.courseName}
                        </div>
                      </TableCell>
                      <TableCell>{a.classDisplayName}</TableCell>
                      <TableCell>{a.weeklyPeriods}</TableCell>
                      <TableCell className="text-center">{a.scheduledPeriods > 0 ? a.scheduledPeriods : '—'}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unassignMut.mutate(a.id)}
                          disabled={unassignMut.isPending}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          退回
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ClaimUnassignedDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        items={claimItems}
        onClaim={handleClaim}
      />
    </div>
  );
}
