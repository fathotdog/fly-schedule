import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getClasses, getCourses, batchCourseAssignments, copyCourseAssignments } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Trash2, AlertTriangle, ClipboardCopy } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { EMPTY_ARR } from '@/lib/constants';

interface AssignmentRow {
  rowKey: string;
  courseId: number;
  courseName: string;
  courseColorCode: string;
  existingId: number | null;
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

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: courses = EMPTY_ARR } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  const { data: assignments = EMPTY_ARR, isLoading: loadingAssignments } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId, selectedClassId],
    queryFn: () => getCourseAssignments(currentSemesterId!, selectedClassId),
    enabled: !!currentSemesterId && selectedClassId > 0,
  });

  // One row per course
  useEffect(() => {
    if (!selectedClassId || courses.length === 0) {
      setRows([]);
      return;
    }
    const newRows: AssignmentRow[] = courses.map(course => {
      const a = assignments.find(x => x.courseId === course.id);
      return {
        rowKey: a ? String(a.id) : `new-${course.id}`,
        courseId: course.id,
        courseName: course.name,
        courseColorCode: course.colorCode,
        existingId: a?.id ?? null,
        weeklyPeriods: a?.weeklyPeriods ?? 0,
        scheduledPeriods: a?.scheduledPeriods ?? 0,
        markedForDeletion: false,
        dirty: false,
      };
    });
    setRows(newRows);
    setSaveResult(null);
  }, [assignments, courses, selectedClassId]);

  const batchMut = useMutation({
    mutationFn: () => {
      const upserts = rows
        .filter(r => r.dirty && !r.markedForDeletion && r.weeklyPeriods > 0)
        .map(r => ({ id: r.existingId ?? undefined, courseId: r.courseId, teacherId: null, weeklyPeriods: r.weeklyPeriods }));
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
      setSaveResult(`錯誤：${err?.response?.data ?? '儲存失敗'}`);
    },
  });

  const copyMut = useMutation({
    mutationFn: () => copyCourseAssignments(currentSemesterId!, { sourceClassId: selectedClassId, targetClassId: copyTargetClassId }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courseAssignments', currentSemesterId, selectedClassId] });
      qc.invalidateQueries({ queryKey: ['courseAssignments', currentSemesterId, copyTargetClassId] });
      setCopyResult(`複製完成：新增 ${result.created} 筆、略過 ${result.skipped} 筆（已存在）`);
    },
    onError: (err: { response?: { data?: string } }) => {
      setCopyResult(`錯誤：${err?.response?.data ?? '複製失敗'}`);
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

  const hasPendingChanges = rows.some(r => r.dirty);
  const assignedCount = rows.filter(r => r.existingId !== null && !r.markedForDeletion).length;
  const totalPeriods = rows.filter(r => !r.markedForDeletion).reduce((sum, r) => sum + r.weeklyPeriods, 0);

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
                  ...classes.map(c => ({ value: String(c.id), label: c.displayName }))
                ]}
                className="w-40"
              />
            </div>
            {selectedClassId > 0 && (
              <div className="flex items-center gap-3 pb-1">
                <p className="text-sm text-muted-foreground">
                  已配 <span className="font-semibold text-foreground">{assignedCount}</span> / {courses.length} 門課程，共 <span className="font-semibold text-foreground">{totalPeriods}</span> 節
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
                    <TableHead className="w-16">狀態</TableHead>
                    <TableHead className="w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={row.rowKey}
                      className={row.markedForDeletion ? 'opacity-40 line-through' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: row.courseColorCode }} />
                          {row.courseName}
                        </div>
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
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
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
                    .map(c => ({ value: String(c.id), label: c.displayName }))
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
