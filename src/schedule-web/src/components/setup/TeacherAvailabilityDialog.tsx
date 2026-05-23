import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle } from 'lucide-react';
import { getPeriods, getSchoolDays, getTeacherAvailability, updateTeacherAvailability } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DAY_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TeacherAvailabilityDialogProps {
  open: boolean;
  teacherId: number | null;
  teacherName: string;
  semesterId: number | null;
  onOpenChange: (open: boolean) => void;
}

export function TeacherAvailabilityDialog({
  open,
  teacherId,
  teacherName,
  semesterId,
  onOpenChange,
}: TeacherAvailabilityDialogProps) {
  const qc = useQueryClient();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: periods = [], isLoading: isPeriodsLoading } = useQuery({
    queryKey: ['periods', semesterId],
    queryFn: () => getPeriods(semesterId!),
    enabled: open && semesterId !== null,
  });

  const { data: schoolDays = [], isLoading: isSchoolDaysLoading } = useQuery({
    queryKey: ['schoolDays', semesterId],
    queryFn: () => getSchoolDays(semesterId!),
    enabled: open && semesterId !== null,
  });

  const { data: availability = [], isLoading: isAvailabilityLoading } = useQuery({
    queryKey: ['teacherAvailability', semesterId, teacherId],
    queryFn: () => getTeacherAvailability(semesterId!, teacherId!),
    enabled: open && semesterId !== null && teacherId !== null,
  });

  const teachingPeriods = useMemo(
    () => periods.filter(period => !period.isActivity),
    [periods]
  );

  const activeDays = useMemo(
    () => schoolDays
      .filter(d => d.isActive)
      .map(d => d.dayOfWeek)
      .sort((a, b) => a - b),
    [schoolDays]
  );

  // Seed selection only on open (not on every availability refetch) so an
  // in-flight focus/invalidation refetch can't silently wipe unsaved edits.
  useEffect(() => {
    if (!open) return;
    setSelectedKeys(new Set(availability.map(item => `${item.dayOfWeek}-${item.periodId}`)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId, semesterId]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (teacherId === null || semesterId === null) return [];
      return updateTeacherAvailability(
        semesterId,
        teacherId,
        [...selectedKeys].map(key => {
          const [dayOfWeek, periodId] = key.split('-').map(Number);
          return { dayOfWeek, periodId };
        })
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teacherAvailability'] });
      toast.success('已更新教師不可排時段');
      onOpenChange(false);
    },
  });

  const toggleCell = (dayOfWeek: number, periodId: number) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      const key = `${dayOfWeek}-${periodId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isLoading = isPeriodsLoading || isSchoolDaysLoading || isAvailabilityLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{teacherName}・可用時段設定</DialogTitle>
          <DialogDescription>勾選代表該時段不可排課。</DialogDescription>
        </DialogHeader>

        {semesterId === null ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-on-surface-variant">
            請先選擇學期。
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> 載入中...
          </div>
        ) : teachingPeriods.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-on-surface-variant">
            目前學期尚未設定可排課節次。
          </div>
        ) : activeDays.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-on-surface-variant">
            目前學期尚未設定上課日。
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="rounded-lg bg-surface-container-low p-2 text-xs font-bold text-primary">節次</th>
                  {activeDays.map(day => (
                    <th key={day} className="rounded-lg bg-surface-container-low p-2 text-xs font-bold text-primary">
                      {DAY_NAMES[day - 1] ?? `Day ${day}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachingPeriods.map(period => (
                  <tr key={period.id}>
                    <td className="rounded-lg bg-surface-container-low p-2 text-center text-sm font-medium">
                      <div>{period.periodNumber}</div>
                      <div className="text-xs text-on-surface-variant">
                        {period.startTime.slice(0, 5)}-{period.endTime.slice(0, 5)}
                      </div>
                    </td>
                    {activeDays.map(dayOfWeek => {
                      const key = `${dayOfWeek}-${period.id}`;
                      const selected = selectedKeys.has(key);
                      return (
                        <td key={key} className="h-14 min-w-24 rounded-lg bg-surface-container-low p-1">
                          <button
                            type="button"
                            className={cn(
                              'flex h-full w-full items-center justify-center rounded-md border text-sm transition-colors',
                              selected
                                ? 'border-primary bg-primary/12 text-primary'
                                : 'border-outline-variant/30 bg-background hover:bg-surface'
                            )}
                            onClick={() => toggleCell(dayOfWeek, period.id)}
                          >
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={teacherId === null || semesterId === null || saveMut.isPending}
          >
            {saveMut.isPending ? '儲存中...' : '儲存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
