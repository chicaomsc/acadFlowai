import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar projetos, capítulos ou referências...',
}: SearchInputProps) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-[20px] border-white/80 bg-white/88 pl-10 shadow-sm"
      />
    </div>
  )
}
