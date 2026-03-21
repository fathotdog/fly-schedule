import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, createCourse, deleteCourse, updateCourse, exportCoursesExcel, importCoursesExcel } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, BookOpen, Download, Upload, Pencil, Check, X, Palette } from 'lucide-react';
import { COURSE_COLOR_PALETTE, getNextCourseColor, assignRandomColors } from '@/lib/constants';
import { ColorPicker } from '@/components/ui/color-picker';

export function CourseTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COURSE_COLOR_PALETTE[0]);
  const [requiresRoom, setRequiresRoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COURSE_COLOR_PALETTE[0]);
  const [editRequiresRoom, setEditRequiresRoom] = useState(false);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  useEffect(() => {
    setColor(getNextCourseColor(courses.map(c => c.colorCode)));
  }, [courses]);

  const createMut = useMutation({
    mutationFn: () => createCourse({ name, colorCode: color, requiresSpecialRoom: requiresRoom }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setName(''); /* color resets via useEffect on courses change */ },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => updateCourse(id, { name: editName, colorCode: editColor, requiresSpecialRoom: editRequiresRoom }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditingId(null); },
  });

  const startEdit = (c: { id: number; name: string; colorCode: string; requiresSpecialRoom: boolean }) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.colorCode);
    setEditRequiresRoom(c.requiresSpecialRoom);
  };

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

  const handleRandomColors = async () => {
    const assignments = assignRandomColors(courses);
    if (assignments.length === 0) return;
    await Promise.all(assignments.map(({ id, newColor }) => {
      const course = courses.find(c => c.id === id)!;
      return updateCourse(id, { name: course.name, colorCode: newColor, requiresSpecialRoom: course.requiresSpecialRoom });
    }));
    qc.invalidateQueries({ queryKey: ['courses'] });
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
            <Button variant="outline" size="sm" onClick={handleRandomColors}>
              <Palette className="w-4 h-4 mr-1" /> 隨機上色
            </Button>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <Label>課程名稱</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>顏色</Label>
              <div className="mt-1">
                <ColorPicker value={color} onChange={setColor} />
              </div>
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
                {editingId !== null && <TableHead>顏色</TableHead>}
                <TableHead>需要專科教室</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="flex items-center gap-2">
                    {editingId === c.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 w-28" />
                    ) : (
                      <>
                        <span className="w-4 h-4 rounded" style={{ backgroundColor: c.colorCode }} />
                        {c.name}
                      </>
                    )}
                  </TableCell>
                  {editingId !== null && (
                    <TableCell>
                      {editingId === c.id
                        ? <ColorPicker value={editColor} onChange={setEditColor} />
                        : null}
                    </TableCell>
                  )}
                  <TableCell>
                    {editingId === c.id
                      ? <input type="checkbox" checked={editRequiresRoom} onChange={e => setEditRequiresRoom(e.target.checked)} />
                      : (c.requiresSpecialRoom ? '是' : '否')}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {editingId === c.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMut.mutate(c.id)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
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
