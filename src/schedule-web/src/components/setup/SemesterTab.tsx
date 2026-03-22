import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSemesters, createSemester, updateSemester, deleteSemester, setCurrentSemester } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Star, Calendar, Pencil, Check, X } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/api/errors';

export function SemesterTab() {
  const qc = useQueryClient();
  const { setCurrentSemesterId } = useScheduleStore();
  const [year, setYear] = useState(114);
  const [term, setTerm] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [sourceSemesterId, setSourceSemesterId] = useState<number | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSchoolName, setEditSchoolName] = useState('');

  const { data: semesters = [] } = useQuery({ queryKey: ['semesters'], queryFn: getSemesters });

  const createMut = useMutation({
    mutationFn: () => createSemester({ academicYear: year, term, startDate, schoolName, sourceSemesterId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['semesters'] }); setStartDate(''); setSourceSemesterId(undefined); },
    onError: (err: unknown) => { toast.error(getApiErrorMessage(err, '新增學期失敗')); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, schoolName: sn }: { id: number; schoolName: string }) => {
      const s = semesters.find(x => x.id === id)!;
      return updateSemester(id, { academicYear: s.academicYear, term: s.term, startDate: s.startDate, schoolName: sn });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['semesters'] }); setEditingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });

  const setCurrentMut = useMutation({
    mutationFn: setCurrentSemester,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['semesters'] });
      const name = `${data.academicYear}年 第${data.term}學期`;
      setCurrentSemesterId(data.id, name);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            學期管理
          </CardTitle>
          <CardDescription>設定學年度與學期起始日</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <Label>學校名稱</Label>
              <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="例：○○國中" className="w-40" />
            </div>
            <div>
              <Label>學年度</Label>
              <Input type="number" value={year} onChange={e => setYear(+e.target.value)} className="w-24" />
            </div>
            <div>
              <Label>學期</Label>
              <Input type="number" min={1} max={2} value={term} onChange={e => setTerm(+e.target.value)} className="w-20" />
            </div>
            <div>
              <Label>開學日</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>複製自</Label>
              <Select
                value={sourceSemesterId?.toString() ?? ''}
                onValueChange={v => setSourceSemesterId(v ? parseInt(v) : undefined)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="（不複製）" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.academicYear}年 第{s.term}學期{s.schoolName ? ` · ${s.schoolName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!startDate}>
              <Plus className="w-4 h-4 mr-1" /> 新增學期
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>學校名稱</TableHead>
                <TableHead>學年度</TableHead>
                <TableHead>學期</TableHead>
                <TableHead>開學日</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesters.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editSchoolName}
                          onChange={e => setEditSchoolName(e.target.value)}
                          className="w-32 h-8"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMut.mutate({ id: s.id, schoolName: editSchoolName })}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{s.schoolName || '—'}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(s.id); setEditSchoolName(s.schoolName); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{s.academicYear}</TableCell>
                  <TableCell>第{s.term}學期</TableCell>
                  <TableCell>{s.startDate}</TableCell>
                  <TableCell>
                    {s.isCurrent && <Badge variant="default">目前學期</Badge>}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    {!s.isCurrent && (
                      <Button variant="outline" size="sm" onClick={() => setCurrentMut.mutate(s.id)}>
                        <Star className="w-4 h-4 mr-1" /> 設為目前
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(s.id)}>
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
