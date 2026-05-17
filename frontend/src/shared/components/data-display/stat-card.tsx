import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  helper: string
  icon: LucideIcon
  tone?: 'primary' | 'neutral' | 'warning' | 'info'
  emphasis?: boolean
  footer?: string
  progress?: number
}

const toneStyles = {
  primary: {
    card: 'bg-[linear-gradient(180deg,rgba(23,41,85,0.045),rgba(255,255,255,0.92))] border-primary/10',
    icon: 'bg-primary/10 text-primary',
    accent: 'bg-primary',
  },
  neutral: {
    card: '',
    icon: 'bg-muted text-foreground/75',
    accent: 'bg-foreground/30',
  },
  warning: {
    card: 'bg-[linear-gradient(180deg,rgba(245,158,11,0.05),rgba(255,255,255,0.92))] border-amber-100',
    icon: 'bg-amber-100 text-amber-700',
    accent: 'bg-amber-500',
  },
  info: {
    card: 'bg-[linear-gradient(180deg,rgba(14,165,233,0.05),rgba(255,255,255,0.92))] border-sky-100',
    icon: 'bg-sky-100 text-sky-700',
    accent: 'bg-sky-500',
  },
} as const

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'neutral',
  emphasis = false,
  footer,
  progress,
}: StatCardProps) {
  const style = toneStyles[tone]

  return (
    <Card
      className={cn(
        'surface-card rounded-[28px]',
        style.card,
        emphasis && 'surface-card-strong shadow-[0_18px_40px_rgba(23,41,85,0.09)]',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="type-label text-muted-foreground">{title}</CardTitle>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-[18px]', style.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={cn('text-[2rem] font-semibold leading-none tracking-tight text-foreground', emphasis && 'text-[2.25rem]')}>
          {value}
        </div>
        <p className="type-meta max-w-[18rem] text-muted-foreground">{helper}</p>
        {typeof progress === 'number' ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/75">
              <div
                className={cn('h-full rounded-full', style.accent)}
                style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
              />
            </div>
          </div>
        ) : null}
        {footer ? <p className="type-meta text-foreground/75">{footer}</p> : null}
      </CardContent>
    </Card>
  )
}
