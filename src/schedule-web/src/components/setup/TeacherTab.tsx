import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, getStaffTitles, createTeacher, deleteTeacher, exportTeachersExcel, importTeachersExcel } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Trash2, Users, Download, Upload } from 'lucide-react';

export function TeacherTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [staffTitleId, setStaffTitleId] = useState(1);
  const [maxPeriods, setMaxPeriods] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const importMut = useMutation({
    mutationFn: importTeachersExcel,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      qc.invalidateQueries({ queryKey: ['staffTitles'] });
      alert(`匯入完成：新增 ${result.created} 筆、更新 ${result.updated} 筆、跳過 ${result.skipped} 筆`);
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
    e.target.value = '';
  };

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
