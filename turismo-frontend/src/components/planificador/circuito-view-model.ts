import {
  CATEGORIA_LABELS,
  CIRCUIT_STRATEGY_LABELS,
  type CircuitStrategy,
  type CircuitoAlternativaResponse,
  type CircuitoItemResponse,
  type InteresCategoria,
} from '@/types/api'
import type {
  CircuitoChip,
  CircuitoDia,
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
} from './types'

const FALLBACK_IMAGE =
  'https://placehold.co/800x500/e2e8f0/64748b?text=Viajesazo'

const CATEGORY_META: Record<
  InteresCategoria,
  { icon: string; badgeClass: string }
> = {
  NATURALEZA: { icon: 'forest', badgeClass: 'bg-emerald-600 text-white' },
  GASTRONOMIA: { icon: 'restaurant', badgeClass: 'bg-rose-600 text-white' },
  CULTURA: { icon: 'palette', badgeClass: 'bg-[#d7a73b] text-amber-950' },
  HISTORIA: { icon: 'account_balance', badgeClass: 'bg-slate-800/90 text-amber-300' },
  AVENTURA: { icon: 'hiking', badgeClass: 'bg-orange-600 text-white' },
  VIDA_NOCTURNA: { icon: 'nightlife', badgeClass: 'bg-indigo-700 text-white' },
  MUSICA: { icon: 'music_note', badgeClass: 'bg-purple-700 text-white' },
  COMPRAS: { icon: 'shopping_bag', badgeClass: 'bg-pink-600 text-white' },
  FAMILIAR_Y_RELAX: { icon: 'family_restroom', badgeClass: 'bg-sky-600 text-white' },
}

const STRATEGY_META: Record<
  CircuitStrategy,
  {
    categoryTag: string
    categoryIcon: string
    ventajas: string[]
    consideraciones: string[]
  }
> = {
  CERCANIA: {
    categoryTag: 'Ruta compacta',
    categoryIcon: 'near_me',
    ventajas: ['Minimiza los traslados', 'Ideal si tenés poco tiempo'],
    consideraciones: ['Prioriza la cercanía sobre la afinidad'],
  },
  INTERESES: {
    categoryTag: 'A tu medida',
    categoryIcon: 'tune',
    ventajas: ['Prioriza tus categorías favoritas', 'Mayor afinidad con tu viaje'],
    consideraciones: ['Puede requerir traslados más largos'],
  },
  DESCUBRIMIENTO: {
    categoryTag: 'Nuevas experiencias',
    categoryIcon: 'explore',
    ventajas: ['Incluye propuestas variadas', 'Evita repetir categorías'],
    consideraciones: ['Algunas paradas pueden estar fuera de tu zona habitual'],
  },
}

const PACE_LABELS: Record<string, string> = {
  Tranquilo: 'Relajado',
  Equilibrado: 'Equilibrado',
  Intensivo: 'Intenso',
}

function formatTime(value: string | null): string {
  if (!value) return '--:--'
  return value.slice(0, 5)
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return 'Duración a confirmar'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

function durationBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  if ([startH, startM, endH, endM].some(Number.isNaN)) return null
  return endH * 60 + endM - (startH * 60 + startM)
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function formatPrice(item: CircuitoItemResponse): string {
  if (item.tipoAcceso === 'GRATUITO') return 'Entrada gratuita'
  if (item.montoEstimado !== null) {
    return `$${item.montoEstimado.toLocaleString('es-AR')}`
  }
  return 'Consultar valor'
}

function locationLabel(item: CircuitoItemResponse): string {
  const parts = [item.lugarRecinto, item.direccion, item.localidad, item.ciudad]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, index, all) => all.indexOf(part) === index)
  return parts.length > 0 ? parts.join(', ') : 'Ubicación a confirmar'
}

function categoryLabel(item: CircuitoItemResponse): string {
  return item.categoria ? CATEGORIA_LABELS[item.categoria] : 'Experiencia'
}

function categoryMeta(item: CircuitoItemResponse) {
  return item.categoria
    ? CATEGORY_META[item.categoria]
    : { icon: 'star', badgeClass: 'bg-slate-700 text-white' }
}

function buildDaySummary(
  stops: ParadaCircuitoDetalle[],
  totalKm: number,
  totalMinutes: number,
): string {
  if (stops.length === 0) return 'Sin paradas asignadas'
  const hours = Math.max(1, Math.round(totalMinutes / 60))
  return `${stops.length} paradas · ${formatDistance(totalKm)} · ~${hours} h`
}

