import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { BatchAssignmentPanel } from './BatchAssignmentPanel';
import { BatchAssignmentByTeacherPanel } from './BatchAssignmentByTeacherPanel';
import { AssignmentOverview } from './AssignmentOverview';

export function CourseAssignmentTab() {
  const { currentSemesterId } = useScheduleStore();

  if (!currentSemesterId) return <p className="text-on-surface-variant">請先選擇目前學期</p>;

  return (
    <Tabs defaultValue="batch" className="block">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                配課管理
              </CardTitle>
              <CardDescription>第一步：逐班設定課程節數；第二步：逐師認領課程</CardDescription>
            </div>
            <TabsList>
              <TabsTrigger value="batch">逐班配課</TabsTrigger>
              <TabsTrigger value="batch-teacher">逐師配課</TabsTrigger>
              <TabsTrigger value="overview">配課總覽</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent>
          <TabsContent value="batch"><BatchAssignmentPanel /></TabsContent>
          <TabsContent value="batch-teacher"><BatchAssignmentByTeacherPanel /></TabsContent>
          <TabsContent value="overview"><AssignmentOverview /></TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
