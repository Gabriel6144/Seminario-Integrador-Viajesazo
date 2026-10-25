import type { LocalDate } from '@/types/api'

interface AgrupablePorDia {
  fechaInicio: LocalDate | null
}

/**
 * Agrupa los eventos por día de inicio, para la agenda.
 *
 * Usa un `Map` en vez de un objeto indexado por string: no requiere castear las claves y las
 * inserciones conservan el orden de llegada, así el resultado sale en el mismo orden que la
 * consulta (que ya viene ordenada por fecha). Todo en una sola pasada.
 *
 * La clave es `fechaInicio` completa (`yyyy-MM-dd`), no solo el día de la semana: son cadenas, y
 * en ese formato el orden lexicográfico ya coincide con el cronológico.
 */
export function groupByDay<T extends AgrupablePorDia>(eventos: T[]): Array<[string, T[]]> {
  const byDay = new Map<string, T[]>()
  for (const evento of eventos) {
    if (evento.fechaInicio === null) continue
    const bucket = byDay.get(evento.fechaInicio)
    if (bucket === undefined) {
      byDay.set(evento.fechaInicio, [evento])
    } else {
      bucket.push(evento)
    }
  }
  return [...byDay.entries()]
}
