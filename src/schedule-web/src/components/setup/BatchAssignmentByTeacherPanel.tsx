import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getClasses, getCourses, getTeachers, batchTeacherCourseAssignments } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, AlertTriangle, Plus, UserPlus } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

const EMPTY_ARR: never[] = [];

interface AssignmentRow {
  rowKey: string;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  existingId: number | null;
  classId: number;
  weeklyPeriods: number;
  scheduledPeriods: number;
  markedForDeletion: boolean;
  dirty: boolean;
}

export function BatchAssignmentByTeacherPanel() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [selectedTeacherId, setSelectedTeacherId] = useState(0);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });
  const { data: courses = EMPTY_ARR } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  const { data: assignments = EMPTY_ARR, isLoading: loadingAssignments } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, 'teacher', selectedTeacherId],
    queryFn: () => getCourseAssignments(currentSemesterId!, undefined, selectedTeacherId),
    enabled: !!currentSemesterId && selectedTeacherId > 0,
  });

  // Rebuild rows whenever assignments change
  useEffect(() => {
    if (!selectedTeacherId) {
      setRows([]);
      return;
    }
    const newRows: AssignmentRow[] = assignments.map(a => ({
      rowKey: String(a.id),
      courseId: a.courseId,
      courseName: a.courseName,
      courseColorCode: a.courseColorCode,
      existingId: a.id,
      classId: a.classId,
      weeklyPeriods: a.weeklyPeriods,
      scheduledPeriods: a.scheduledPeriods,
      markedForDeletion: false,
      dirty: false,
    }));
    setRows(newRows);
    setSaveResult(null);
  }, [assignments, selectedTeacherId]);

  const batchMut = useMutation({
    mutationFn: () => {
      const upserts = rows
        .filter(r => r.dirty && !r.markedForDeletion && r.classId > 0 && r.weeklyPeriods > 0)
        .map(r => ({ id: r.existingId ?? undefined, courseId: r.courseId, classId: r.classId, weeklyPeriods: r.weeklyPeriods }));
      const deleteIds = rows
        .filter(r => r.markedForDeletion && r.existingId !== null)
        .map(r => r.existingId!);
      return batchTeacherCourseAssignments(currentSemesterId!, { teacherId: selectedTeacherId, upserts, deleteIds });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courseAssignments'] });
      setSaveResult(`已儲存：新增 ${result.created} 筆、更新 ${result.updated} 筆、刪除 ${result.deleted} 筆`);
    },
    onError: (err: { response?: { data?: string } }) => {
      const msg = err?.response?.data ?? '儲存失敗';
      setSaveResult(`錯誤：${msg}`);
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
    const newRow: AssignmentRow = {
      rowKey: `new-${courseId}-${Math.random().toString(36).slice(2)}`,
      courseId: course.id,
      courseName: course.name,
      courseColorCode: course.colorCode,
      existingId: null,
      classId: 0,
      weeklyPeriods: 0,
      scheduledPeriods: 0,
      markedForDeletion: false,
      dirty: false,
    };
    setRows(prev => {
      let lastIdx = -1;
      prev.forEach((r, i) => { if (r.courseId === courseId) lastIdx = i; });
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newRow);
      return next;
    });
    setSaveResult(null);
  };

  const addNewCourseRow = () => {
    const newRow: AssignmentRow = {
      rowKey: `new-course-${Math.random().toString(36).slice(2)}`,
      courseId: 0,
      courseName: '',
      courseColorCode: '#cccccc',
      existingId: null,
      classId: 0,
      weeklyPeriods: 0,
      scheduledPeriods: 0,
      markedForDeletion: false,
      dirty: false,
    };
    setRows(prev => [...prev, newRow]);
    setSaveResult(null);
  };

  const setCourseForRow = (rowKey: string, courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    updateRow(rowKey, { courseId: course.id, courseName: course.name, courseColorCode: course.colorCode });
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const totalPeriods = rows.filter(r => !r.markedForDeletion).reduce((sum, r) => sum + r.weeklyPeriods, 0);
  const maxPeriods = selectedTeacher?.maxWeeklyPeriods ?? 0;
  const hasPendingChanges = rows.some(r => r.dirty);

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  const renderedCourses = new Set<number>();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div>
              <Label>選擇教師</Label>
              <SearchSelect
                value={String(selectedTeacherId)}
                onValueChange={val => { setSelectedTeacherId(Number(val)); setSaveResult(null); }}
                placeholder="選擇教師"
                items={[
                  { value: '0', label: '選擇教師' },
                  ...teachers.map(t => ({ value: String(t.id), label: t.name }))
                ]}
                className="w-40"
              />
            </div>
            {selectedTeacherId > 0 && selectedTeacher && (
              <p className="text-sm text-muted-foreground pb-1">
                已配 <span className="font-semibold text-foreground">{totalPeriods}</span> 節 / 上限 <span className="font-semibold text-foreground">{maxPeriods}</span> 節
                {totalPeriods > maxPeriods && (
                  <span className="ml-2 text-amber-600 font-medium">⚠ 超出上限</span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTeacherId > 0 && (
        <Card>
          <CardContent className="pt-2">
            {loadingAssignments ? (
              <p className="text-sm text-muted-foreground py-4 text-center">載入中...</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>課程</TableHead>
                      <TableHead>班級</TableHead>
                      <TableHead className="w-28">每週節數</TableHead>
                      <TableHead className="w-16">已排</TableHead>
                      <TableHead className="w-16">狀態</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const isNewCourseRow = row.courseId === 0;
                      const isFirstOfCourse = !isNewCourseRow && !renderedCourses.has(row.courseId);
                      if (!isNewCourseRow && isFirstOfCourse) renderedCourses.add(row.courseId);
                      const isLastOfCourse = isNewCourseRow || idx === rows.length - 1 || rows[idx + 1].courseId !== row.courseId;

                      return (
                        <TableRow
                          key={row.rowKey}
                          className={row.markedForDeletion ? 'opacity-40 line-through' : ''}
                        >
                          <TableCell>
                            {isNewCourseRow ? (
                              <SearchSelect
                                value={String(row.courseId)}
                                onValueChange={val => setCourseForRow(row.rowKey, Number(val))}
                                placeholder="選擇課程"
                                items={[
                                  { value: '0', label: '選擇課程' },
                                  ...courses.map(c => ({ value: String(c.id), label: c.name }))
                                ]}
                                className="w-36"
                              />
                            ) : isFirstOfCourse ? (
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: row.courseColorCode }} />
                                {row.courseName}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pl-5">
                                <span className="text-muted-foreground text-xs">↳</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.markedForDeletion ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <SearchSelect
                                value={String(row.classId)}
                                onValueChange={val => updateRow(row.rowKey, { classId: Number(val) })}
                                placeholder="選擇班級"
                                items={[
                                  { value: '0', label: '（未指定）' },
                                  ...classes.map(c => ({ value: String(c.id), label: c.displayName }))
                                ]}
                                className="w-32"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {row.markedForDeletion ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <Input
                                type="number"
                                min={1}
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
                          <TableCell>
                            {row.markedForDeletion ? (
                              <Badge variant="destructive" className="text-xs">待刪除</Badge>
                            ) : row.existingId ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">已配</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-on-surface-variant">未配</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!isNewCourseRow && isLastOfCourse && (
                                <button
                                  onClick={() => addRowForCourse(row.courseId)}
                                  className="text-muted-foreground hover:text-indigo-600 transition-colors"
                                  title="新增分配（同課程另一個班級）"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              )}
                              {row.existingId ? (
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
                              ) : (
                                <button
                                  onClick={() => removeRow(row.rowKey)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="移除此列"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="pt-2 px-1">
                  <button
                    onClick={addNewCourseRow}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-indigo-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新增課程
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTeacherId > 0 && (
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
    </div>
  );
}
