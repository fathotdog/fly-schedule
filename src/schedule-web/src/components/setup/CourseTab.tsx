import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, createCourse, deleteCourse, updateCourse, exportCoursesExcel, importCoursesExcel, reorderCourses, getCourseRelatedCounts } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, BookOpen, Download, Upload, Pencil, Check, X, Palette, GripVertical } from 'lucide-react';
import { COURSE_COLOR_PALETTE, getNextCourseColor, assignRandomColors } from '@/lib/constants';
import { ColorPicker } from '@/components/ui/color-picker';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { Course } from '@/api/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  course: Course;
  isDragEnabled: boolean;
  editingId: number | null;
  editName: string;
  editColor: string;
  onEditNameChange: (v: string) => void;
  onEditColorChange: (v: string) => void;
  onSave: (id: number) => void;
  onCancel: () => void;
  onEdit: (c: Course) => void;
  onDelete: (id: number) => void;
}

function SortableCourseRow({
  course, isDragEnabled, editingId,
  editName, editColor,
  onEditNameChange, onEditColorChange,
  onSave, onCancel, onEdit, onDelete,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
    disabled: !isDragEnabled || editingId === course.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 px-1">
        {isDragEnabled && (
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="flex items-center gap-2">
        {editingId === course.id ? (
          <Input value={editName} onChange={e => onEditNameChange(e.target.value)} className="h-7 w-28" />
        ) : (
          <>
            <span className="w-4 h-4 rounded" style={{ backgroundColor: course.colorCode }} />
            {course.name}
          </>
        )}
      </TableCell>
      {editingId !== null && (
        <TableCell>
          {editingId === course.id
            ? <ColorPicker value={editColor} onChange={onEditColorChange} />
            : null}
        </TableCell>
      )}
      <TableCell className="flex gap-1">
        {editingId === course.id ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(course.id)}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(course)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(course.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

export function CourseTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COURSE_COLOR_PALETTE[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COURSE_COLOR_PALETTE[0]);
  const [orderedCourses, setOrderedCourses] = useState<Course[]>([]);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [relatedCounts, setRelatedCounts] = useState<{ assignmentCount: number; timetableSlotCount: number } | null>(null);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: getCourses });

  useEffect(() => {
    setOrderedCourses(courses);
  }, [courses]);

  const { sortState, toggleSort, sortItems } = useTableSort<Course>({
    columns: {
      name: (c) => c.name,
    },
  });

  const isDragEnabled = sortState.column === null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setColor(getNextCourseColor(courses.map(c => c.colorCode)));
  }, [courses]);

  const createMut = useMutation({
    mutationFn: () => createCourse({ name, colorCode: color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setName(''); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      setCourseToDelete(null);
    },
  });

  const handleDeleteClick = async (id: number) => {
    try {
      const counts = await getCourseRelatedCounts(id);
      setRelatedCounts(counts);
      setCourseToDelete(id);
    } catch {
      setCourseToDelete(id);
    }
  };

  const updateMut = useMutation({
    mutationFn: (id: number) => updateCourse(id, { name: editName, colorCode: editColor }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditingId(null); },
  });

  const reorderMut = useMutation({
    mutationFn: (courseIds: number[]) => reorderCourses(courseIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const startEdit = (c: Course) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.colorCode);
  };

  const importMut = useMutation({
    mutationFn: importCoursesExcel,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      alert(`匯入完成：新增 ${result.created} 筆、更新 ${result.updated} 筆、跳過 ${result.skipped} 筆`);
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
    e.target.value = '';
  };

  const handleRandomColors = async () => {
    const assignments = assignRandomColors(courses);
    if (assignments.length === 0) return;
    await Promise.all(assignments.map(({ id, newColor }) => {
      const course = courses.find(c => c.id === id)!;
      return updateCourse(id, { name: course.name, colorCode: newColor });
    }));
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCourses.findIndex(c => c.id === active.id);
    const newIndex = orderedCourses.findIndex(c => c.id === over.id);
    const reordered = arrayMove(orderedCourses, oldIndex, newIndex);
    setOrderedCourses(reordered);
    reorderMut.mutate(reordered.map(c => c.id));
  };

  const displayedCourses = isDragEnabled ? orderedCourses : sortItems(courses);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            課程管理
          </CardTitle>
          <CardDescription>定義可排入課表的課程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => exportCoursesExcel()}>
              <Download className="w-4 h-4 mr-1" /> 匯出 Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> 匯入 Excel
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={handleRandomColors}>
              <Palette className="w-4 h-4 mr-1" /> 隨機上色
            </Button>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <Label>課程名稱</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="w-32" />
            </div>
            <div>
              <Label>顏色</Label>
              <div className="mt-1">
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
            <Button onClick={() => createMut.mutate()} disabled={!name}>
              <Plus className="w-4 h-4 mr-1" /> 新增
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedCourses.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 px-1">
                      {isDragEnabled && <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />}
                    </TableHead>
                    <SortableTableHead columnKey="name" sortState={sortState} onToggleSort={toggleSort}>名稱</SortableTableHead>
                    {editingId !== null && <TableHead>顏色</TableHead>}
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCourses.map(c => (
                    <SortableCourseRow
                      key={c.id}
                      course={c}
                      isDragEnabled={isDragEnabled}
                      editingId={editingId}
                      editName={editName}
                      editColor={editColor}
                      onEditNameChange={setEditName}
                      onEditColorChange={setEditColor}
                      onSave={(id) => updateMut.mutate(id)}
                      onCancel={() => setEditingId(null)}
                      onEdit={startEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Dialog open={courseToDelete !== null} onOpenChange={(open) => { if (!open) setCourseToDelete(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              {(() => {
                const name = courses.find(c => c.id === courseToDelete)?.name ?? '';
                if (relatedCounts && relatedCounts.timetableSlotCount > 0)
                  return `確定要刪除課程「${name}」嗎？將同時刪除 ${relatedCounts.assignmentCount} 筆配課資料及 ${relatedCounts.timetableSlotCount} 筆排課資料，此操作無法復原。`;
                if (relatedCounts && relatedCounts.assignmentCount > 0)
                  return `確定要刪除課程「${name}」嗎？將同時刪除 ${relatedCounts.assignmentCount} 筆配課資料，此操作無法復原。`;
                return `確定要刪除課程「${name}」嗎？此操作無法復原。`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => courseToDelete !== null && deleteMut.mutate(courseToDelete)}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
