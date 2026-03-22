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
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { SchoolClass } from '@/api/types';

export function ClassTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [gradeYear, setGradeYear] = useState(1);
  const [sections, setSections] = useState(5);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { sortState, toggleSort, sortItems } = useTableSort<SchoolClass>({
    columns: {
      gradeYear: (c) => c.gradeYear,
      section: (c) => c.section,
      displayName: (c) => c.displayName,
    },
  });

  const batchMut = useMutation({
    mutationFn: () => batchCreateClasses(currentSemesterId!, { gradeYear, numberOfSections: sections }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteClass(currentSemesterId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

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
                <option value={1}>一年級</option>
                <option value={2}>二年級</option>
                <option value={3}>三年級</option>
                <option value={4}>四年級</option>
                <option value={5}>五年級</option>
                <option value={6}>六年級</option>
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
                <SortableTableHead columnKey="gradeYear" sortState={sortState} onToggleSort={toggleSort}>年級</SortableTableHead>
                <SortableTableHead columnKey="section" sortState={sortState} onToggleSort={toggleSort}>班級</SortableTableHead>
                <SortableTableHead columnKey="displayName" sortState={sortState} onToggleSort={toggleSort}>名稱</SortableTableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortItems(classes).map(c => (
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
