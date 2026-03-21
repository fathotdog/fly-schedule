import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeInput24h({ value, onChange, className }: TimeInput24hProps) {
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const handleHour = (h: string) => {
    const m = minute || '00';
    onChange(`${h}:${m}`);
  };

  const handleMinute = (m: string) => {
    const h = hour || '00';
    onChange(`${h}:${m}`);
  };

  const selectClass =
    'h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <select
        value={hour}
        onChange={e => handleHour(e.target.value)}
        className={selectClass}
        style={{ width: '3.25rem' }}
      >
        <option value="" disabled>時</option>
        {HOURS.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-sm text-on-surface-variant">:</span>
      <select
        value={minute}
        onChange={e => handleMinute(e.target.value)}
        className={selectClass}
        style={{ width: '3.25rem' }}
      >
        <option value="" disabled>分</option>
        {MINUTES.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
