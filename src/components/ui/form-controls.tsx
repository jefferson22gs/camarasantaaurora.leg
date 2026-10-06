import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Checkbox as CheckboxPrimitive, Label as LabelPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, 'h-9 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'

/** Select nativo estilizado: acessível, ótimo em tablet/celular e compatível com react-hook-form. */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      fieldBase,
      'h-9 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23888%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9',
      className,
    )}
    {...props}
  >
    {children}
  </select>
))
NativeSelect.displayName = 'NativeSelect'

export const Label = ({ className, ...props }: LabelPrimitive.LabelProps) => <LabelPrimitive.Root className={cn('text-sm font-medium leading-none', className)} {...props} />

interface FieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  children: (id: string, describedBy?: string) => ReactNode
}

/** Campo de formulário com label, dica e mensagem de erro associadas por aria. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer grid size-4.5 shrink-0 place-items-center rounded-[5px] border border-input bg-card shadow-xs focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function CheckboxField({ label, description, ...props }: CheckboxPrimitive.CheckboxProps & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} className="mt-0.5" {...props} />
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent bg-input transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}

export function SwitchField({ label, description, ...props }: SwitchPrimitive.SwitchProps & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5">
      <div className="grid gap-1">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} {...props} />
    </div>
  )
}

export function RadioGroup({ className, ...props }: RadioPrimitive.RadioGroupProps) {
  return <RadioPrimitive.Root className={cn('grid gap-2', className)} {...props} />
}

export function RadioItem({ label, description, value, className }: { label: ReactNode; description?: ReactNode; value: string; className?: string }) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5', className)}
    >
      <RadioPrimitive.Item
        id={id}
        value={value}
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-input bg-card focus-visible:outline-2 focus-visible:outline-ring data-[state=checked]:border-primary"
      >
        <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary" />
      </RadioPrimitive.Item>
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

/** Date picker: input nativo (melhor experiência em tablet/celular, teclado acessível). */
export const DatePicker = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>((props, ref) => <Input ref={ref} type="date" lang="pt-BR" {...props} />)
DatePicker.displayName = 'DatePicker'
