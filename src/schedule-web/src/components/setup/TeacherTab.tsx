import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, getStaffTitles, createTeacher, deleteTeacher } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Users } from 'lucide-react';

export function TeacherTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [staffTitleId, setStaffTitleId] = useState(1);
  const [maxPeriods, setMaxPeriods] = useState(20);

  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
  const { data: titles = [] } = useQuery({ queryKey: ['staffTitles'], queryFn: getStaffTitles });

  const createMut = useMutation({
    mutationFn: () => createTeacher({ name, staffTitleId, maxWeeklyPeriods: maxPeriods }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            教師管理
          </CardTitle>
          <CardDescription>新增及管理教師資料</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>姓名</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>職稱</Label>
              <select value={staffTitleId} onChange={e => setStaffTitleId(+e.target.value)}
                className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                {titles.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>職稱</TableHead>
                <TableHead>每週最高節數</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.staffTitleName}</TableCell>
                  <TableCell>{t.maxWeeklyPeriods}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(t.id)}>
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
