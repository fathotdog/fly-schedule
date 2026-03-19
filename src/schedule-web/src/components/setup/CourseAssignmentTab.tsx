import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourseAssignments, getClasses, getCourses, getTeachers, createCourseAssignment, deleteCourseAssignment } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { BatchAssignmentPanel } from './BatchAssignmentPanel';
import { BatchAssignmentByTeacherPanel } from './BatchAssignmentByTeacherPanel';
import { AssignmentOverview } from './AssignmentOverview';

function SingleAssignmentPanel() {
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

  const classPeriodSummary = assignments.reduce((acc, a) => {
    acc[a.classId] = (acc[a.classId] || 0) + a.weeklyPeriods;
    return acc;
  }, {} as Record<number, number>);

  const createMut = useMutation({
    mutationFn: () => createCourseAssignment(currentSemesterId!, { courseId, teacherId, classId, weeklyPeriods }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseAssignments'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCourseAssignment(currentSemesterId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseAssignments'] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end flex-wrap">
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
            <div>
              <Label>課程</Label>
              <SearchSelect
                value={String(courseId)}
                onValueChange={(val) => setCourseId(Number(val))}
                placeholder="選擇課程"
                items={[{ value: '0', label: '選擇課程' }, ...courses.map(c => ({ value: String(c.id), label: c.name }))]}
                className="w-36"
              />
            </div>
            <div>
              <Label>教師</Label>
              <SearchSelect
                value={String(teacherId)}
                onValueChange={(val) => setTeacherId(Number(val))}
                placeholder="選擇教師"
                items={[{ value: '0', label: '選擇教師' }, ...teachers.map(t => ({ value: String(t.id), label: t.name }))]}
                className="w-36"
              />
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
          {Object.keys(classPeriodSummary).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-2 pt-2">
              {Object.entries(classPeriodSummary).map(([cid, periods]) => {
                const cls = classes.find(c => c.id === Number(cid));
                return cls ? (
                  <span key={cid} className="px-2 py-0.5 rounded bg-muted text-xs">
                    {cls.displayName}: {periods}節
                  </span>
                ) : null;
              })}
            </div>
          )}
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

export function CourseAssignmentTab() {
  const { currentSemesterId } = useScheduleStore();
  const [activeTab, setActiveTab] = useState<'batch' | 'batch-teacher' | 'single' | 'overview'>('batch');

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            配課管理
          </CardTitle>
          <CardDescription>指定班級、課程與教師的對應</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('batch')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            activeTab === 'batch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}>逐班配課</button>
        <button onClick={() => setActiveTab('batch-teacher')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            activeTab === 'batch-teacher' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}>逐師配課</button>
        <button onClick={() => setActiveTab('single')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            activeTab === 'single' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}>逐筆新增</button>
        <button onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}>配課總覽</button>
      </div>

      {activeTab === 'batch' && <BatchAssignmentPanel />}
      {activeTab === 'batch-teacher' && <BatchAssignmentByTeacherPanel />}
      {activeTab === 'single' && <SingleAssignmentPanel />}
      {activeTab === 'overview' && <AssignmentOverview />}
    </div>
  );
}
