import { NavLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { navigationGroups, brandMeta } from '@/shared/constants/navigation'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/utils/cn'

interface AppSidebarProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const BrandIcon = brandMeta.icon

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border/90 bg-sidebar/92 backdrop-blur',
        mobile ? 'w-full' : 'w-[288px]',
      )}
    >
      <div className="border-b border-sidebar-border/90 px-6 py-6">
        <NavLink to="/dashboard" className="flex items-start gap-4" onClick={onNavigate}>
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_12px_24px_rgba(17,40,84,0.12)]">
            <BrandIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="type-card text-sidebar-foreground">{brandMeta.name}</p>
            <p className="type-meta text-muted-foreground">{brandMeta.tagline}</p>
          </div>
        </NavLink>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-7">
          {navigationGroups.map((group) => (
            <section key={group.label} className="space-y-2.5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/90">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  (() => {
                    const href = item.href

                    return (
                  <NavLink
                    key={`${item.label}-${href}`}
                    to={href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center justify-between rounded-[18px] border px-3.5 py-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                        isActive
                          ? 'border-primary/12 bg-sidebar-primary/8 text-sidebar-primary shadow-sm'
                          : 'border-transparent text-sidebar-foreground hover:border-white/75 hover:bg-sidebar-accent/80',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                              isActive ? 'bg-primary/10 text-primary' : 'bg-white/70 text-muted-foreground group-hover:text-foreground',
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                          </div>
                          <span className="type-label text-current">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'border-transparent bg-primary/10 text-primary',
                                isActive && 'bg-primary text-primary-foreground',
                              )}
                            >
                              {item.badge}
                            </Badge>
                          ) : null}
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-all',
                              isActive ? 'opacity-100 text-primary' : 'opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100',
                            )}
                          />
                        </div>
                      </>
                    )}
                  </NavLink>
                    )
                  })()
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="border-t border-sidebar-border/90 p-4">
        <div className="surface-card rounded-[24px] p-4">
          <div className="flex items-center justify-between">
            <p className="type-card text-foreground">Plano Pro Aluno</p>
            <span className="type-meta text-primary">Ativo</span>
          </div>
          <p className="type-meta mt-1 text-muted-foreground">
            Uso ilimitado de IA, exportação avançada e acompanhamento do orientador.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[75%] rounded-full bg-primary" />
          </div>
          <p className="type-meta mt-3 text-muted-foreground">75% do projeto atual estruturado.</p>
        </div>
      </div>
    </aside>
  )
}
