import { useQuery } from '@tanstack/react-query';
import { getPeriods } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Clock } from 'lucide-react';

export function PeriodTab() {
  const { currentSemesterId } = useScheduleStore();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', currentSemesterId],
    queryFn: () => getPeriods(currentSemesterId!),
    enabled: !!currentSemesterId,
  });

  if (!currentSemesterId) return <p className="text-gray-500">請先選擇目前學期</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          節次設定
        </CardTitle>
        <CardDescription>檢視與管理每日的上課節次</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">節次會在建立學期時自動產生預設值（7節）。</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>節次</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>結束時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map(p => (
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
  );
}
