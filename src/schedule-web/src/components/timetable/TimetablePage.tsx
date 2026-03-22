import { ClassSelector } from './ClassSelector';
import { TeacherSelector } from './TeacherSelector';
import { SubjectSelector } from './SubjectSelector';
import { TimetableGrid } from './TimetableGrid';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';
import { ClassSchedulePanel } from './ClassSchedulePanel';
import { Button } from '@/components/ui/button';
import { Download, GraduationCap, User } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { exportTimetablePdf } from '@/api/client';
import { cn } from '@/lib/utils';

export function TimetablePage() {
  const { currentSemesterId, selectedClassId, timetableViewMode, setTimetableViewMode } = useScheduleStore();

  const isClassMode = timetableViewMode === 'class';

  const handleExportPdf = () => {
    if (currentSemesterId && selectedClassId) {
      exportTimetablePdf(currentSemesterId, selectedClassId);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left panel - Subject selector */}
      <div className="w-72 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 overflow-auto">
        {/* View mode toggle */}
        <div className="mb-4 flex rounded-xl bg-surface-container-low p-1">
          <button
            onClick={() => setTimetableViewMode('class')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isClassMode
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            班級排課
          </button>
          <button
            onClick={() => setTimetableViewMode('teacher')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              !isClassMode
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <User className="w-3.5 h-3.5" />
            教師排課
          </button>
        </div>

        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            {isClassMode ? <ClassSelector /> : <TeacherSelector />}
          </div>
          {isClassMode && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportPdf}
              disabled={!currentSemesterId || !selectedClassId}
              title="匯出 PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
        <SubjectSelector />
      </div>

      {/* Center - Timetable grid */}
      <div className="flex-1 min-w-0 overflow-auto bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4">
        <TimetableGrid />
      </div>

      {/* Right panel - Side schedule */}
      <div className="w-96 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 overflow-auto">
        {isClassMode ? <TeacherSchedulePanel /> : <ClassSchedulePanel />}
      </div>
    </div>
  );
}
