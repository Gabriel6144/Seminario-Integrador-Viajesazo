import { Badge } from '@/components/ui/badge'
import { CATEGORIA_LABELS, type Categoria } from '@/types/api'

/** `null` cuando la propuesta no tiene categoría, que el backend permite. */
export function CategoriaBadge({ categoria }: { categoria: Categoria | null }) {
  if (categoria === null) return null
  return (
    <Badge className="rounded-full border-0 bg-[#d7a73b] px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
      {CATEGORIA_LABELS[categoria] ?? categoria}
    </Badge>
  )
}
