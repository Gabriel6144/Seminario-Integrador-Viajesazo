import type { CircuitStrategy, UbicacionRequest } from '@/types/api'

export interface ZoneItem {
  name: string
  label: string
  desc: string
  icon: string
  emoji?: string
  ubicacion: UbicacionRequest
}

/**
 * Zona de destino elegida en el paso 4. No es necesariamente un hospedaje: es el punto base
 * desde el que se exploran las actividades. `nombre` es solo para mostrar; lo que viaja a la
 * API es `ciudad` + `localidad` + coordenadas dentro de `UbicacionRequest`.
 */
export interface DestinoSeleccionado {
  nombre: string
  ciudad: string
  localidad: string | null
  latitud: number
  longitud: number
}

export interface InterestItem {
  name: string
  icon: string
  emoji?: string
  label?: string
}

export interface RhythmItem {
  id: string
  title: string
  desc: string
  tag: string
  badgeClass: string
  iconBg: string
}

export interface LoadingStep {
  title: string
  sub: string
  bar: number
}

export interface ActivityItem {
  time: string
  cat: string
  catClass: string
  dur: string
  title: string
  desc: string
}

export interface CircuitoChip {
  icon: string
  label: string
  variant: 'sky' | 'amber' | 'slate'
}

export interface CircuitoDia {
  number: number
  fecha: string
  summary: string
}

export interface CircuitoRecomendado {
  id: string
  estrategia: CircuitStrategy
  title: string
  affinity: string
  image: string
  categoryTag: string
  categoryIcon: string
  daysLabel: string
  paceLabel: string
  chips: CircuitoChip[]
  ventajas: string[]
  consideraciones: string[]
  days: CircuitoDia[]
  stopsByDay: Record<number, ParadaCircuitoDetalle[]>
}

export interface ParadaCircuitoDetalle {
  id: string
  number: number
  time: string
  title: string
  category: string
  badgeClass: string
  description: string
  detailDescription: string
  location: string
  hours: string
  price: string
  image: string
  duration: string
  walkNext?: string
  latitud?: number
  longitud?: number
  disponible: boolean
  motivoNoDisponible?: string | null
}

export interface AlternativaReemplazo {
  id: string
  title: string
  category: string
  badgeClass: string
  description: string
  walkDistance: string
  image: string
  location: string
  hours: string
  price: string
  latitud?: number
  longitud?: number
}
