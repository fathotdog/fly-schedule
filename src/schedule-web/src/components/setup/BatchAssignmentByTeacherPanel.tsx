import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getTeachers, getClasses, assignTeacher, unassignTeacher } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, RotateCcw } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
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

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId && selectedTeacherId > 0,
  });

  const unassignedAssignments = useMemo(
    () => allAssignments.filter(a => a.teacherId === null),
    [allAssignments]
  );

  const claimItems: ClaimItem[] = useMemo(() => {
    const classMap = new Map(classes.map(c => [c.id, c]));
    return unassignedAssignments.map(a => ({
      courseId: a.courseId,
      courseName: a.courseName,
      courseColorCode: a.courseColorCode,
      classId: a.classId,
      classDisplayName: a.classDisplayName,
      gradeYear: classMap.get(a.classId)?.gradeYear ?? 0,
      weeklyPeriods: a.weeklyPeriods,
    }));
  }, [unassignedAssignments, classes]);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const totalClaimedPeriods = claimedAssignments.reduce((sum, a) => sum + a.weeklyPeriods, 0);
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
    const ids = items.flatMap(item =>
      unassignedAssignments
        .filter(a => a.courseId === item.courseId && a.classId === item.classId)
        .map(a => a.id)
    );
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
              <>
                <p className="text-sm text-muted-foreground pb-1">
                  已認領 <span className="font-semibold text-foreground">{totalClaimedPeriods}</span> 節 / 上限 <span className="font-semibold text-foreground">{maxPeriods}</span> 節
                  {totalClaimedPeriods > maxPeriods && (
                    <span className="ml-2 text-amber-600 font-medium">⚠ 超出上限</span>
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClaimDialogOpen(true)}
                  className="pb-1"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  認領待配課程 ({unassignedAssignments.length})
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <TableHead>課程</TableHead>
                    <TableHead>班級</TableHead>
                    <TableHead className="w-20">每週節數</TableHead>
                    <TableHead className="w-16 text-center">已排</TableHead>
                    <TableHead className="w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimedAssignments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: a.courseColorCode }} />
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
