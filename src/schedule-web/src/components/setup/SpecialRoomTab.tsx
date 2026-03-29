import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSpecialRooms, createSpecialRoom, deleteSpecialRoom, getRoomTimetable, exportRoomTimetablePdf, getPeriods } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DoorOpen, Download, LayoutGrid } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { SpecialRoom, TimetableSlot } from '@/api/types';
import { useScheduleStore } from '@/store/useScheduleStore';
import { DAY_NAMES, SCHOOL_DAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

function RoomTimetableView({ semesterId, room }: { semesterId: number; room: SpecialRoom }) {
  const { data: slots = [] } = useQuery({
    queryKey: ['roomTimetable', semesterId, room.id],
    queryFn: () => getRoomTimetable(semesterId, room.id),
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', semesterId],
    queryFn: () => getPeriods(semesterId),
  });

  const slotMap = new Map<string, TimetableSlot>();
  for (const s of slots) {
    slotMap.set(`${s.dayOfWeek}-${s.periodId}`, s);
  }

  const activePeriods = periods.filter(p => !p.isActivity);

  const handleExportPdf = () => {
    exportRoomTimetablePdf(semesterId, room.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="w-4 h-4 text-primary" />
            {room.name} — 課表
            <span className="text-sm font-normal text-on-surface-variant ml-1">({slots.length} 節已排)</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={slots.length === 0}>
            <Download className="w-4 h-4 mr-1" /> 匯出 PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activePeriods.length === 0 ? (
          <div className="text-sm text-on-surface-variant text-center py-4">尚未設定節次</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="p-2 bg-surface-container-low text-primary rounded-lg w-12 text-xs font-bold uppercase tracking-widest">節</th>
                  {DAY_NAMES.map((name, i) => (
                    <th key={i} className="p-2 bg-surface-container-low text-primary rounded-lg min-w-[120px] text-xs font-bold uppercase tracking-widest">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePeriods.map(period => (
                  <tr key={period.id}>
                    <td className="p-2 text-center font-medium bg-surface-container-low rounded-lg">
                      <div className="text-primary text-sm">{period.periodNumber}</div>
                    </td>
                    {SCHOOL_DAYS.map(day => {
                      const slot = slotMap.get(`${day}-${period.id}`);
                      return (
                        <td
                          key={day}
                          className={cn(
                            'p-1.5 h-16 text-center rounded-lg border border-outline-variant/15',
                            slot ? 'bg-primary/5' : 'bg-surface-container-lowest'
                          )}
                          style={slot ? { borderColor: slot.courseColorCode + '40' } : undefined}
                        >
                          {slot && (
                            <div className="flex flex-col gap-0.5">
                              <div className="text-xs font-medium" style={{ color: slot.courseColorCode }}>
                                {slot.courseName}
                              </div>
                              <div className="text-xs text-on-surface-variant">{slot.classDisplayName}</div>
                              {slot.teacherName && (
                                <div className="text-xs text-on-surface-variant/60">{slot.teacherName}</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SpecialRoomTab() {
  const qc = useQueryClient();
  const { currentSemesterId } = useScheduleStore();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const { data: rooms = [] } = useQuery({ queryKey: ['specialRooms'], queryFn: getSpecialRooms });

  const { sortState, toggleSort, sortItems } = useTableSort<SpecialRoom>({
    columns: {
      name: (r) => r.name,
      capacity: (r) => r.capacity,
    },
  });

  const createMut = useMutation({
    mutationFn: () => createSpecialRoom({ name, capacity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['specialRooms'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteSpecialRoom,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['specialRooms'] });
      if (selectedRoomId === id) setSelectedRoomId(null);
    },
  });

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary" />
            專科教室
          </CardTitle>
          <CardDescription>管理需要專用教室的場地</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>教室名稱</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-36" />
            </div>
            <div>
              <Label>容量</Label>
              <Input type="number" value={capacity} onChange={e => setCapacity(+e.target.value)} className="w-20" />
            </div>
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
                <SortableTableHead columnKey="name" sortState={sortState} onToggleSort={toggleSort}>名稱</SortableTableHead>
                <SortableTableHead columnKey="capacity" sortState={sortState} onToggleSort={toggleSort}>容量</SortableTableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortItems(rooms).map(r => (
                <TableRow
                  key={r.id}
                  className={cn('cursor-pointer', selectedRoomId === r.id && 'bg-primary/5')}
                  onClick={() => setSelectedRoomId(selectedRoomId === r.id ? null : r.id)}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRoom && currentSemesterId && (
        <RoomTimetableView semesterId={currentSemesterId} room={selectedRoom} />
      )}
    </div>
  );
}
