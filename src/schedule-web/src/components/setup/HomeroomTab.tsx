import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHomerooms, getClasses, getTeachers, createHomeroom, deleteHomeroom } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Home } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

export function HomeroomTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [teacherId, setTeacherId] = useState(0);
  const [classId, setClassId] = useState(0);

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

  if (!currentSemesterId) return <p className="text-gray-500">請先選擇目前學期</p>;

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
              <select value={teacherId} onChange={e => setTeacherId(+e.target.value)}
                className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={0}>選擇教師</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>班級</Label>
              <select value={classId} onChange={e => setClassId(+e.target.value)}
                className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={0}>選擇班級</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
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
                  <TableCell>{h.classDisplayName}</TableCell>
                  <TableCell>{h.teacherName}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(h.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
