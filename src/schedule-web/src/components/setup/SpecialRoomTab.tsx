import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSpecialRooms, createSpecialRoom, deleteSpecialRoom } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DoorOpen } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { SpecialRoom } from '@/api/types';

export function SpecialRoomTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(40);

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialRooms'] }),
  });

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
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell>
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
    </div>
  );
}
