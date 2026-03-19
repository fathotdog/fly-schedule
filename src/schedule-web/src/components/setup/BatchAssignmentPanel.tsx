import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getClasses, getCourses, getTeachers, batchCourseAssignments } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, AlertTriangle, UserPlus } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

const EMPTY_ARR: never[] = [];

interface AssignmentRow {
  rowKey: string;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  existingId: number | null;
  teacherId: number;
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

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: courses = EMPTY_ARR } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });

  const { data: assignments = EMPTY_ARR, isLoading: loadingAssignments } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, selectedClassId],
    queryFn: () => getCourseAssignments(currentSemesterId!, selectedClassId),
    enabled: !!currentSemesterId && selectedClassId > 0,
  });

  // Rebuild rows whenever assignments or courses change
  useEffect(() => {
    if (!selectedClassId || courses.length === 0) {
      setRows([]);
      return;
    }
    const newRows: AssignmentRow[] = [];
    for (const course of courses) {
      const courseAssignments = assignments.filter(a => a.courseId === course.id);
      if (courseAssignments.length > 0) {
        for (const a of courseAssignments) {
          newRows.push({
            rowKey: String(a.id),
            courseId: course.id,
            courseName: course.name,
            courseColorCode: course.colorCode,
            existingId: a.id,
            teacherId: a.teacherId,
            weeklyPeriods: a.weeklyPeriods,
            scheduledPeriods: a.scheduledPeriods,
            markedForDeletion: false,
            dirty: false,
          });
        }
      } else {
        newRows.push({
          rowKey: `new-${course.id}-initial`,
          courseId: course.id,
          courseName: course.name,
          courseColorCode: course.colorCode,
          existingId: null,
          teacherId: 0,
          weeklyPeriods: 0,
          scheduledPeriods: 0,
          markedForDeletion: false,
          dirty: false,
        });
      }
    }
    setRows(newRows);
    setSaveResult(null);
  }, [assignments, courses, selectedClassId]);

  const batchMut = useMutation({
    mutationFn: () => {
      const upserts = rows
        .filter(r => r.dirty && !r.markedForDeletion && r.teacherId > 0 && r.weeklyPeriods > 0)
        .map(r => ({ id: r.existingId ?? undefined, courseId: r.courseId, teacherId: r.teacherId, weeklyPeriods: r.weeklyPeriods }));
      const deleteIds = rows
        .filter(r => r.markedForDeletion && r.existingId !== null)
        .map(r => r.existingId!);
      return batchCourseAssignments(currentSemesterId!, { classId: selectedClassId, upserts, deleteIds });
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
      teacherId: 0,
      weeklyPeriods: 0,
      scheduledPeriods: 0,
      markedForDeletion: false,
      dirty: false,
    };
    setRows(prev => {
      // Find last row index with this courseId
      let lastIdx = -1;
      prev.forEach((r, i) => { if (r.courseId === courseId) lastIdx = i; });
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newRow);
      return next;
    });
    setSaveResult(null);
  };

  const hasPendingChanges = rows.some(r => r.dirty);
  const assignedCount = new Set(rows.filter(r => r.existingId !== null && !r.markedForDeletion).map(r => r.courseId)).size;
  const totalCount = courses.length;
  const totalPeriods = rows.filter(r => !r.markedForDeletion).reduce((sum, r) => sum + r.weeklyPeriods, 0);

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  // Track which courses have already rendered their name (for grouping display)
  const renderedCourses = new Set<number>();

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
                  ...classes.map(c => ({ value: String(c.id), label: c.displayName }))
                ]}
                className="w-40"
              />
            </div>
            {selectedClassId > 0 && (
              <p className="text-sm text-muted-foreground pb-1">
                已配 <span className="font-semibold text-foreground">{assignedCount}</span> / {totalCount} 門課程，共 <span className="font-semibold text-foreground">{totalPeriods}</span> 節
              </p>
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
                    <TableHead>教師</TableHead>
                    <TableHead className="w-28">每週節數</TableHead>
                    <TableHead className="w-16">已排</TableHead>
                    <TableHead className="w-16">狀態</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const isFirstOfCourse = !renderedCourses.has(row.courseId);
                    if (isFirstOfCourse) renderedCourses.add(row.courseId);

                    // Determine if this is the last row of this course group
                    const isLastOfCourse = idx === rows.length - 1 || rows[idx + 1].courseId !== row.courseId;

                    return (
                      <TableRow
                        key={row.rowKey}
                        className={row.markedForDeletion ? 'opacity-40 line-through' : ''}
                      >
                        <TableCell>
                          {isFirstOfCourse ? (
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
                              value={String(row.teacherId)}
                              onValueChange={val => updateRow(row.rowKey, { teacherId: Number(val) })}
                              placeholder="選擇教師"
                              items={[
                                { value: '0', label: '（未指定）' },
                                ...teachers.map(t => ({ value: String(t.id), label: t.name }))
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
                            {isLastOfCourse && (
                              <button
                                onClick={() => addRowForCourse(row.courseId)}
                                className="text-muted-foreground hover:text-indigo-600 transition-colors"
                                title="新增分配（同課程另一位教師）"
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
                            ) : !isLastOfCourse || rows.filter(r => r.courseId === row.courseId).length > 1 ? (
                              <button
                                onClick={() => removeRow(row.rowKey)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="移除此列"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : null}
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
    </div>
  );
}
