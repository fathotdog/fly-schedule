import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffTitles, createStaffTitle, deleteStaffTitle } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Award } from 'lucide-react';

export function StaffTitleTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const { data: titles = [] } = useQuery({ queryKey: ['staffTitles'], queryFn: getStaffTitles });

  const createMut = useMutation({
    mutationFn: () => createStaffTitle({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffTitles'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteStaffTitle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffTitles'] }),
  });

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
                <TableHead>ID</TableHead>
                <TableHead>名稱</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {titles.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(t.id)}>
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
