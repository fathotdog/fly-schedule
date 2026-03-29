import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getCourses, getTeachers, batchCourseAssignments, copyCourseAssignments, copyCourseAssignmentsToGrade, clearAssignmentSlots } from '@/api/client';
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
import { Save, Trash2, ClipboardCopy, Plus, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { useScheduleStore } from '@/store/useScheduleStore';
import { EMPTY_ARR } from '@/lib/constants';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';

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
  const [copyToGradeDialogOpen, setCopyToGradeDialogOpen] = useState(false);
  const [clearConfirmRow, setClearConfirmRow] = useState<AssignmentRow | null>(null);
  const newRowCounter = useRef(0);

  const { data: classes = [] } = useClasses();

  const { data: courses = EMPTY_ARR } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });

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

    const allRows = [...assignmentRows, ...emptyRows]
      .sort((a, b) => (courseMap.get(a.courseId)?.sortOrder ?? 0) - (courseMap.get(b.courseId)?.sortOrder ?? 0));
    setRows(allRows);
    setSaveResult(null);
  }, [assignments, courses, selectedClassId]);

  const batchMut = useMutation({
    mutationFn: () => {
      const upserts = rows
        .filter(r => r.dirty && !r.markedForDeletion && r.weeklyPeriods > 0)
        .map(r => ({ id: r.existingId ?? undefined, courseId: r.courseId, teacherId: r.teacherId ?? null, weeklyPeriods: r.weeklyPeriods }));
      const deleteIds = rows
        .filter(r => r.existingId !== null && (r.markedForDeletion || (r.dirty && r.weeklyPeriods === 0)))
        .map(r => r.existingId!);
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
      setCopyResult(`複製完成：新增 ${result.created} 筆、更新 ${result.updated} 筆、略過 ${result.skipped} 筆`);
    },
    onError: (err: unknown) => {
      setCopyResult(`錯誤：${getApiErrorMessage(err, '複製失敗')}`);
    },
  });

  const clearSlotsMut = useMutation({
    mutationFn: (assignmentId: number) => clearAssignmentSlots(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courseAssignments', currentSemesterId, selectedClassId] });
      qc.invalidateQueries({ queryKey: ['timetable', currentSemesterId] });
      toast.success('已清除排課');
      setClearConfirmRow(null);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, '清除排課失敗'));
    },
  });

  const copyToGradeMut = useMutation({
    mutationFn: () => copyCourseAssignmentsToGrade(currentSemesterId!, { sourceClassId: selectedClassId }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
      toast.success(`複製完成：共 ${result.targetClassCount} 個班級，新增 ${result.created} 筆、更新 ${result.updated} 筆、略過 ${result.skipped} 筆`);
      setCopyToGradeDialogOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, '複製失敗'));
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

  const removeRow = (rowKey: string) => {
    setRows(prev => prev.filter(r => r.rowKey !== rowKey));
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

  const { sortState, toggleSort, sortItems } = useTableSort<AssignmentRow>({
    columns: {
      course: (r) => r.courseName,
      weeklyPeriods: (r) => r.weeklyPeriods,
      scheduled: (r) => r.scheduledPeriods,
      teacher: (r) => r.teacherName ?? '',
      status: (r) => r.markedForDeletion ? -1 : r.teacherId !== null ? 1 : 0,
    },
  });

  const { hasPendingChanges, unassignedCount, assignedCount, assignedPeriods, unassignedPeriods } = useMemo(() => {
    let hasPendingChanges = false, unassignedCount = 0, assignedCount = 0;
    let assignedPeriods = 0, unassignedPeriods = 0;
    for (const r of rows) {
      if (r.dirty) hasPendingChanges = true;
      if (r.markedForDeletion) continue;
      if (r.teacherId === null) {
        if (r.weeklyPeriods > 0) unassignedCount++;
        unassignedPeriods += r.weeklyPeriods;
      } else {
        assignedCount++;
        assignedPeriods += r.weeklyPeriods;
      }
    }
    return { hasPendingChanges, unassignedCount, assignedCount, assignedPeriods, unassignedPeriods };
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCopyTargetClassId(0); setCopyResult(null); setCopyDialogOpen(true); }}
                >
                  <ClipboardCopy className="w-4 h-4 mr-1" />
                  複製配課到其他班
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCopyToGradeDialogOpen(true)}
                >
                  <ClipboardCopy className="w-4 h-4 mr-1" />
                  複製至同年級所有班
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClassId > 0 && (
        <div className="grid grid-cols-6 gap-3">
          {(
            [
              { label: '已配', value: assignedCount, unit: '筆', bg: 'bg-primary/8', text: 'text-primary' },
              { label: '未配教師', value: unassignedCount, unit: '筆', bg: 'bg-amber-500/10', text: 'text-amber-700' },
              { label: '合計', value: assignedCount + unassignedCount, unit: '筆', bg: 'bg-surface-container', text: 'text-on-surface' },
              { label: '已配節數', value: assignedPeriods, unit: '節', bg: 'bg-primary/8', text: 'text-primary' },
              { label: '未配節數', value: unassignedPeriods, unit: '節', bg: 'bg-amber-500/10', text: 'text-amber-700' },
              { label: '合計節數', value: assignedPeriods + unassignedPeriods, unit: '節', bg: 'bg-surface-container', text: 'text-on-surface' },
            ] as { label: string; value: number; unit: string; bg: string; text: string }[]
          ).map(({ label, value, unit, bg, text }) => (
            <div key={label} className={`rounded-xl px-4 py-3 ${bg}`}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-2xl font-bold ${text}`}>{value}<span className="text-sm font-normal ml-1">{unit}</span></p>
            </div>
          ))}
        </div>
      )}

      {selectedClassId > 0 && (
        <Card>
          <CardContent className="pt-2">
            {loadingAssignments ? (
              <p className="text-sm text-muted-foreground py-4 text-center">載入中...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead columnKey="course" sortState={sortState} onToggleSort={toggleSort}>課程</SortableTableHead>
                    <SortableTableHead columnKey="weeklyPeriods" sortState={sortState} onToggleSort={toggleSort} className="w-28">每週節數</SortableTableHead>
                    <SortableTableHead columnKey="scheduled" sortState={sortState} onToggleSort={toggleSort} className="w-16">已排</SortableTableHead>
                    <SortableTableHead columnKey="teacher" sortState={sortState} onToggleSort={toggleSort} className="w-28">教師</SortableTableHead>
                    <SortableTableHead columnKey="status" sortState={sortState} onToggleSort={toggleSort} className="w-16">狀態</SortableTableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const seenCourseIds = new Set<number>();
                    return sortItems(rows).map((row, rowIndex) => {
                      const isTeacherAssigned = row.teacherId !== null;
                      const isFirstRow = !seenCourseIds.has(row.courseId);
                      if (!row.markedForDeletion) seenCourseIds.add(row.courseId);
                      const canDelete = !isFirstRow && (courseRowCounts.get(row.courseId) ?? 0) > 1
                        && !isTeacherAssigned && row.scheduledPeriods === 0;
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
                            {row.markedForDeletion ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : row.scheduledPeriods > 0 ? (
                              <span className="text-sm text-muted-foreground" title={`已排課 ${row.scheduledPeriods} 節，無法修改`}>
                                {row.weeklyPeriods}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                value={row.weeklyPeriods || ''}
                                placeholder="0"
                                data-row-index={rowIndex}
                                onChange={e => updateRow(row.rowKey, { weeklyPeriods: +e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    document.querySelector<HTMLInputElement>(`input[data-row-index="${rowIndex + 1}"]`)?.focus();
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    document.querySelector<HTMLInputElement>(`input[data-row-index="${rowIndex - 1}"]`)?.focus();
                                  }
                                }}
                                className="w-20"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.scheduledPeriods > 0 ? row.scheduledPeriods : '—'}
                          </TableCell>
                          <TableCell>
                            {row.markedForDeletion ? (
                              <span className="text-sm text-muted-foreground">{row.teacherName ?? '—'}</span>
                            ) : (
                              <SearchSelect
                                value={row.teacherId ? String(row.teacherId) : '0'}
                                onValueChange={val => {
                                  const id = Number(val);
                                  const teacher = id > 0 ? teachers.find(t => t.id === id) : null;
                                  updateRow(row.rowKey, { teacherId: teacher?.id ?? null, teacherName: teacher?.name ?? null });
                                }}
                                placeholder="未指定"
                                items={[
                                  { value: '0', label: '未指定' },
                                  ...teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' }))
                                ]}
                                className="w-36"
                              />
                            )}
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
                              {row.existingId && !row.markedForDeletion && (
                                <button
                                  onClick={() => addRowForCourse(row.courseId)}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  title="新增同課程配課"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              {row.existingId && row.scheduledPeriods > 0 && !row.markedForDeletion && (
                                <button
                                  onClick={() => setClearConfirmRow(row)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="清除排課"
                                >
                                  <Eraser className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => row.existingId ? toggleDelete(row.rowKey) : removeRow(row.rowKey)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title={row.markedForDeletion ? '取消刪除' : '移除配課'}
                                >
                                  {row.markedForDeletion ? (
                                    <span className="text-xs underline">復原</span>
                                  ) : (
                                    <Trash2 className="w-4 h-4 inline" />
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
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

      <Dialog open={copyToGradeDialogOpen} onOpenChange={setCopyToGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>複製配課至同年級所有班</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              將目前班級的所有課程節數複製到同年級的所有其他班級，同課程覆蓋節數。已有老師或已排課的課程不會被覆蓋。
            </p>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyToGradeDialogOpen(false)}>取消</Button>
            <Button
              onClick={() => copyToGradeMut.mutate()}
              disabled={copyToGradeMut.isPending}
            >
              {copyToGradeMut.isPending ? '複製中...' : '確認複製'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearConfirmRow !== null} onOpenChange={open => { if (!open) setClearConfirmRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清除排課</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">將清除此項目所有排課</p>
            {clearConfirmRow && (
              <p className="mt-2 text-sm font-medium">
                {clearConfirmRow.courseName}
                {clearConfirmRow.teacherName && ` — ${clearConfirmRow.teacherName}`}
                （共 {clearConfirmRow.scheduledPeriods} 節）
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmRow(null)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => clearConfirmRow?.existingId && clearSlotsMut.mutate(clearConfirmRow.existingId)}
              disabled={clearSlotsMut.isPending}
            >
              {clearSlotsMut.isPending ? '清除中...' : '確認清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyDialogOpen} onOpenChange={open => { setCopyDialogOpen(open); if (!open) { setCopyResult(null); setCopyTargetClassId(0); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>複製配課到其他班</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              將目前班級的所有課程節數複製到所選班級，同課程覆蓋節數。已有老師或已排課的課程不會被覆蓋。
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
