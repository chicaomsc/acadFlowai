import { useEffect, useMemo, useRef, useState } from 'react'
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

type TimelineStatus = TimelineTask['status']

function isDesktopDragAvailable() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: fine)').matches
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
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; fromStatus: TimelineStatus } | null>(null)
  const [dropColumn, setDropColumn] = useState<TimelineStatus | null>(null)
  const [dragEnabled, setDragEnabled] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null)
  const dragStartRef = useRef<{ taskId: string; fromStatus: TimelineStatus; x: number; y: number } | null>(null)
  const activeDragRef = useRef<{ taskId: string; fromStatus: TimelineStatus } | null>(null)
  const currentDropColumnRef = useRef<TimelineStatus | null>(null)
  const columnRefs = useRef<Record<TimelineStatus, HTMLDivElement | null>>({
    todo: null,
    in_progress: null,
    completed: null,
  })

  const isMutating = pendingAction !== null

  useEffect(() => {
    if (data) setTasks(data)
  }, [data])

  useEffect(() => {
    setDragEnabled(isDesktopDragAvailable())
  }, [])

  useEffect(() => {
    currentDropColumnRef.current = dropColumn
  }, [dropColumn])

  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

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

  async function handleMoveTaskFromMenu(taskId: string, nextStatus: TimelineStatus) {
    await commitTaskStatusChange(taskId, nextStatus)
  }

  const taskLookup = useMemo(
    () => new Map((tasks ?? []).map((task) => [task.id, task])),
    [tasks],
  )

  function moveTaskLocally(taskId: string, nextStatus: TimelineStatus) {
    setTasks((current) => current?.map((item) => (
      item.id === taskId ? { ...item, status: nextStatus } : item
    )))
  }

  async function commitTaskStatusChange(taskId: string, nextStatus: TimelineStatus) {
    if (isMutating) return

    const task = taskLookup.get(taskId)
    if (!task || task.status === nextStatus) return

    setPendingAction({ type: 'advance', taskId })
    setFeedback(null)
    const previousTasks = tasks ? structuredClone(tasks) : undefined
    moveTaskLocally(taskId, nextStatus)

    try {
      const updated = await updateTimelineTaskStatus(taskId, nextStatus, activeProjectId)
      if (!updated) {
        throw new Error('Não foi possível atualizar o status da tarefa.')
      }

      setTasks((current) => current?.map((item) => (item.id === taskId ? updated : item)))
      await invalidateTimelineQueries()
    } catch (error) {
      setTasks(previousTasks)
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível mover a tarefa agora.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  function cleanupPointerDrag() {
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
  }

  function getDropColumnFromPoint(clientX: number, clientY: number): TimelineStatus | null {
    const statuses: TimelineStatus[] = ['todo', 'in_progress', 'completed']

    for (const status of statuses) {
      const column = columnRefs.current[status]
      if (!column) continue

      const rect = column.getBoundingClientRect()
      const isInside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom

      if (isInside) {
        return status
      }
    }

    return null
  }

  function handleTaskDragEnd() {
    cleanupPointerDrag()
    dragStartRef.current = null
    activeDragRef.current = null
    currentDropColumnRef.current = null
    setDraggedTask(null)
    setDropColumn(null)
  }

  function handlePointerMove(event: PointerEvent) {
    const dragStart = dragStartRef.current
    if (!dragStart || isMutating) return

    const movedEnough =
      Math.abs(event.clientX - dragStart.x) > 6 ||
      Math.abs(event.clientY - dragStart.y) > 6

    if (!activeDragRef.current && movedEnough) {
      activeDragRef.current = { taskId: dragStart.taskId, fromStatus: dragStart.fromStatus }
      setDraggedTask({ taskId: dragStart.taskId, fromStatus: dragStart.fromStatus })
      setFeedback(null)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }

    if (!movedEnough) return

    const nextDropColumn = getDropColumnFromPoint(event.clientX, event.clientY)
    currentDropColumnRef.current = nextDropColumn
    setDropColumn(nextDropColumn)
  }

  function handlePointerUp() {
    const dragStart = dragStartRef.current
    const activeDrag = activeDragRef.current ?? (dragStart ? { taskId: dragStart.taskId, fromStatus: dragStart.fromStatus } : null)
    const nextDropColumn = currentDropColumnRef.current

    handleTaskDragEnd()

    if (!activeDrag || !nextDropColumn || activeDrag.fromStatus === nextDropColumn) return
    void commitTaskStatusChange(activeDrag.taskId, nextDropColumn)
  }

  function handleTaskPointerDown(event: React.PointerEvent<HTMLDivElement>, taskId: string) {
    if (!dragEnabled || isMutating) return
    if ((event.target as HTMLElement).closest('button,[role="menuitem"]')) return

    const task = taskLookup.get(taskId)
    if (!task) return

    dragStartRef.current = {
      taskId,
      fromStatus: task.status,
      x: event.clientX,
      y: event.clientY,
    }
    activeDragRef.current = null

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
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
        description="Checklist e visão kanban para acompanhar prazos e andamento do projeto ativo."
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

      {feedback ? (
        <p className={feedback.tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-primary'}>
          {feedback.message}
        </p>
      ) : null}

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
          <Card
            key={key}
            className={`surface-card rounded-[30px] transition-colors ${
              dropColumn === key ? 'border-primary/40 bg-primary/5' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{label}</CardTitle>
              <StatusBadge label={`${groups[key as keyof typeof groups].length} itens`} tone={tone as 'neutral'} />
            </CardHeader>
              <CardContent className="pt-0">
                <div
                  ref={(node) => {
                    columnRefs.current[key as TimelineStatus] = node
                  }}
                  className={`min-h-[240px] space-y-3 rounded-[24px] p-1 transition-colors ${
                    dropColumn === key ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                  }`}
                >
              {groups[key as keyof typeof groups].map((task) => (
                (() => {
                  const isTaskPending = pendingAction?.taskId === task.id
                  const isDragging = draggedTask?.taskId === task.id

                  return (
                <div
                  key={task.id}
                  role="group"
                  aria-disabled={isMutating}
                  onPointerDown={(event) => handleTaskPointerDown(event, task.id)}
                  className={`w-full rounded-[22px] border border-border bg-white px-4 py-4 text-left transition-colors ${
                    isDragging
                      ? 'cursor-grabbing opacity-60 shadow-lg ring-2 ring-primary/15'
                      : dragEnabled
                        ? 'cursor-grab hover:bg-muted/35 active:cursor-grabbing'
                        : 'hover:bg-muted/35'
                  } ${
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
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-[18px]">
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
                            disabled={isMutating || task.status === 'todo'}
                            onSelect={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleMoveTaskFromMenu(task.id, 'todo')
                            }}
                          >
                            Mover para A fazer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isMutating || task.status === 'in_progress'}
                            onSelect={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleMoveTaskFromMenu(task.id, 'in_progress')
                            }}
                          >
                            Mover para Em andamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isMutating || task.status === 'completed'}
                            onSelect={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleMoveTaskFromMenu(task.id, 'completed')
                            }}
                          >
                            Mover para Concluído
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
                </div>
              </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  )
}