function toStop(
  item: CircuitoItemResponse,
  number: number,
  next: CircuitoItemResponse | undefined,
): ParadaCircuitoDetalle {
  const meta = categoryMeta(item)
  const start = formatTime(item.horaInicio)
  const end = formatTime(item.horaFin)
  const duration =
    item.duracionMinutos ?? durationBetween(item.horaInicio, item.horaFin)
  const transfer =
    next && (next.trasladoKm > 0 || next.trasladoMinutos > 0)
      ? `${formatDistance(next.trasladoKm)} · ${next.trasladoMinutos} min de traslado`
      : undefined

  return {
    id: `${item.propuestaId}-${item.fecha}-${item.orden}`,
    number,
    time: start,
    title: item.propuestaNombre,
    category: categoryLabel(item),
    badgeClass: meta.badgeClass,
    description: item.descripcion ?? 'Una experiencia para sumar a tu recorrido.',
    detailDescription:
      [item.descripcion, item.descripcionArancel].filter(Boolean).join(' ') ||
      'Una experiencia para sumar a tu recorrido.',
    location: locationLabel(item),
    hours:
      item.horaInicio && item.horaFin
        ? `${start} - ${end}`
        : 'Horario a confirmar',
    price: formatPrice(item),
    image: item.imagenes[0] ?? FALLBACK_IMAGE,
    duration: formatDuration(duration),
    walkNext: transfer,
    latitud: item.latitud ?? undefined,
    longitud: item.longitud ?? undefined,
    disponible: item.disponible,
    motivoNoDisponible: item.motivoNoDisponible,
  }
}

export function toCircuitoRecomendado(
  alternativa: CircuitoAlternativaResponse,
  rhythm: string,
): CircuitoRecomendado {
  const items = [...alternativa.propuestas].sort((a, b) => {
    const byDate = a.fecha.localeCompare(b.fecha)
    return byDate !== 0 ? byDate : a.orden - b.orden
  })

  const dates = [...new Set(items.map((item) => item.fecha))]
  if (dates.length === 0) {
    dates.push('')
  }

  const stopsByDay: Record<number, ParadaCircuitoDetalle[]> = {}
  const days: CircuitoDia[] = dates.map((date, index) => {
    const dayItems = items.filter((item) => item.fecha === date)
    const dayNumber = index + 1
    const stops = dayItems.map((item, itemIndex) =>
      toStop(item, itemIndex + 1, dayItems[itemIndex + 1]),
    )
    stopsByDay[dayNumber] = stops
    const totalKm = dayItems.reduce((total, item) => total + item.trasladoKm, 0)
    const totalMinutes = dayItems.reduce((total, item) => {
      return total + ((item.duracionMinutos ?? durationBetween(item.horaInicio, item.horaFin)) ?? 0)
    }, 0)
    return {
      number: dayNumber,
      fecha: date,
      summary: buildDaySummary(stops, totalKm, totalMinutes),
    }
  })

  const firstStop = stopsByDay[1]?.[0]
  const meta = STRATEGY_META[alternativa.estrategia]
  const chips: CircuitoChip[] = [
    {
      icon: 'schedule',
      label: `${days.length} ${days.length === 1 ? 'día' : 'días'}`,
      variant: 'sky',
    },
    {
      icon: 'map',
      label: `${items.length} ${items.length === 1 ? 'parada' : 'paradas'}`,
      variant: 'amber',
    },
    {
      icon: 'star',
      label: `${Math.round(alternativa.afinidadIntereses * 100)}% afinidad`,
      variant: 'slate',
    },
  ]

  return {
    id: alternativa.estrategia,
    estrategia: alternativa.estrategia,
    title: CIRCUIT_STRATEGY_LABELS[alternativa.estrategia],
    affinity: `${Math.round(alternativa.afinidadIntereses * 100)}% Afinidad`,
    image: firstStop?.image ?? FALLBACK_IMAGE,
    categoryTag: meta.categoryTag,
    categoryIcon: meta.categoryIcon,
    daysLabel: `${days.length} ${days.length === 1 ? 'Día' : 'Días'}`,
    paceLabel: PACE_LABELS[rhythm] ?? 'Equilibrado',
    chips,
    ventajas: meta.ventajas,
    consideraciones: alternativa.advertencia
      ? [...meta.consideraciones, alternativa.advertencia]
      : meta.consideraciones,
    days,
    stopsByDay,
  }
}

export function buildMapStops(
  circuito: CircuitoRecomendado,
  day: number,
): Array<{
  id: string
  number: number
  title: string
  category: string
  categoryClass: string
  time: string
  duration: string
  walkingDist: string
  desc: string
  address: string
  recomendacion: string
  img: string
  lat: number
  lng: number
}> {
  return (circuito.stopsByDay[day] ?? []).map((stop) => ({
    id: stop.id,
    number: stop.number,
    title: stop.title,
    category: stop.category,
    categoryClass: 'bg-sky-50 text-sky-700',
    time: stop.hours,
    duration: stop.duration,
    walkingDist: stop.walkNext ?? 'Punto de partida',
    desc: stop.detailDescription,
    address: stop.location,
    recomendacion: stop.price,
    img: stop.image,
    lat: stop.latitud ?? -31.4254,
    lng: stop.longitud ?? -64.1873,
  }))
}

export function firstDayWithStops(circuito: CircuitoRecomendado): number {
  return circuito.days.find((day) => (circuito.stopsByDay[day.number] ?? []).length > 0)?.number ?? 1
}
