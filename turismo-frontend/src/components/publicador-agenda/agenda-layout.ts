import { addDaysLocalDate } from '@/lib/dates'
import type { LocalDate, PublicadorAgendaItemResponse } from '@/types/api'

export type AgendaCalendarView = 'month' | 'week'

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

export function agendaDayHeaders(): readonly string[] {
  return DAY_HEADERS
}

export function toIsoLocalDate(date: Date): LocalDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** True si el día ISO es anterior a hoy (calendario local). */
export function isAgendaDayPast(day: LocalDate, today: LocalDate = toIsoLocalDate(new Date())): boolean {
  return day < today
}

/** Lunes de la semana ISO-like (lunes = inicio) que contiene `anchor`. */
export function startOfWeekMonday(anchor: LocalDate): LocalDate {
  const [y, m, d] = anchor.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0=dom … 6=sáb
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + offset)
  return toIsoLocalDate(date)
}

export function weekDaysFromAnchor(anchor: LocalDate): LocalDate[] {
  const start = startOfWeekMonday(anchor)
  return Array.from({ length: 7 }, (_, i) => addDaysLocalDate(start, i))
}

export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
}

export function weekRangeLabel(days: LocalDate[]): string {
  if (days.length === 0) return ''
  const first = days[0]
  const last = days[days.length - 1]
  const [fy, fm, fd] = first.split('-').map(Number)
  const [ly, lm, ld] = last.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd)
  const to = new Date(ly, lm - 1, ld)
  if (fy === ly && fm === lm) {
    return `${from.getDate()}–${to.getDate()} ${to.toLocaleDateString('es-AR', {
      month: 'short',
      year: 'numeric',
    })}`
  }
  return `${from.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Celdas del mes (lunes-first); `null` = padding fuera del mes. */
export function monthCellDays(year: number, monthIndex: number): Array<LocalDate | null> {
  const total = daysInMonth(year, monthIndex)
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const offset = (firstWeekday + 6) % 7
  const cells: Array<LocalDate | null> = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= total; day++) {
    cells.push(
      `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    )
  }
  return cells
}

function compareAgendaItems(a: PublicadorAgendaItemResponse, b: PublicadorAgendaItemResponse): number {
  const aStart = a.horarioInicio ?? ''
  const bStart = b.horarioInicio ?? ''
  if (aStart !== bStart) return aStart < bStart ? -1 : 1
  return a.nombre.localeCompare(b.nombre, 'es')
}

/** Agrupa propuestas por cada día del rango (permite varios el mismo día). */
export function indexItemsByDay(
  items: PublicadorAgendaItemResponse[],
): Map<LocalDate, PublicadorAgendaItemResponse[]> {
  const map = new Map<LocalDate, PublicadorAgendaItemResponse[]>()
  for (const item of items) {
    let day = item.fechaInicio
    while (day <= item.fechaFin) {
      const list = map.get(day)
      if (list) {
        list.push(item)
      } else {
        map.set(day, [item])
      }
      day = addDaysLocalDate(day, 1)
    }
  }
  for (const list of map.values()) {
    list.sort(compareAgendaItems)
  }
  return map
}

/** Minutos desde 00:00 para posicionar en vista semana (0–1440). */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export function formatAgendaTimeRange(
  inicio: string | null | undefined,
  fin: string | null | undefined,
): string {
  if (!inicio && !fin) return 'Todo el día'
  const from = inicio ? inicio.slice(0, 5) : '—'
  const to = fin ? fin.slice(0, 5) : '—'
  if (!inicio || !fin) return inicio ? from : to
  return from === to ? from : `${from}–${to}`
}

/** Días a sumar a fechaInicio para obtener fechaFin (0 = un solo día). */
export function durationOffsetDays(item: PublicadorAgendaItemResponse): number {
  const [ys, ms, ds] = item.fechaInicio.split('-').map(Number)
  const [ye, me, de] = item.fechaFin.split('-').map(Number)
  const start = new Date(ys, ms - 1, ds)
  const end = new Date(ye, me - 1, de)
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Destino válido para DnD: EVENTO/ACTIVIDAD, distinto del inicio actual,
 * y no anterior a hoy.
 */
export function isValidAgendaDrop(
  _items: PublicadorAgendaItemResponse[],
  item: PublicadorAgendaItemResponse,
  targetDay: LocalDate,
  today: LocalDate = toIsoLocalDate(new Date()),
): boolean {
  if (item.tipo !== 'EVENTO' && item.tipo !== 'ACTIVIDAD') return false
  if (targetDay === item.fechaInicio) return false
  if (isAgendaDayPast(targetDay, today)) return false
  return true
}

/**
 * Id único de drag. Con `dayIso` permite una instancia arrastrable por cada día del rango
 * (`evento-7-2026-11-21`) sin chocar en dnd-kit.
 */
export function draggableIdForEvento(propuestaId: number, dayIso?: LocalDate): string {
  return dayIso != null ? `evento-${propuestaId}-${dayIso}` : `evento-${propuestaId}`
}

/** Extrae el propuestaId de `evento-7` o `evento-7-2026-11-21`. */
export function parseDraggableEventoId(id: string | number): number | null {
  const s = String(id)
  if (!s.startsWith('evento-')) return null
  const rest = s.slice('evento-'.length)
  const propuestaPart = rest.split('-')[0]
  const n = Number(propuestaPart)
  return Number.isFinite(n) ? n : null
}

export function agendaDetailPath(item: PublicadorAgendaItemResponse): string {
  return item.tipo === 'ACTIVIDAD'
    ? `/actividades/${item.propuestaId}`
    : `/eventos/${item.propuestaId}`
}

export function truncateAgendaDescription(
  text: string | null | undefined,
  max = 120,
): string | null {
  if (!text) return null
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}
