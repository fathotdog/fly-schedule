import { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { COURSE_COLOR_PALETTE } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="w-7 h-7 rounded-full border-2 border-foreground/20 hover:border-foreground/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
        style={{ backgroundColor: value }}
        aria-label="選擇顏色"
      />
      <PopoverContent className="w-auto">
        <div className="grid grid-cols-5 gap-1.5">
          {COURSE_COLOR_PALETTE.map(c => (
            <button
              key={c}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                value === c ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              onClick={() => { onChange(c); setOpen(false) }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
