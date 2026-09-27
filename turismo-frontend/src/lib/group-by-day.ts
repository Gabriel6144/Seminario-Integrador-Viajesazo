import type { EventoResponse } from '@/types/api'

/**
 * Agrupa los eventos por día de inicio, para la agenda semanal.
 *
 * Usa un `Map` en vez de un objeto indexado por string: no requiere castear las claves y las
 * inserciones conservan el orden de llegada, así el resultado sale en el mismo orden que la
 * consulta (que ya viene ordenada por fecha). Todo en una sola pasada.
 *
 * La clave es `fechaInicio` completa (`yyyy-MM-dd`), no solo el día de la semana: son cadenas, y
 * en ese formato el orden lexicográfico ya coincide con el cronológico.
 */
export function groupByDay(eventos: EventoResponse[]): Array<[string, EventoResponse[]]> {
  const byDay = new Map<string, EventoResponse[]>()
  for (const evento of eventos) {
    const bucket = byDay.get(evento.fechaInicio)
    if (bucket === undefined) {
      byDay.set(evento.fechaInicio, [evento])
    } else {
      bucket.push(evento)
    }
  }
  return [...byDay.entries()]
}
