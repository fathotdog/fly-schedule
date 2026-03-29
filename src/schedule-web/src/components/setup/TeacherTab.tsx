import { useRef, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, getStaffTitles, createTeacher, deleteTeacher, updateTeacher, exportTeachersExcel, importTeachersExcel, getCourseAssignments } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Download, Upload, Pencil, Check, X, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { Teacher } from '@/api/types';

export function TeacherTab() {
  const qc = useQueryClient();
  const currentSemesterId = useScheduleStore(s => s.currentSemesterId);
  const [name, setName] = useState('');
  const [staffTitleId, setStaffTitleId] = useState(1);
  const [maxPeriods, setMaxPeriods] = useState(20);
  const [teacherToDelete, setTeacherToDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editStaffTitleId, setEditStaffTitleId] = useState(1);
  const [editMaxPeriods, setEditMaxPeriods] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: teachers = [], isLoading } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
  const { data: titles = [] } = useQuery({ queryKey: ['staffTitles'], queryFn: getStaffTitles });
  const { data: assignments = [] } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId],
    queryFn: () => getCourseAssignments(currentSemesterId!),
    enabled: currentSemesterId !== null,
  });

  const assignmentsByTeacher = useMemo(() =>
    assignments.reduce<Record<number, { totalPeriods: number; courses: Set<string>; classes: Set<string> }>>(
      (acc, a) => {
        if (a.teacherId === null) return acc;
        if (!acc[a.teacherId]) acc[a.teacherId] = { totalPeriods: 0, courses: new Set(), classes: new Set() };
        acc[a.teacherId].totalPeriods += a.weeklyPeriods;
        acc[a.teacherId].courses.add(a.courseName);
        acc[a.teacherId].classes.add(a.classDisplayName);
        return acc;
      },
      {}
    ), [assignments]);

  const sortColumns = useMemo(() => ({
    name: (t: Teacher) => t.name,
    staffTitle: (t: Teacher) => t.staffTitleName ?? '',
    maxPeriods: (t: Teacher) => t.maxWeeklyPeriods,
    assigned: (t: Teacher) => assignmentsByTeacher[t.id]?.totalPeriods ?? 0,
    courses: (t: Teacher) => assignmentsByTeacher[t.id] ? [...assignmentsByTeacher[t.id].courses].join('、') : '',
    classes: (t: Teacher) => assignmentsByTeacher[t.id] ? [...assignmentsByTeacher[t.id].classes].join('、') : '',
  }), [assignmentsByTeacher]);

  const { sortState, toggleSort, sortItems } = useTableSort<Teacher>({ columns: sortColumns });

  const teacherStats = useMemo(() => {
    const totalCapacity = teachers.reduce((sum, t) => sum + t.maxWeeklyPeriods, 0);
    const totalAssigned = teachers.reduce((sum, t) => sum + (assignmentsByTeacher[t.id]?.totalPeriods ?? 0), 0);
    return { totalCapacity, totalAssigned, totalUnassigned: totalCapacity - totalAssigned };
  }, [teachers, assignmentsByTeacher]);

  const createMut = useMutation({
    mutationFn: () => createTeacher({ name, staffTitleId, maxWeeklyPeriods: maxPeriods }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setTeacherToDelete(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => updateTeacher(id, { name: editName, staffTitleId: editStaffTitleId, maxWeeklyPeriods: editMaxPeriods }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setEditingId(null); },
  });

  const startEdit = (t: { id: number; name: string; staffTitleId: number; maxWeeklyPeriods: number }) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditStaffTitleId(t.staffTitleId);
    setEditMaxPeriods(t.maxWeeklyPeriods);
  };

  const importMut = useMutation({
    mutationFn: importTeachersExcel,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      qc.invalidateQueries({ queryKey: ['staffTitles'] });
      toast.success(`匯入完成：新增 ${result.created} 筆、更新 ${result.updated} 筆、跳過 ${result.skipped} 筆`);
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
    e.target.value = '';
  };

  const teacherToDeleteName = teachers.find(t => t.id === teacherToDelete)?.name;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            教師管理
          </CardTitle>
          <CardDescription>新增及管理教師資料</CardDescription>
          <CardAction>
            <div className="flex gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 bg-primary/8 text-primary rounded-xl px-3 py-2">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm font-bold font-manrope">{teachers.length}</span>
                <span className="text-xs opacity-70">位</span>
              </div>
              <div className="flex items-center gap-1.5 bg-tertiary/8 text-tertiary rounded-xl px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm font-bold font-manrope">
                  {currentSemesterId !== null ? teacherStats.totalAssigned : '—'}
                </span>
                <span className="text-xs opacity-70">節已配</span>
              </div>
              <div className="flex items-center gap-1.5 bg-warning/8 text-warning rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm font-bold font-manrope">
                  {currentSemesterId !== null ? teacherStats.totalUnassigned : '—'}
                </span>
                <span className="text-xs opacity-70">節未配</span>
              </div>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => exportTeachersExcel()}>
              <Download className="w-4 h-4 mr-1" /> 匯出 Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> 匯入 Excel
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <Label>姓名</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>職稱</Label>
              <Select value={String(staffTitleId)} onValueChange={(val) => setStaffTitleId(Number(val))} items={titles.map(t => ({ value: String(t.id), label: t.name }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {titles.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>每週最高節數</Label>
              <Input type="number" value={maxPeriods} onChange={e => setMaxPeriods(+e.target.value)} className="w-24" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!name}>
              <Plus className="w-4 h-4 mr-1" /> 新增
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>尚無教師資料，請新增教師</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead columnKey="name" sortState={sortState} onToggleSort={toggleSort} className="w-24">姓名</SortableTableHead>
                  <SortableTableHead columnKey="staffTitle" sortState={sortState} onToggleSort={toggleSort} className="w-20">職稱</SortableTableHead>
                  <SortableTableHead columnKey="maxPeriods" sortState={sortState} onToggleSort={toggleSort} className="w-20">每週最高節數</SortableTableHead>
                  <SortableTableHead columnKey="assigned" sortState={sortState} onToggleSort={toggleSort} className="w-16">已配節數</SortableTableHead>
                  <SortableTableHead columnKey="courses" sortState={sortState} onToggleSort={toggleSort} className="w-56">課程</SortableTableHead>
                  <SortableTableHead columnKey="classes" sortState={sortState} onToggleSort={toggleSort} className="w-56">班級</SortableTableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortItems(teachers).map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {editingId === t.id
                        ? <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 w-28" />
                        : t.name}
                    </TableCell>
                    <TableCell>
                      {editingId === t.id ? (
                        <Select value={String(editStaffTitleId)} onValueChange={val => setEditStaffTitleId(Number(val))} items={titles.map(st => ({ value: String(st.id), label: st.name }))}>
                          <SelectTrigger className="h-7 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {titles.map(st => <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : t.staffTitleName}
                    </TableCell>
                    <TableCell>
                      {editingId === t.id
                        ? <Input type="number" value={editMaxPeriods} onChange={e => setEditMaxPeriods(+e.target.value)} className="h-7 w-20" />
                        : t.maxWeeklyPeriods}
                    </TableCell>
                    {(() => {
                      if (currentSemesterId === null) return (
                        <>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                        </>
                      );
                      const info = assignmentsByTeacher[t.id];
                      const total = info?.totalPeriods ?? 0;
                      const overLimit = total > t.maxWeeklyPeriods;
                      return (
                        <>
                          <TableCell className={overLimit ? 'text-destructive font-medium' : ''}>{total}</TableCell>
                          <TableCell>
                            <div className="max-w-[210px] truncate" title={info ? [...info.courses].join('、') : ''}>
                              {info ? [...info.courses].join('、') : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[210px] truncate" title={info ? [...info.classes].join('、') : ''}>
                              {info ? [...info.classes].join('、') : '—'}
                            </div>
                          </TableCell>
                        </>
                      );
                    })()}
                    <TableCell className="flex gap-1">
                      {editingId === t.id ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMut.mutate(t.id)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setTeacherToDelete(t.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={teacherToDelete !== null} onOpenChange={(open) => { if (!open) setTeacherToDelete(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除教師「{teacherToDeleteName}」嗎？此操作無法復原，相關配課資料也將一併刪除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => teacherToDelete !== null && deleteMut.mutate(teacherToDelete)}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
