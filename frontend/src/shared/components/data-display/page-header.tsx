import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  eyebrow?: string
  action?: ReactNode
}

export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-2.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="type-display text-foreground">{title}</h1>
          <p className="type-body max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0 self-start md:self-auto">{action}</div> : null}
    </div>
  )
}
