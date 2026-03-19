interface Semester {
  id: number;
  academicYear: number;
  term: number;
  schoolName: string;
  isCurrent: boolean;
}

interface NavbarProps {
  semesters: Semester[];
  currentSemesterId: number | null;
  onSemesterChange: (id: number) => void;
}

export function Navbar({ semesters, currentSemesterId, onSemesterChange }: NavbarProps) {
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-end px-6 z-30">
      <div className="flex items-center gap-2">
        <span className="text-xs text-on-surface-variant">目前學期：</span>
        {semesters.length === 0 ? (
          <span className="text-xs text-on-surface-variant italic">請先建立學期</span>
        ) : (
          <select
            value={currentSemesterId ?? ''}
            onChange={e => onSemesterChange(Number(e.target.value))}
            className="text-sm bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                {s.schoolName ? `${s.schoolName} ` : ''}{s.academicYear}年 第{s.term}學期
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
}
