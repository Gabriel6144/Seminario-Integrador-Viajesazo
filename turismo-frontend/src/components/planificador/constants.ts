import type { InteresCategoria, TipoRitmo } from '@/types/api'
import type { InterestItem, RhythmItem, ZoneItem } from './types'

export const ASISTENTE_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCbZKsGcD0xrEOEeozKzqfLLJKdMsUKJA4HhQwyjwhvnr8tCSW5qnBlb7kaZZpcJ4BjC7ISYJGTFJFAPBWT3KyEcK_Wlwxr-HWEayC_DRqjdp27xhwV3d8A9UJVNVhqFz9BIDM4t1zr_MHoGbkUmkWMabstRwrOWv_ldGXankjVIDPt5iHuly4wG4RJfiz_GfID4SFwaWSO7u2mAm1O_XnsFDOA94Sx9OLDROlHlCacYB4-Ssvp2GmYOsh5v_cVO4WV-B4'

export const GUIA_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCzExuco80JKkW9A1GrARQStb-dumG-R-2EinWxQWQHG4UIkPQ0oumk38UzslIwryGneVxxaqNt5pBNlArJZJMWOvO8btNDuP4Masw10GYFAO6EuLwiiytR2hN5VP5ITGT9FNW4Wyox8ObpTS40-g24DknoAINJ0yo5zPS0Ht7m5jxwe_ut5Ws1DW5ZapYUuE3G6K3O8eZadUfDHRtVj0hrAuXOoPQNS26JLxfYtq_KyQG-EVO5ac1TqscVqFIuv4KseJk'

export const RANDOM_NAMES = [
  'Escapada a Córdoba',
  'Aventura cordobesa',
  'Córdoba con amigos',
  'Nuestro finde serrano',
  'Sabores & Paisajes',
  'Ruta del Fernet & Sierras',
]

export const ZONES: ZoneItem[] = [
  {
    name: 'Centro Histórico',
    label: 'Centro Histórico & Nueva Córdoba',
    desc: 'Museos, vida urbana y gastronomía',
    icon: 'account_balance',
    ubicacion: {
      ciudad: 'Córdoba',
      localidad: 'Centro Histórico',
      latitud: -31.4201,
      longitud: -64.1888,
    },
  },
  {
    name: 'Villa Carlos Paz',
    label: 'Villa Carlos Paz (Valle de Punilla)',
    desc: 'Lago San Roque, teatros y sierras',
    icon: 'forest',
    ubicacion: {
      ciudad: 'Villa Carlos Paz',
      localidad: 'Valle de Punilla',
      latitud: -31.4241,
      longitud: -64.4978,
    },
  },
  {
    name: 'La Cumbrecita / Calamuchita',
    label: 'La Cumbrecita & Valle de Calamuchita',
    desc: 'Bosques, cascadas y aldeas alpinas',
    icon: 'nature',
    ubicacion: {
      ciudad: 'La Cumbrecita',
      localidad: 'Valle de Calamuchita',
      latitud: -31.8988,
      longitud: -64.7731,
    },
  },
  {
    name: 'Colonia Caroya / Sierras Chicas',
    label: 'Colonia Caroya & Sierras Chicas',
    desc: 'Bodegas, salames y estancias jesuitas',
    icon: 'wine_bar',
    ubicacion: {
      ciudad: 'Colonia Caroya',
      localidad: 'Sierras Chicas',
      latitud: -30.9833,
      longitud: -64.0833,
    },
  },
  {
    name: 'Mina Clavero / Traslasierra',
    label: 'Mina Clavero & Traslasierra',
    desc: 'Ríos cristalinos y microclima serrano',
    icon: 'landscape',
    ubicacion: {
      ciudad: 'Mina Clavero',
      localidad: 'Traslasierra',
      latitud: -31.7214,
      longitud: -65.0069,
    },
  },
]

/**
 * Tope del radio de exploración. 250 km alcanza casi toda la provincia desde cualquier base
 * turística, sin quedar atado a un rango corto tipo urbano.
 */
export const RADIO_MAX_KM = 250

export const RADIO_PRESETS = [
  { km: 10, label: 'Cerca' },
  { km: 50, label: 'Región' },
  { km: RADIO_MAX_KM, label: 'Provincia' },
] as const

export const INTEREST_MAP: Record<string, InteresCategoria> = {
  Naturaleza: 'NATURALEZA',
  Gastronomía: 'GASTRONOMIA',
  Cultura: 'CULTURA',
  Historia: 'HISTORIA',
  Aventura: 'AVENTURA',
  'Vida nocturna': 'VIDA_NOCTURNA',
  Música: 'MUSICA',
  Compras: 'COMPRAS',
  Familiar: 'FAMILIAR_Y_RELAX',
}

export const RHYTHM_MAP: Record<string, TipoRitmo> = {
  Tranquilo: 'TRANQUILO',
  Equilibrado: 'EQUILIBRADO',
  Intensivo: 'INTENSIVO',
}

export const ALL_INTERESTS: InterestItem[] = [
  { name: 'Naturaleza', icon: 'forest' },
  { name: 'Gastronomía', icon: 'restaurant' },
  { name: 'Cultura', icon: 'palette' },
  { name: 'Historia', icon: 'account_balance' },
  { name: 'Aventura', icon: 'hiking' },
  { name: 'Vida nocturna', icon: 'nightlife', label: 'Noche & Bares' },
  { name: 'Música', icon: 'music_note', label: 'Música & Cuarteto' },
  { name: 'Compras', icon: 'shopping_bag', label: 'Compras & Ferias' },
  { name: 'Familiar', icon: 'family_restroom', label: 'Familiar' },
]

export const RHYTHMS: RhythmItem[] = [
  {
    id: 'Tranquilo',
    title: 'TRANQUILO',
    desc: 'Pocas actividades por día, paradas largas y tiempo para disfrutar el paisaje.',
    tag: '1 a 2 paradas diarias',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'Equilibrado',
    title: 'EQUILIBRADO',
    desc: 'Ritmo intermedio, tiempo bien distribuido entre paradas y momentos de descanso.',
    tag: '3 a 4 paradas diarias (Recomendado)',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'Intensivo',
    title: 'INTENSO',
    desc: 'Días con agenda llena, recorrido continuo y máximo uso del tiempo desde la mañana a la noche.',
    tag: '5+ actividades por día',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconBg: 'bg-amber-50 text-amber-600',
  },
]
