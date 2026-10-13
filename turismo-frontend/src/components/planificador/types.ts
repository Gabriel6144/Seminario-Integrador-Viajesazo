import type { UbicacionRequest } from '@/types/api'

export interface ZoneItem {
  name: string
  label: string
  desc: string
  emoji: string
  ubicacion: UbicacionRequest
}

export interface InterestItem {
  name: string
  emoji: string
  label?: string
}

export interface RhythmItem {
  id: string
  emoji: string
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

