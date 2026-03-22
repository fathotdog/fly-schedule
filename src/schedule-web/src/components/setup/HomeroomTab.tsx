import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHomerooms, getClasses, getTeachers, createHomeroom, deleteHomeroom, updateHomeroom } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchSelect } from '@/components/ui/search-select';
import { Home } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';

export function HomeroomTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['homerooms'] });

  const createMut = useMutation({
    mutationFn: (vars: { teacherId: number; classId: number }) =>
      createHomeroom(currentSemesterId!, vars),
    onSettled: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; teacherId: number; classId: number }) =>
      updateHomeroom(currentSemesterId!, vars.id, { teacherId: vars.teacherId, classId: vars.classId }),
    onSettled: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHomeroom(currentSemesterId!, id),
    onSettled: invalidate,
  });

  const handleChange = (classId: number, newTeacherIdStr: string) => {
    const existing = homerooms.find(h => h.classId === classId);
    if (!newTeacherIdStr || newTeacherIdStr === '0') {
      if (existing) deleteMut.mutate(existing.id);
    } else {
      const teacherId = Number(newTeacherIdStr);
      if (existing) updateMut.mutate({ id: existing.id, teacherId, classId });
      else createMut.mutate({ teacherId, classId });
    }
  };

  const teacherItems = [
    { value: '0', label: '未指定' },
    ...teachers.map(t => ({ value: String(t.id), label: t.name, group: t.staffTitleName || '其他' })),
  ];

  const sortedClasses = [...classes].sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-TW'));

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          導師設定
        </CardTitle>
        <CardDescription>設定各班級的導師</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>班級</TableHead>
              <TableHead>導師</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClasses.map(cls => {
              const assignment = homerooms.find(h => h.classId === cls.id);
              return (
                <TableRow key={cls.id}>
                  <TableCell>{cls.displayName}</TableCell>
                  <TableCell>
                    <SearchSelect
                      value={assignment ? String(assignment.teacherId) : '0'}
                      onValueChange={(val) => handleChange(cls.id, val ?? '0')}
                      placeholder="未指定"
                      items={teacherItems}
                      className="w-40"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
