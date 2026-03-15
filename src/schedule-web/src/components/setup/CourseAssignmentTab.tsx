import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getClasses, getCourses, getTeachers, createCourseAssignment, deleteCourseAssignment } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

export function CourseAssignmentTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [courseId, setCourseId] = useState(0);
  const [teacherId, setTeacherId] = useState(0);
  const [classId, setClassId] = useState(0);
  const [weeklyPeriods, setWeeklyPeriods] = useState(3);

  const { data: assignments = [] } = useQuery({
    queryKey: ['courseAssignments', currentSemesterId],
    queryFn: () => getCourseAssignments(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentSemesterId],
    queryFn: () => getClasses(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });

  const createMut = useMutation({
    mutationFn: () => createCourseAssignment(currentSemesterId!, { courseId, teacherId, classId, weeklyPeriods }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseAssignments'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCourseAssignment(currentSemesterId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseAssignments'] }),
  });

  if (!currentSemesterId) return <p className="text-gray-500">請先選擇目前學期</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            配課管理
          </CardTitle>
          <CardDescription>指定班級、課程與教師的對應</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <Label>班級</Label>
              <select value={classId} onChange={e => setClassId(+e.target.value)}
                className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={0}>選擇班級</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </select>
            </div>
            <div>
              <Label>課程</Label>
              <select value={courseId} onChange={e => setCourseId(+e.target.value)}
                className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={0}>選擇課程</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>教師</Label>
              <select value={teacherId} onChange={e => setTeacherId(+e.target.value)}
                className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value={0}>選擇教師</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>每週節數</Label>
              <Input type="number" min={1} max={10} value={weeklyPeriods}
                onChange={e => setWeeklyPeriods(+e.target.value)} className="w-20" />
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!courseId || !teacherId || !classId}>
              <Plus className="w-4 h-4 mr-1" /> 新增配課
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
                <TableHead>課程</TableHead>
                <TableHead>教師</TableHead>
                <TableHead>每週節數</TableHead>
                <TableHead>已排</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.classDisplayName}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: a.courseColorCode }} />
                    {a.courseName}
                  </TableCell>
                  <TableCell>{a.teacherName}</TableCell>
                  <TableCell>{a.weeklyPeriods}</TableCell>
                  <TableCell>{a.scheduledPeriods}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(a.id)}>
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
