import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPeriods, createPeriod, updatePeriod, deletePeriod } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Clock, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Period } from '@/api/types';

export function PeriodTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', currentSemesterId],
    queryFn: () => getPeriods(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  const classPeriods = periods.filter(p => !p.isActivity);
  const activityPeriods = periods.filter(p => p.isActivity);

  if (!currentSemesterId) return <p className="text-gray-500">請先選擇目前學期</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            上課節次
          </CardTitle>
          <CardDescription>檢視每日的上課節次（建立學期時自動產生）</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>節次</TableHead>
                <TableHead>開始時間</TableHead>
                <TableHead>結束時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classPeriods.map(p => (
                <TableRow key={p.id}>
                  <TableCell>第{p.periodNumber}節</TableCell>
                  <TableCell>{p.startTime}</TableCell>
                  <TableCell>{p.endTime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ActivityPeriodsCard
        semesterId={currentSemesterId}
        periods={activityPeriods}
        queryClient={qc}
      />
    </div>
  );
}

function ActivityPeriodsCard({ semesterId, periods, queryClient }: {
  semesterId: number;
  periods: Period[];
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['periods', semesterId] });

  const createMut = useMutation({
    mutationFn: () => createPeriod(semesterId, {
      periodNumber: 0,
      startTime: newStart,
      endTime: newEnd,
      isActivity: true,
      activityName: newName,
    }),
    onSuccess: () => { invalidate(); setAdding(false); setNewName(''); setNewStart(''); setNewEnd(''); },
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => updatePeriod(semesterId, id, {
      periodNumber: 0,
      startTime: editStart,
      endTime: editEnd,
      isActivity: true,
      activityName: editName,
    }),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePeriod(semesterId, id),
    onSuccess: invalidate,
  });

  const startEdit = (p: Period) => {
    setEditingId(p.id);
    setEditName(p.activityName ?? '');
    setEditStart(p.startTime);
    setEditEnd(p.endTime);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              活動時段
            </CardTitle>
            <CardDescription>管理非上課的活動時段（晨掃、朝會、午餐等）</CardDescription>
          </div>
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-1" /> 新增活動
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="flex gap-3 items-end mb-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>活動名稱</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="w-36" placeholder="例：晨間打掃" />
            </div>
            <div>
              <Label>開始時間</Label>
              <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>結束時間</Label>
              <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-32" />
            </div>
            <Button size="sm" onClick={() => createMut.mutate()} disabled={!newName || !newStart || !newEnd}>
              <Check className="w-4 h-4 mr-1" /> 確定
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>活動名稱</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>結束時間</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map(p => (
              <TableRow key={p.id}>
                {editingId === p.id ? (
                  <>
                    <TableCell>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="w-36 h-8" />
                    </TableCell>
                    <TableCell>
                      <Input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="w-32 h-8" />
                    </TableCell>
                    <TableCell>
                      <Input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-32 h-8" />
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMut.mutate(p.id)}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{p.activityName}</TableCell>
                    <TableCell>{p.startTime}</TableCell>
                    <TableCell>{p.endTime}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
