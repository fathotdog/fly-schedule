export const COURSE_COLOR_PALETTE = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#64748b',
  '#a855f7', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#facc15', '#2dd4bf', '#fb923c', '#6366f1', '#78716c',
];

export function getNextCourseColor(usedColors: string[]): string {
  const used = new Set(usedColors.map(c => c.toLowerCase()));
  return COURSE_COLOR_PALETTE.find(c => !used.has(c)) ?? COURSE_COLOR_PALETTE[0];
}

const DEFAULT_COLOR = '#6366f1';

export function assignRandomColors(
  courses: { id: number; colorCode: string }[]
): { id: number; newColor: string }[] {
  const needsColor = courses.filter(c => c.colorCode === DEFAULT_COLOR);
  if (needsColor.length === 0) return [];

  const usedColors = new Set(
    courses.filter(c => c.colorCode !== DEFAULT_COLOR).map(c => c.colorCode)
  );
  const available = COURSE_COLOR_PALETTE.filter(c => !usedColors.has(c) && c !== DEFAULT_COLOR);

  // Shuffle available colors
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // If we need more colors than available, cycle through the full palette shuffled
  const fullPool = shuffled.length >= needsColor.length
    ? shuffled
    : [...COURSE_COLOR_PALETTE.filter(c => c !== DEFAULT_COLOR)].sort(() => Math.random() - 0.5);

  return needsColor.map((course, i) => ({
    id: course.id,
    newColor: fullPool[i % fullPool.length],
  }));
}

export const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五'] as const;

/** DAY_NAMES with a leading empty string so index matches dayOfWeek (1-based) */
export const DAY_NAMES_1BASED = ['', '週一', '週二', '週三', '週四', '週五'] as const;

/** dayOfWeek values for Mon–Fri (1-based) */
export const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const;

/** Stable empty array sentinel — use as default for query data to avoid recreating arrays on every render */
export const EMPTY_ARR: never[] = [];
