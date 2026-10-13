import type { InteresCategoria, TipoRitmo } from '@/types/api'
import type { ActivityItem, InterestItem, RhythmItem, ZoneItem } from './types'

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
    emoji: '🏛️',
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
    emoji: '🌲',
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
    emoji: '🌿',
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
    emoji: '🍷',
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
    emoji: '⛰️',
    ubicacion: {
      ciudad: 'Mina Clavero',
      localidad: 'Traslasierra',
      latitud: -31.7214,
      longitud: -65.0069,
    },
  },
]

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
  { name: 'Naturaleza', emoji: '🌿' },
  { name: 'Gastronomía', emoji: '🍴' },
  { name: 'Cultura', emoji: '🎨' },
  { name: 'Historia', emoji: '🏛️' },
  { name: 'Aventura', emoji: '🥾' },
  { name: 'Vida nocturna', emoji: '🌙', label: 'Noche & Bares' },
  { name: 'Música', emoji: '🎵', label: 'Música & Cuarteto' },
  { name: 'Compras', emoji: '🛍️', label: 'Compras & Ferias' },
  { name: 'Familiar', emoji: '👨‍👩‍👧', label: 'Familiar' },
]

export const RHYTHMS: RhythmItem[] = [
  {
    id: 'Tranquilo',
    emoji: '🌿',
    title: 'TRANQUILO',
    desc: 'Pocas actividades por día, paradas largas y tiempo para disfrutar el paisaje.',
    tag: '1 a 2 paradas diarias',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'Equilibrado',
    emoji: '✨',
    title: 'EQUILIBRADO',
    desc: 'Ritmo intermedio, tiempo bien distribuido entre paradas y momentos de descanso.',
    tag: '3 a 4 paradas diarias (Recomendado)',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'Intensivo',
    emoji: '🔥',
    title: 'INTENSO',
    desc: 'Días con agenda llena, recorrido continuo y máximo uso del tiempo desde la mañana a la noche.',
    tag: '5+ actividades por día',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconBg: 'bg-amber-50 text-amber-600',
  },
]

export const DAYS_DATA: Record<number, ActivityItem[]> = {
  1: [
    {
      time: '09:30',
      cat: 'Cultura & Café',
      catClass: 'text-amber-600 bg-amber-50 border border-amber-200/60',
      dur: '1h 30m',
      title: 'Plaza San Martín y Café Serrano',
      desc: 'Visita a la Manzana Jesuítica con café de especialidad y medialunas cordobesas.',
    },
    {
      time: '12:45',
      cat: 'Gastronomía',
      catClass: 'text-emerald-600 bg-emerald-50 border border-emerald-200/60',
      dur: '2h',
      title: 'Almuerzo Típico en Barrio Güemes',
      desc: 'Empanadas serranas al horno de barro y cortes tradicionales.',
    },
    {
      time: '16:30',
      cat: 'Naturaleza & Relax',
      catClass: 'text-sky-600 bg-sky-50 border border-sky-200/60',
      dur: '2h 30m',
      title: 'Parque Sarmiento y Paseo de la Flora',
      desc: 'Caminata con atardecer serrano y vista panorámica de la ciudad.',
    },
  ],
  2: [
    {
      time: '10:00',
      cat: 'Aventura Serrana',
      catClass: 'text-amber-600 bg-amber-50 border border-amber-200/60',
      dur: '3h',
      title: 'Excursión a Quebrada de los Condoritos',
      desc: 'Sendero natural con vistas panorámicas a las altas cumbres.',
    },
    {
      time: '14:00',
      cat: 'Gastronomía Campestre',
      catClass: 'text-emerald-600 bg-emerald-50 border border-emerald-200/60',
      dur: '1h 30m',
      title: 'Almuerzo Criollo en Estancia',
      desc: 'Tablas de quesos y salames caroyenses artesanales.',
    },
    {
      time: '17:30',
      cat: 'Relax al Río',
      catClass: 'text-sky-600 bg-sky-50 border border-sky-200/60',
      dur: '2h',
      title: 'Río San Antonio & Costanera',
      desc: 'Mateada tradicional contemplando el agua cristalina.',
    },
  ],
  3: [
    {
      time: '10:30',
      cat: 'Arte & Diseño',
      catClass: 'text-purple-600 bg-purple-50 border border-purple-200/60',
      dur: '2h',
      title: 'Paseo de las Pulgas & Galerías de Arte',
      desc: 'Recorrido por tiendas de artesanías de autor y diseño cordobés.',
    },
    {
      time: '13:30',
      cat: 'Bodega Local',
      catClass: 'text-emerald-600 bg-emerald-50 border border-emerald-200/60',
      dur: '2h 30m',
      title: 'Cata de Vinos & Picada Serrana',
      desc: 'Degustación de varietales locales con vista a los viñedos.',
    },
    {
      time: '19:00',
      cat: 'Música en Vivo',
      catClass: 'text-sky-600 bg-sky-50 border border-sky-200/60',
      dur: '3h',
      title: 'Peña Serrana o Noche de Acústicos',
      desc: 'Música en vivo, empanadas y fernet artesanal.',
    },
  ],
}

