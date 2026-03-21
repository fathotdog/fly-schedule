import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHomerooms, getClasses, getTeachers, createHomeroom, deleteHomeroom, updateHomeroom } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Plus, Trash2, Home, Pencil, Check, X } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

export function HomeroomTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [teacherId, setTeacherId] = useState(0);
  const [classId, setClassId] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTeacherId, setEditTeacherId] = useState(0);
  const [editClassId, setEditClassId] = useState(0);

  const { data: homerooms = [] } = useQuery({
    queryKey: ['homerooms', currentSemesterId],
    queryFn: () => getHomerooms(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });

  const createMut = useMutation({
    mutationFn: () => createHomeroom(currentSemesterId!, { teacherId, classId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homerooms'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHomeroom(currentSemesterId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homerooms'] }),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => updateHomeroom(currentSemesterId!, id, { teacherId: editTeacherId, classId: editClassId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homerooms'] });
      setEditingId(null);
    },
  });

  const startEdit = (h: typeof homerooms[0]) => {
    setEditingId(h.id);
    setEditTeacherId(h.teacherId);
    setEditClassId(h.classId);
  };

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            導師設定
          </CardTitle>
          <CardDescription>設定各班級的導師</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>教師</Label>
              <SearchSelect
                value={String(teacherId)}
                onValueChange={(val) => setTeacherId(Number(val))}
                placeholder="選擇教師"
                items={[{ value: '0', label: '選擇教師' }, ...teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' }))]}
                className="w-36"
              />
            </div>
            <div>
              <Label>班級</Label>
              <SearchSelect
                value={String(classId)}
                onValueChange={(val) => setClassId(Number(val))}
                placeholder="選擇班級"
                items={[{ value: '0', label: '選擇班級' }, ...classes.map(c => ({ value: String(c.id), label: c.displayName }))]}
                className="w-36"
              />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!teacherId || !classId}>
              <Plus className="w-4 h-4 mr-1" /> 指定導師
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班級</TableHead>
                <TableHead>導師</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homerooms.map(h => (
                <TableRow key={h.id}>
                  {editingId === h.id ? (
                    <>
                      <TableCell>
                        <SearchSelect
                          value={String(editClassId)}
                          onValueChange={(val) => setEditClassId(Number(val))}
                          placeholder="選擇班級"
                          items={classes.map(c => ({ value: String(c.id), label: c.displayName }))}
                          className="w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <SearchSelect
                          value={String(editTeacherId)}
                          onValueChange={(val) => setEditTeacherId(Number(val))}
                          placeholder="選擇教師"
                          items={teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' }))}
                          className="w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => updateMut.mutate(h.id)} disabled={!editTeacherId || !editClassId}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{h.classDisplayName}</TableCell>
                      <TableCell>{h.teacherName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(h)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate(h.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
