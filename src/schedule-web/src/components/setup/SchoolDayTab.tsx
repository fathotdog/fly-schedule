import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchoolDays, updateSchoolDays } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { DAY_NAMES_1BASED as DAY_NAMES } from '@/lib/constants';

export function SchoolDayTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [days, setDays] = useState<{ dayOfWeek: number; isActive: boolean }[]>([]);

  const { data } = useQuery({
    queryKey: ['schoolDays', currentSemesterId],
    queryFn: () => getSchoolDays(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  useEffect(() => {
    if (data) setDays(data.map(d => ({ dayOfWeek: d.dayOfWeek, isActive: d.isActive })));
  }, [data]);

  const updateMut = useMutation({
    mutationFn: () => updateSchoolDays(currentSemesterId!, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schoolDays'] }),
  });

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          上課日管理
        </CardTitle>
        <CardDescription>管理學期中的上課日期</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-5 gap-4">
          {days.map((d, i) => (
            <label key={d.dayOfWeek}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer
                ${d.isActive ? 'border-primary bg-secondary-container' : 'border-outline-variant/30 bg-surface-container-low'}`}>
              <input type="checkbox" checked={d.isActive}
                onChange={e => {
                  const next = [...days];
                  next[i] = { ...next[i], isActive: e.target.checked };
                  setDays(next);
                }}
                className="w-5 h-5" />
              <span className="text-lg font-medium">{DAY_NAMES[d.dayOfWeek]}</span>
            </label>
          ))}
        </div>
        <Button onClick={() => updateMut.mutate()}>儲存</Button>
      </CardContent>
    </Card>
  );
}
