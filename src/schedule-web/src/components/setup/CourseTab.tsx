import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, createCourse, deleteCourse, exportCoursesExcel, importCoursesExcel } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, BookOpen, Download, Upload } from 'lucide-react';

export function CourseTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [requiresRoom, setRequiresRoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  const createMut = useMutation({
    mutationFn: () => createCourse({ name, colorCode: color, requiresSpecialRoom: requiresRoom }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const importMut = useMutation({
    mutationFn: importCoursesExcel,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
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
            <BookOpen className="w-5 h-5 text-primary" />
            課程管理
          </CardTitle>
          <CardDescription>定義可排入課表的課程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => exportCoursesExcel()}>
              <Download className="w-4 h-4 mr-1" /> 匯出 Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> 匯入 Excel
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <Label>課程名稱</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>顏色</Label>
              <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-9 p-1" />
            </div>
            <label className="flex items-center gap-2 pb-1">
              <input type="checkbox" checked={requiresRoom} onChange={e => setRequiresRoom(e.target.checked)} />
              需要專科教室
            </label>
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
                <TableHead>名稱</TableHead>
                <TableHead>顏色</TableHead>
                <TableHead>需要專科教室</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: c.colorCode }} />
                    {c.name}
                  </TableCell>
                  <TableCell>{c.colorCode}</TableCell>
                  <TableCell>{c.requiresSpecialRoom ? '是' : '否'}</TableCell>
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
