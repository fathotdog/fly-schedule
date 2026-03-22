import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffTitles, createStaffTitle, deleteStaffTitle, updateStaffTitle } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Award, Pencil, Check, X } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { StaffTitle } from '@/api/types';

export function StaffTitleTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const { data: titles = [] } = useQuery({ queryKey: ['staffTitles'], queryFn: getStaffTitles });

  const { sortState, toggleSort, sortItems } = useTableSort<StaffTitle>({
    columns: { name: (t) => t.name },
  });

  const createMut = useMutation({
    mutationFn: () => createStaffTitle({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffTitles'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteStaffTitle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffTitles'] }),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => updateStaffTitle(id, { name: editName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffTitles'] }); setEditingId(null); },
  });

  const startEdit = (t: { id: number; name: string }) => {
    setEditingId(t.id);
    setEditName(t.name);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            職稱管理
          </CardTitle>
          <CardDescription>定義教師職稱類別</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <Input placeholder="職稱名稱" value={name} onChange={e => setName(e.target.value)} className="w-48" />
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
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortItems(titles).map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    {editingId === t.id
                      ? <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 w-40" />
                      : t.name}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {editingId === t.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMut.mutate(t.id)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
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
