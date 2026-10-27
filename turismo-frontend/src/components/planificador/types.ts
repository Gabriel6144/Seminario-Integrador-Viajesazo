import type { UbicacionRequest } from '@/types/api'

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

export interface CircuitoRecomendado {
  id: string
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
}

export interface ParadaCircuitoDetalle {
  id: string
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
  walkNext?: string
  latitud?: number
  longitud?: number
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
