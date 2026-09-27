import { Badge } from '@/components/ui/badge'
import type { Categoria } from '@/types/api'

/**
 * Etiquetas y colores del enum `Categoria` del backend.
 *
 * El backend persiste y devuelve el nombre de la constante en mayúsculas (`"CULTURA"`), que no es
 * lo que se quiere mostrar. Los mapas se arman una vez a nivel de módulo: recorrer las cinco
 * entradas en cada render es trabajo repetido dentro de un `.map()` sobre una grilla.
 */
const CATEGORIA_LABELS: Record<Categoria, string> = {
  GASTRONOMIA: 'Gastronomía',
  FAMILIA: 'Familia',
  CULTURA: 'Cultura',
  NATURALEZA: 'Naturaleza',
  AVENTURA: 'Aventura',
}

/**
 * Se usan los **tokens semánticos** de shadcn (`secondary`, `outline`, ...) en vez de colores
 * crudos como `bg-emerald-500`, así el tema funciona en claro y oscuro y no se pisa el estilo del
 * componente. Hay cinco categorías pero solo tres tonos: lo que importa es que cada una se
 * reconozca de un vistazo, no que sean cinco colores distintos.
 */
const CATEGORIA_VARIANTS: Record<Categoria, 'default' | 'secondary' | 'outline'> = {
  GASTRONOMIA: 'default',
  CULTURA: 'secondary',
  AVENTURA: 'secondary',
  NATURALEZA: 'outline',
  FAMILIA: 'outline',
}

/** `null` cuando el evento no tiene categoría, que el backend permite. */
export function CategoriaBadge({ categoria }: { categoria: Categoria | null }) {
  if (categoria === null) return null
  return <Badge variant={CATEGORIA_VARIANTS[categoria]}>{CATEGORIA_LABELS[categoria]}</Badge>
}
