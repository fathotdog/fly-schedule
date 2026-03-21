interface CourseDotProps {
  color: string;
  className?: string;
}

export function CourseDot({ color, className = 'w-3 h-3 rounded-sm flex-shrink-0' }: CourseDotProps) {
  return <span className={className} style={{ backgroundColor: color }} />;
}
