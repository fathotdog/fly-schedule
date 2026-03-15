import { ClassSelector } from './ClassSelector';
import { SubjectSelector } from './SubjectSelector';
import { TimetableGrid } from './TimetableGrid';
import { TeacherSchedulePanel } from './TeacherSchedulePanel';

export function TimetablePage() {
  return (
    <div className="flex gap-4 h-full">
      {/* Left panel - Subject selector */}
      <div className="w-72 shrink-0 bg-white rounded-xl shadow-panel p-4 overflow-auto">
        <div className="mb-4">
          <ClassSelector />
        </div>
        <SubjectSelector />
      </div>

      {/* Center - Timetable grid */}
      <div className="flex-1 overflow-auto bg-surface rounded-xl shadow-panel p-4">
        <TimetableGrid />
      </div>

      {/* Right panel - Teacher schedule */}
      <div className="w-80 shrink-0 bg-white rounded-xl shadow-panel p-4 overflow-auto">
        <TeacherSchedulePanel />
      </div>
    </div>
  );
}
