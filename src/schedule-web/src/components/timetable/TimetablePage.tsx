import { ClassSelector } from './ClassSelector';
import { SubjectSelector } from './SubjectSelector';
import { TimetableGrid } from './TimetableGrid';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { exportTimetablePdf } from '@/api/client';

export function TimetablePage() {
  const { currentSemesterId, selectedClassId } = useScheduleStore();

  const handleExportPdf = () => {
    if (currentSemesterId && selectedClassId) {
      exportTimetablePdf(currentSemesterId, selectedClassId);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel - Subject selector */}
      <div className="w-72 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 overflow-auto">
        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <ClassSelector />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportPdf}
            disabled={!currentSemesterId || !selectedClassId}
            title="匯出 PDF"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        <SubjectSelector />
      </div>

      {/* Center - Timetable grid */}
      <div className="flex-1 overflow-auto bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4">
        <TimetableGrid />
      </div>

      {/* Right panel - Teacher schedule */}
      <div className="w-80 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 overflow-auto">
        <TeacherSchedulePanel />
      </div>
    </div>
  );
}
