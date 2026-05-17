import type { LucideIcon } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface AuthFieldProps {
  id: string
  label?: string
  placeholder: string
  type?: string
  icon: LucideIcon
}

export function AuthField({
  id,
  label,
  placeholder,
  type = 'text',
  icon: Icon,
}: AuthFieldProps) {
  return (
    <div className="space-y-2.5">
      {label ? (
        <Label htmlFor={id} className="font-sans text-[12px] font-medium text-foreground/92">
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition-colors duration-200">
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
        </span>
        <Input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          className="auth-input pl-[40px] md:text-[13px]"
        />
      </div>
    </div>
  )
}
