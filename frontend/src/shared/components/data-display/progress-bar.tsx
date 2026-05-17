import { Progress } from '@/shared/ui/progress'

interface ProgressBarProps {
  value: number
  label?: string
  helper?: string
}

export function ProgressBar({ value, label, helper }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      {(label || helper) && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted-foreground">{helper ?? `${value}%`}</span>
        </div>
      )}
      <Progress value={value} className="h-2.5" />
    </div>
  )
}
