export function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-border bg-white/70">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        Carregando dados mockados...
      </div>
    </div>
  )
}
