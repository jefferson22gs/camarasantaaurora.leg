import type { ReactNode } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SessionTypeLabel } from '@/domain/labels'
import type { Session } from '@/types'

/** Limite para imagens simuladas (data URL persistida no localStorage). */
const MAX_IMAGE_BYTES = 512 * 1024

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Seleção de imagem com armazenamento simulado (data URL).
 * Fase 2: substituir por upload ao Supabase Storage, persistindo apenas o caminho.
 */
export function ImagePicker({ value, onChange, label, fallback, rounded = true }: { value?: string; onChange: (value: string | undefined) => void; label: string; fallback: ReactNode; rounded?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className={`grid size-16 shrink-0 place-items-center overflow-hidden border bg-muted ${rounded ? 'rounded-full' : 'rounded-lg'}`}>
        {value ? <img src={value} alt={`${label} atual`} className="size-full object-cover" /> : fallback}
      </div>
      <div className="grid gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer focus-within:outline-2 focus-within:outline-ring">
              <ImagePlus aria-hidden /> {value ? `Trocar ${label.toLowerCase()}` : `Enviar ${label.toLowerCase()}`}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  if (file.size > MAX_IMAGE_BYTES) {
                    toast.error('Imagem acima de 512 KB. Selecione um arquivo menor.')
                    return
                  }
                  onChange(await readFileAsDataUrl(file))
                }}
              />
            </label>
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <Trash2 aria-hidden /> Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP ou SVG até 512 KB (armazenamento simulado).</p>
      </div>
    </div>
  )
}

/** Rota de detalhe da proposição conforme a área atual. */
export function propositionPath(base: string, id: string) {
  return base === '/vereador' ? `/vereador/materias/${id}` : `/admin/proposicoes/${id}`
}

export function sessionLabel(s?: Pick<Session, 'type' | 'number' | 'year'>) {
  return s ? `${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}` : '—'
}
