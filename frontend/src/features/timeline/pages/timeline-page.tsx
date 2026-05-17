import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Circle, Clock3, MoreHorizontal, Plus, PencilLine, Trash2 } from 'lucide-react'
import { timelineQuery } from '@/features/timeline/services/timeline.service'
import { getActiveProjectId } from '@/shared/services/active-project.service'
import { getChapters } from '@/shared/services/chapter.service'
import {
  createTimelineTask,
  deleteTimelineTask,
  updateTimelineTask,
  updateTimelineTaskStatus,
} from '@/shared/services/timeline.service'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { ErrorState } from '@/shared/components/feedback/error-state'
import { LoadingState } from '@/shared/components/feedback/loading-state'
import { PageHeader } from '@/shared/components/data-display/page-header'
import { StatCard } from '@/shared/components/data-display/stat-card'
import { StatusBadge } from '@/shared/components/data-display/status-badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import type { TimelineTask } from '@/shared/types/contracts'

type TaskDraft = {
  title: string
  chapterId: string
  dueDate: string
  priority: TimelineTask['priority']
}

const emptyTaskDraft: TaskDraft = {
  title: '',
  chapterId: 'none',
  dueDate: '',
  priority: 'medium',
}

export function TimelinePage() {
  const activeProjectId = getActiveProjectId() ?? undefined
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery(timelineQuery(activeProjectId))
  const { data: chapters } = useQuery({
    queryKey: ['chapters', activeProjectId],
    queryFn: () => getChapters(activeProjectId),
    enabled: Boolean(activeProjectId),
  })
  const [tasks, setTasks] = useState<typeof data>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft)
  const [pendingAction, setPendingAction] = useState<{ type: 'save' | 'delete' | 'advance'; taskId?: string } | null>(null)

  const isMutating = pendingAction !== null

  useEffect(() => {
    if (data) setTasks(data)
  }, [data])

  function resetTaskDialog() {
    setEditingTaskId(null)
    setTaskDraft(emptyTaskDraft)
  }

  function openCreateTaskDialog() {
    resetTaskDialog()
    setDialogOpen(true)
  }

  function openEditTaskDialog(task: TimelineTask) {
    setEditingTaskId(task.id)
    setTaskDraft({
      title: task.title,
      chapterId: task.chapterId ?? 'none',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      priority: task.priority,
    })
    setDialogOpen(true)
  }

  async function invalidateTimelineQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['export-status'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      activeProjectId
        ? queryClient.invalidateQueries({ queryKey: ['project-details', activeProjectId] })
        : Promise.resolve(),
    ])
  }

  async function handleSaveTask() {
    if (isMutating) return

    const payload = {
      title: taskDraft.title.trim(),
      chapterId: taskDraft.chapterId === 'none' ? undefined : taskDraft.chapterId,
      dueDate: taskDraft.dueDate,
      priority: taskDraft.priority,
    } as const

    if (!payload.title) return

    setPendingAction({ type: 'save', taskId: editingTaskId ?? undefined })

    try {
      const savedTask = editingTaskId
        ? await updateTimelineTask(editingTaskId, payload, activeProjectId)
        : await createTimelineTask(payload, activeProjectId)

      if (!savedTask) return

      setTasks((current) => {
        if (!current) return current
        return editingTaskId
          ? current.map((item) => (item.id === savedTask.id ? savedTask : item))
          : [...current, savedTask]
      })

      await invalidateTimelineQueries()
      resetTaskDialog()
      setDialogOpen(false)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (isMutating) return

    const confirmed = window.confirm('Excluir esta tarefa do cronograma?')
    if (!confirmed) return

    setPendingAction({ type: 'delete', taskId })

    try {
      const deleted = await deleteTimelineTask(taskId, activeProjectId)
      if (!deleted) return

      setTasks((current) => current?.filter((item) => item.id !== taskId))
      await invalidateTimelineQueries()
    } finally {
      setPendingAction(null)
    }
  }

  async function handleAdvanceTask(task: TimelineTask) {
    if (isMutating) return

    const nextStatus =
      task.status === 'todo'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'completed'
          : 'todo'

    setPendingAction({ type: 'advance', taskId: task.id })

    try {
      const updated = await updateTimelineTaskStatus(task.id, nextStatus, activeProjectId)
      if (!updated) return

      setTasks((current) => current?.map((item) => (item.id === task.id ? updated : item)))
      await invalidateTimelineQueries()
    } finally {
      setPendingAction(null)
    }
  }

  if (isLoading) {
    return <div className="page-shell"><LoadingState /></div>
  }

  if (isError || !data || !tasks) {
    return <div className="page-shell"><ErrorState onRetry={() => void refetch()} /></div>
  }

  const groups = {
    todo: tasks.filter((task) => task.status === 'todo'),
    in_progress: tasks.filter((task) => task.status === 'in_progress'),
    completed: tasks.filter((task) => task.status === 'completed'),
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Execution"
        title="Cronograma"
        description="Checklist e visão kanban com tarefas mockadas prontas para virar entidade persistida."
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetTaskDialog()
            }}
          >
            <DialogTrigger asChild>
              <Button className="rounded-2xl" onClick={openCreateTaskDialog} disabled={isMutating}>
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTaskId ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
                <DialogDescription>
                  {editingTaskId
                    ? 'Atualize os dados da tarefa no cronograma do projeto ativo.'
                    : 'Adicione um novo item ao cronograma do projeto ativo.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex: Revisar introdução"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capítulo</Label>
                  <Select
                    value={taskDraft.chapterId}
                    onValueChange={(value) => setTaskDraft((current) => ({ ...current, chapterId: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem capítulo</SelectItem>
                      {chapters?.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>{chapter.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={taskDraft.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => setTaskDraft((current) => ({ ...current, priority: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    disabled={isMutating}
                    onClick={() => {
                      setDialogOpen(false)
                      resetTaskDialog()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTask} disabled={isMutating}>
                    {pendingAction?.type === 'save'
                      ? editingTaskId
                        ? 'Salvando...'
                        : 'Criando...'
                      : editingTaskId
                        ? 'Salvar alterações'
                        : 'Criar tarefa'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="A fazer" value={groups.todo.length} helper="Itens aguardando execução" icon={Circle} />
        <StatCard title="Em andamento" value={groups.in_progress.length} helper="Etapas em produção acadêmica" icon={Clock3} />
        <StatCard title="Concluídas" value={groups.completed.length} helper="Marcos já cumpridos" icon={Plus} />
      </div>

      <Card className="surface-card rounded-[28px] border-amber-100 bg-amber-50/70">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <p className="font-medium text-foreground">Priorize prazos próximos</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Use o kanban para mover tarefas críticas e deixar o acompanhamento do TCC mais realista.
            </p>
          </div>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title="Nenhuma tarefa no cronograma"
          description="Crie a primeira tarefa para começar a acompanhar prazos e andamento do projeto ativo."
          action={
            <Button className="rounded-2xl" onClick={openCreateTaskDialog} disabled={isMutating}>
              <Plus className="h-4 w-4" />
              Nova tarefa
            </Button>
          }
        />
      ) : (
      <div className="grid gap-6 xl:grid-cols-3">
        {[
          ['todo', 'A fazer', 'neutral'],
          ['in_progress', 'Em andamento', 'primary'],
          ['completed', 'Concluído', 'success'],
        ].map(([key, label, tone]) => (
          <Card key={key} className="surface-card rounded-[30px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{label}</CardTitle>
              <StatusBadge label={`${groups[key as keyof typeof groups].length} itens`} tone={tone as 'neutral'} />
            </CardHeader>
              <CardContent className="space-y-3">
              {groups[key as keyof typeof groups].map((task) => (
                (() => {
                  const isTaskPending = pendingAction?.taskId === task.id

                  return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  aria-disabled={isMutating}
                  onClick={() => void handleAdvanceTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void handleAdvanceTask(task)
                    }
                  }}
                  className={`w-full rounded-[22px] border border-border bg-white px-4 py-4 text-left transition-colors hover:bg-muted/35 ${
                    isMutating ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isTaskPending
                          ? pendingAction?.type === 'delete'
                            ? 'Excluindo tarefa...'
                            : pendingAction?.type === 'advance'
                              ? 'Atualizando status...'
                              : 'Salvando alterações...'
                          : task.dueDate
                            ? `Entrega em ${new Date(task.dueDate).toLocaleDateString('pt-BR')}`
                            : `${task.priority} priority`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={task.priority}
                        tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            disabled={isMutating}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-[18px]">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              openEditTaskDialog(task)
                            }}
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteTask(task.id)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                  )
                })()
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  )
}
