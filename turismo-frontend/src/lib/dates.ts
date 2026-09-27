import type { LocalDate, LocalTime } from '@/types/api'

/**
 * Helpers de fecha y hora.
 *
 * REGLA DE ORO: nunca usar `new Date(isoString)` con un `LocalDate` de Java.
 *
 * `new Date("2026-10-01")` se parsea como **medianoche UTC**, y en Argentina (UTC-3) eso se
 * muestra como 30 de septiembre. El error aparece solo en este huso y pasa desapercibido en
 * CI, así que hay que construir la fecha a mano por componentes: `new Date(y, m - 1, d)` usa
 * hora local y no arrastra el corrimiento.
 *
 * Para comparar dos `LocalDate` tampoco hace falta `Date`: en formato `yyyy-MM-dd` el orden
 * lexicográfico coincide con el cronológico, así que `<` y `>` sobre el string ya funcionan.
 */

function toLocalDate(iso: LocalDate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** `"2026-10-01"` → `"1 de octubre de 2026"`. */
export function formatLocalDate(iso: LocalDate): string {
  return toLocalDate(iso).toLocaleDateString('es-AR', { dateStyle: 'long' })
}

/** `"2026-10-01"` → `"jue 1 oct"`. */
export function formatWeekdayAndDate(iso: LocalDate): string {
  return toLocalDate(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Rango de fechas legible. Si el evento dura un solo día muestra una fecha; si cruza meses
 * muestra las dos completas.
 *
 *   fechaInicio === fechaFin → "1 de octubre de 2026"
 *   mismo mes y año         → "Del 1 al 3 de octubre de 2026"
 *   meses distintos         → "Del 1 de septiembre al 3 de octubre de 2026"
 */
export function formatDateRange(inicio: LocalDate, fin: LocalDate): string {
  if (inicio === fin) return formatLocalDate(inicio)

  const from = toLocalDate(inicio)
  const to = toLocalDate(fin)

  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `Del ${from.getDate()} al ${to.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`
  }
  return `Del ${formatLocalDate(inicio)} al ${formatLocalDate(fin)}`
}

/**
 * Rango horario, o `null` si no hay horario.
 *
 * Jackson 3 serializa `LocalTime` **siempre con segundos**: contra la API real, `"20:00"` sale
 * como `"20:00:00"`. Mostrar `"20:00:00"` es ruido, así que se recorta a `HH:mm`. El recorte
 * también hace que la comparación de "inicio == fin" sea robusta: comparar los strings crudos
 * daría `"20:00"` ≠ `"20:00:00"` para la misma hora.
 */
export function formatTimeRange(
  inicio: LocalTime | null,
  fin: LocalTime | null,
): string | null {
  // Se chequea `fin` primero: si el primer caso fuera `inicio === null && fin === null`,
  // TypeScript no narrowea `fin` a no-nulo en la línea siguiente (no distributes la negación
  // sobre un `&&` compuesto) y habría que castear.
  if (fin === null) return inicio === null ? null : truncateToMinutes(inicio)
  if (inicio === null) return truncateToMinutes(fin)

  const from = truncateToMinutes(inicio)
  const to = truncateToMinutes(fin)
  return from === to ? from : `${from} a ${to}`
}

function truncateToMinutes(time: LocalTime): string {
  return time.slice(0, 5)
}
