import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getCourses, batchCourseAssignments, copyCourseAssignments } from '@/api/client';
import { getApiErrorMessage } from '@/api/errors';
import { useClasses } from '@/hooks/useClasses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { CourseDot } from '@/components/ui/course-dot';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Trash2, AlertTriangle, ClipboardCopy, Plus } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { EMPTY_ARR } from '@/lib/constants';

interface AssignmentRow {
  rowKey: string;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  existingId: number | null;
  teacherId: number | null;
  teacherName: string | null;
  weeklyPeriods: number;
  scheduledPeriods: number;
  markedForDeletion: boolean;
  dirty: boolean;
}

export function BatchAssignmentPanel() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [selectedClassId, setSelectedClassId] = useState(0);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetClassId, setCopyTargetClassId] = useState(0);
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const newRowCounter = useRef(0);

  const { data: classes = [] } = useClasses();

  const { data: courses = EMPTY_ARR } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  const { data: assignments = EMPTY_ARR, isLoading: loadingAssignments } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, selectedClassId],
    queryFn: () => getCourseAssignments(currentSemesterId!, selectedClassId),
    enabled: !!currentSemesterId && selectedClassId > 0,
  });

  useEffect(() => {
    if (!selectedClassId || courses.length === 0) {
      setRows([]);
      return;
    }

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const assignmentRows: AssignmentRow[] = assignments.map(a => ({
      rowKey: String(a.id),
      courseId: a.courseId,
      courseName: a.courseName,
      courseColorCode: courseMap.get(a.courseId)?.colorCode ?? '#888',
      existingId: a.id,
      teacherId: a.teacherId ?? null,
      teacherName: a.teacherName ?? null,
      weeklyPeriods: a.weeklyPeriods,
      scheduledPeriods: a.scheduledPeriods,
      markedForDeletion: false,
      dirty: false,
    }));

    const assignedCourseIds = new Set(assignments.map(a => a.courseId));
    const emptyRows: AssignmentRow[] = courses
      .filter(c => !assignedCourseIds.has(c.id))
      .map(c => ({
        rowKey: `new-${c.id}-0`,
        courseId: c.id,
        courseName: c.name,
        courseColorCode: c.colorCode,
        existingId: null,
        teacherId: null,
        teacherName: null,
        weeklyPeriods: 0,
        scheduledPeriods: 0,
        markedForDeletion: false,
        dirty: false,
      }));

    const allRows = [...assignmentRows, ...emptyRows].sort((a, b) =>
      a.courseName.localeCompare(b.courseName, 'zh-TW')
    );
    setRows(allRows);
    setSaveResult(null);
  }, [assignments, courses, selectedClassId]);

  const batchMut = useMutation({
    mutationFn: () => {
      const upserts = rows
        .filter(r => r.dirty && !r.markedForDeletion && r.teacherId === null && (r.existingId !== null || r.weeklyPeriods > 0))
        .map(r => ({ id: r.existingId ?? undefined, courseId: r.courseId, teacherId: null, weeklyPeriods: r.weeklyPeriods }));
      const deleteIds = rows.filter(r => r.markedForDeletion && r.existingId !== null).map(r => r.existingId!);
      return batchCourseAssignments(currentSemesterId!, { classId: selectedClassId, upserts, deleteIds });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
      setSaveResult(`已儲存：新增 ${result.created} 筆、更新 ${result.updated} 筆、刪除 ${result.deleted} 筆`);
    },
    onError: (err: unknown) => {
      setSaveResult(`錯誤：${getApiErrorMessage(err, '儲存失敗')}`);
    },
  });

  const copyMut = useMutation({
    mutationFn: () => copyCourseAssignments(currentSemesterId!, { sourceClassId: selectedClassId, targetClassId: copyTargetClassId }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courseAssignments', currentSemesterId, selectedClassId] });
      qc.invalidateQueries({ queryKey: ['courseAssignments', currentSemesterId, copyTargetClassId] });
      setCopyResult(`複製完成：新增 ${result.created} 筆、略過 ${result.skipped} 筆（已存在）`);
    },
    onError: (err: unknown) => {
      setCopyResult(`錯誤：${getApiErrorMessage(err, '複製失敗')}`);
    },
  });

  const updateRow = (rowKey: string, patch: Partial<AssignmentRow>) => {
    setRows(prev => prev.map(r => r.rowKey === rowKey ? { ...r, ...patch, dirty: true } : r));
    setSaveResult(null);
  };

  const toggleDelete = (rowKey: string) => {
    setRows(prev => prev.map(r =>
      r.rowKey === rowKey ? { ...r, markedForDeletion: !r.markedForDeletion, dirty: true } : r
    ));
    setSaveResult(null);
  };

  const addRowForCourse = (courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const key = `new-${courseId}-${++newRowCounter.current}`;
    const newRow: AssignmentRow = {
      rowKey: key,
      courseId,
      courseName: course.name,
      courseColorCode: course.colorCode,
      existingId: null,
      teacherId: null,
      teacherName: null,
      weeklyPeriods: 0,
      scheduledPeriods: 0,
      markedForDeletion: false,
      dirty: false,
    };
    setRows(prev => {
      // Insert after the last row for this course
      const lastIdx = prev.map((r, i) => ({ r, i })).filter(({ r }) => r.courseId === courseId).at(-1)?.i ?? prev.length - 1;
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newRow);
      return next;
    });
    setSaveResult(null);
  };

  const courseRowCounts = useMemo(() => {
    const counts = new Map<number, number>();
    rows.forEach(r => {
      if (!r.markedForDeletion) counts.set(r.courseId, (counts.get(r.courseId) ?? 0) + 1);
    });
    return counts;
  }, [rows]);

  const { hasPendingChanges, unassignedCount, assignedCount, totalPeriods } = useMemo(() => {
    let hasPendingChanges = false, unassignedCount = 0, assignedCount = 0, totalPeriods = 0;
    for (const r of rows) {
      if (r.dirty) hasPendingChanges = true;
      if (r.markedForDeletion) continue;
      if (r.teacherId === null) {
        if (r.existingId !== null) unassignedCount++;
        totalPeriods += r.weeklyPeriods;
      } else {
        assignedCount++;
      }
    }
    return { hasPendingChanges, unassignedCount, assignedCount, totalPeriods };
  }, [rows]);

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div>
              <Label>選擇班級</Label>
              <SearchSelect
                value={String(selectedClassId)}
                onValueChange={val => { setSelectedClassId(Number(val)); setSaveResult(null); }}
                placeholder="選擇班級"
                items={[
                  { value: '0', label: '選擇班級' },
                  ...classes.map(c => ({ value: String(c.id), label: c.displayName, group: `${c.gradeYear} 年級` }))
                ]}
                className="w-40"
              />
            </div>
            {selectedClassId > 0 && (
              <div className="flex items-center gap-3 pb-1">
                <p className="text-sm text-muted-foreground">
                  未配 <span className="font-semibold text-foreground">{unassignedCount}</span> 筆 ·
                  已配教師 <span className="font-semibold text-foreground">{assignedCount}</span> 筆 ·
                  共 <span className="font-semibold text-foreground">{totalPeriods}</span> 節（未配）
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCopyTargetClassId(0); setCopyResult(null); setCopyDialogOpen(true); }}
                >
                  <ClipboardCopy className="w-4 h-4 mr-1" />
                  複製配課到其他班
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClassId > 0 && (
        <Card>
          <CardContent className="pt-2">
            {loadingAssignments ? (
              <p className="text-sm text-muted-foreground py-4 text-center">載入中...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>課程</TableHead>
                    <TableHead className="w-28">每週節數</TableHead>
                    <TableHead className="w-16">已排</TableHead>
                    <TableHead className="w-28">教師</TableHead>
                    <TableHead className="w-16">狀態</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => {
                    const isTeacherAssigned = row.teacherId !== null;
                    return (
                      <TableRow
                        key={row.rowKey}
                        className={row.markedForDeletion ? 'opacity-40 line-through' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CourseDot color={row.courseColorCode} />
                            {row.courseName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.markedForDeletion || isTeacherAssigned ? (
                            <span className="text-sm text-muted-foreground">{isTeacherAssigned ? row.weeklyPeriods : '—'}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              value={row.weeklyPeriods || ''}
                              placeholder="0"
                              onChange={e => updateRow(row.rowKey, { weeklyPeriods: +e.target.value })}
                              className="w-20"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.scheduledPeriods > 0 ? row.scheduledPeriods : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.teacherName ?? '—'}
                        </TableCell>
                        <TableCell>
                          {row.markedForDeletion ? (
                            <Badge variant="destructive" className="text-xs">待刪除</Badge>
                          ) : isTeacherAssigned ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">已配</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-on-surface-variant">未配</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!isTeacherAssigned && row.existingId && !row.markedForDeletion && (
                              <button
                                onClick={() => addRowForCourse(row.courseId)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                title="新增同課程配課"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                            {!isTeacherAssigned && row.existingId && (courseRowCounts.get(row.courseId) ?? 0) > 1 && (
                              <button
                                onClick={() => toggleDelete(row.rowKey)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title={row.markedForDeletion ? '取消刪除' : '移除配課'}
                              >
                                {row.markedForDeletion ? (
                                  <span className="text-xs underline">復原</span>
                                ) : (
                                  <>
                                    {row.scheduledPeriods > 0 && (
                                      <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                                    )}
                                    <Trash2 className="w-4 h-4 inline" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClassId > 0 && (
        <div className="flex items-center gap-4">
          <Button
            onClick={() => batchMut.mutate()}
            disabled={!hasPendingChanges || batchMut.isPending}
          >
            <Save className="w-4 h-4 mr-1" />
            {batchMut.isPending ? '儲存中...' : '儲存配課'}
          </Button>
          {saveResult && (
            <p className={`text-sm ${saveResult.startsWith('錯誤') ? 'text-destructive' : 'text-green-600'}`}>
              {saveResult}
            </p>
          )}
        </div>
      )}

      <Dialog open={copyDialogOpen} onOpenChange={open => { setCopyDialogOpen(open); if (!open) { setCopyResult(null); setCopyTargetClassId(0); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>複製配課到其他班</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              將目前班級的所有課程節數複製到所選班級，已存在的相同課程將自動略過。
            </p>
            <div>
              <Label>目標班級</Label>
              <SearchSelect
                value={String(copyTargetClassId)}
                onValueChange={val => { setCopyTargetClassId(Number(val)); setCopyResult(null); }}
                placeholder="選擇目標班級"
                items={[
                  { value: '0', label: '選擇目標班級' },
                  ...classes
                    .filter(c => c.id !== selectedClassId)
                    .map(c => ({ value: String(c.id), label: c.displayName, group: `${c.gradeYear} 年級` }))
                ]}
                className="w-48 mt-1"
              />
            </div>
            {copyResult && (
              <p className={`text-sm ${copyResult.startsWith('錯誤') ? 'text-destructive' : 'text-green-600'}`}>
                {copyResult}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>取消</Button>
            <Button
              onClick={() => copyMut.mutate()}
              disabled={copyTargetClassId === 0 || copyMut.isPending}
            >
              {copyMut.isPending ? '複製中...' : '確認複製'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
