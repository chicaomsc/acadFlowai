import { Bell, Menu, Search, Settings, User2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '@/shared/services/auth.service'
import { useAppShellStore } from '@/shared/services/app-store'
import { usePageMeta } from '@/shared/hooks/use-page-meta'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

interface AppTopbarProps {
  workspaceMode?: boolean
}

export function AppTopbar({ workspaceMode = false }: AppTopbarProps) {
  const navigate = useNavigate()
  const meta = usePageMeta()
  const {
    currentUser,
    notifications,
    searchTerm,
    setCurrentUser,
    setSearchTerm,
    setMobileSidebarOpen,
    markNotificationAsRead,
  } = useAppShellStore()

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const initials =
    currentUser?.name
      .split(' ')
      .map((item) => item[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'AF'

  if (workspaceMode) {
    return (
      <header className="relative z-20 border-b border-border/60 bg-background/72 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between gap-4 px-4 md:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-[16px] md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
                  ← Dashboard
                </Link>
                <span className="text-border">/</span>
                <Link to="/projects" className="text-muted-foreground transition-colors hover:text-foreground">
                  Projetos
                </Link>
                <span className="text-border">/</span>
                <Link to="/export" className="text-muted-foreground transition-colors hover:text-foreground">
                  Exportação
                </Link>
              </div>
              <div className="mt-1.5 min-w-0">
                <p className="type-meta uppercase tracking-[0.2em] text-muted-foreground">
                  AcadFlow AI
                </p>
                <h2 className="truncate text-sm text-muted-foreground">{meta.description}</h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 rounded-[16px] bg-white/82 px-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left lg:block">
                    <p className="type-label leading-none text-foreground">
                      {currentUser?.name?.split(' ')[0]}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-[22px]">
                <DropdownMenuLabel className="font-normal">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/projects">
                    <User2 className="mr-2 h-4 w-4" />
                    Voltar aos projetos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async (event) => {
                    event.preventDefault()
                    await logout()
                    setCurrentUser(null)
                    navigate('/login')
                  }}
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="relative z-20 border-b border-border/80 bg-background/82 backdrop-blur-xl">
      <div className="flex h-[84px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-[18px] md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="max-w-[40rem] space-y-1">
            <p className="type-meta uppercase tracking-[0.2em] text-muted-foreground">
              {meta.title}
            </p>
            <h2 className="type-body-sm text-muted-foreground">{meta.description}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative hidden w-[300px] xl:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Busca global em desenvolvimento"
              className="h-11 rounded-[18px] border-white/75 bg-white/88 pl-10 shadow-sm"
              readOnly
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative rounded-[18px] bg-white/82">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] rounded-[24px] p-0">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notificações</h3>
                  <Badge variant="secondary">Prévia local</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Painel visual em evolução. Esses itens ainda não representam eventos em tempo real do backend.
                </p>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left hover:bg-muted/40"
                  >
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/70" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 rounded-[18px] bg-white/82 px-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left lg:block">
                  <p className="type-label leading-none text-foreground">
                    {currentUser?.name?.split(' ')[0]}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Conta acadêmica</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-[22px]">
              <DropdownMenuLabel className="font-normal">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <User2 className="mr-2 h-4 w-4" />
                  Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async (event) => {
                  event.preventDefault()
                  await logout()
                  setCurrentUser(null)
                  navigate('/login')
                }}
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
