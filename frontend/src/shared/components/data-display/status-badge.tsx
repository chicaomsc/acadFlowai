import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/utils/cn'

const toneMap = {
  neutral: 'bg-muted text-muted-foreground border-transparent',
  primary: 'bg-primary/10 text-primary border-primary/10',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-100',
  info: 'bg-sky-50 text-sky-700 border-sky-100',
} as const

interface StatusBadgeProps {
  label: string
  tone?: keyof typeof toneMap
  className?: string
}

export function StatusBadge({ label, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]',
        toneMap[tone],
        className,
      )}
    >
      {label}
    </Badge>
  )
}
