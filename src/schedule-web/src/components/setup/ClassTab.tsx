import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, batchCreateClasses, deleteClass } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, School } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

export function ClassTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [gradeYear, setGradeYear] = useState(7);
  const [sections, setSections] = useState(5);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const batchMut = useMutation({
    mutationFn: () => batchCreateClasses(currentSemesterId!, { gradeYear, numberOfSections: sections }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteClass(currentSemesterId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  if (!currentSemesterId) return <p className="text-gray-500">請先選擇目前學期</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="w-5 h-5 text-primary" />
            班級管理
          </CardTitle>
          <CardDescription>批次建立或管理各年級班級</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>年級</Label>
              <select value={gradeYear} onChange={e => setGradeYear(+e.target.value)}
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={7}>七年級</option>
                <option value={8}>八年級</option>
                <option value={9}>九年級</option>
              </select>
            </div>
            <div>
              <Label>班數</Label>
              <Input type="number" min={1} max={15} value={sections}
                onChange={e => setSections(+e.target.value)} className="w-20" />
            </div>
            <Button onClick={() => batchMut.mutate()}>
              <Plus className="w-4 h-4 mr-1" /> 批次建立
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>年級</TableHead>
                <TableHead>班級</TableHead>
                <TableHead>名稱</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.gradeYear}</TableCell>
                  <TableCell>{c.section}</TableCell>
                  <TableCell>{c.displayName}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(c.id)}>
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
