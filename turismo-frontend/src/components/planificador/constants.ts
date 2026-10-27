import type { InteresCategoria, TipoRitmo } from '@/types/api'
import type {
  ActivityItem,
  AlternativaReemplazo,
  CircuitoRecomendado,
  InterestItem,
  ParadaCircuitoDetalle,
  RhythmItem,
  ZoneItem,
} from './types'

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

export const CIRCUITOS_RECOMENDADOS: CircuitoRecomendado[] = [
  {
    id: 'clasica-sabores',
    title: 'Córdoba Clásica & Sabores',
    affinity: '95% Afinidad',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA5GYiCcGRqyTVkS2Hc8v-9zq-XEnc8oc48oFyn2sie4dxBa3BXNTIFXGgmv5tH0OE9iPTrj8cBeeGzIwche0PyYhDvzuaF9C-bo5-rU3cS1CV2-rqwc5HwymZiD3Fq4p6VRaTk3kAfP8pnIqr13n7A2IZB2fserC2UAbpNm5tHcz4C9JAEZPzO7REta0cAa71Sl1EGah3PGkZaek26S8FxdLmNeNjVxJxh7lUnE5uLjwXTY0FDdLTH',
    categoryTag: 'Cultura & Sabores',
    categoryIcon: 'restaurant',
    daysLabel: '3 Días',
    paceLabel: 'Media',
    chips: [
      { icon: 'schedule', label: '3 Días', variant: 'sky' },
      { icon: 'map', label: '8 Actividades', variant: 'amber' },
      { icon: 'directions_walk', label: 'Tiempo moderado', variant: 'slate' },
    ],
    ventajas: ['Optimiza tiempos de traslado', 'Incluye eventos destacados'],
    consideraciones: ['Día 2 requiere reserva previa', 'Sujeto a clima en exteriores'],
  },
  {
    id: 'sierras-aventura',
    title: 'Sierras y Aventura',
    affinity: '88% Afinidad',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCtrtkNECK4uB6XQMYwAkKXqHQstBE85bv8oE1yE8QSx7A6OFHYD0LXIsT2NYjqAMqQ35SpTcm70jOf7k_0yDuqIkmq34Ejz37Joy7X4KCOFWZ3weXQrkJ34U02aOlB3jSHlauQEV_3GbNWmKFgqKpSyTdJy96-hOoEMCp0AQ_Cwb9qIgjTJdaMpledJNLvKi3b1JFtJofDAsWiu4Vfiu5D_7NjEycEJQjg7YmjlbRU6YBVj-fuuIX',
    categoryTag: 'Naturaleza',
    categoryIcon: 'landscape',
    daysLabel: '4 Días',
    paceLabel: 'Intenso',
    chips: [
      { icon: 'schedule', label: '4 Días', variant: 'sky' },
      { icon: 'landscape', label: 'Naturaleza', variant: 'amber' },
      { icon: 'hiking', label: 'Intenso', variant: 'slate' },
    ],
    ventajas: ['Contacto total con la naturaleza', 'Rutas de trekking exclusivas'],
    consideraciones: ['Requiere buen estado físico', 'Transporte propio recomendado'],
  },
  {
    id: 'cultura-tradicion',
    title: 'Cultura y Tradición',
    affinity: '92% Afinidad',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBAlz8RjM8Npp7fEskFQB-3xI3qfXAiwJophAnEgAATaXYQGUjq3MoU2Zil_yxF3CrOKjqw-KVsRwBH2eWN5hc4cd0WWa4Qmf21dP87WymcVSyUR_V8hWXIdvV9v8ITwC2v7CF09w_iHO70KkzO3VGDiCf1DUwEeEb9_0Gt3H3U56DSHK1XfPBqMtmXmAe8-xra3PC2h395chLb4BwGgyGKwY0-_E440HkalJc4fItaj5KSh4nJCt6q',
    categoryTag: 'Cultura',
    categoryIcon: 'museum',
    daysLabel: '3 Días',
    paceLabel: 'Media',
    chips: [
      { icon: 'schedule', label: '3 Días', variant: 'sky' },
      { icon: 'museum', label: 'Histórico', variant: 'amber' },
      { icon: 'coffee', label: 'Relajado', variant: 'slate' },
    ],
    ventajas: ['Accesible a pie en Nueva Córdoba', 'Entradas a museos incluidas'],
    consideraciones: ['Lunes museos cerrados', 'Ideal para días de lluvia'],
  },
]

export const PARADAS_INICIALES_POR_DIA: Record<number, ParadaCircuitoDetalle[]> = {
  1: [
    {
      id: 'act-1',
      time: '09:00',
      title: 'Paseo del Buen Pastor',
      category: 'Gastronomía & Cultura',
      badgeClass: 'bg-rose-600 text-white',
      description:
        'Comienza tu visita admirando la imponente fachada de la Iglesia de los Capuchinos (Iglesia del Sagrado Corazón) a pocos metros, para luego adentrarte en el complejo del Buen Pastor, una antigua cárcel de mujeres reconvertida en un vibrante centro cultural.',
      detailDescription:
        'Complejo cultural y gastronómico en Nueva Córdoba con fuentes de aguas danzantes, galería de arte y la impresionante Iglesia de los Capuchinos justo enfrente.',
      location: 'Hipólito Yrigoyen 325, Córdoba',
      hours: '09:00 - 22:00',
      price: 'Entrada gratuita',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAbS0TBPv1NarUnn0nDPjrpv558PEfK4XrzKSX1hmwnJFTo2wK_cWzrju1-UYG5oUsu1v3O8GLi723nkfQKSI94AIBn3Jw3qxRG1TekAiI88KNrSo2viJStTBZ6L2NHlBZaDU5qjdaBwc33SmVSOVuCFO31E6jjQQyPMHKot35p5j7C9lk0jdE9_Hfbkxs7sQ-2VNXUFMEouv9JPZ5SRLSJjNpYDdnMk1Vyvn_ZnW59iyGIGu_CiGqj0w',
      walkNext: '15 min caminando por Nueva Córdoba',
      latitud: -31.4254,
      longitud: -64.1873,
    },
    {
      id: 'act-2',
      time: '10:30',
      title: 'Museo Evita - Palacio Ferreyra',
      category: 'Cultura & Arte',
      badgeClass: 'bg-[#d7a73b] text-amber-950',
      description:
        'Majestuoso palacio de estilo francés construido en 1916 que alberga una importante colección de arte provincial y hermosos jardines arbolados para descansar.',
      detailDescription:
        'Palacio de estilo academicista francés construido en 1916. Alberga la colección permanente de arte de la provincia de Córdoba y exposiciones temporales de gran escala.',
      location: 'Av. Hipólito Yrigoyen 511, Córdoba',
      hours: '10:00 - 19:00 (Mar a Dom)',
      price: '$800 / Estudiantes gratis',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAUYokz31jbHe2QNCrHTcMmblBfNhopXzkckHEGLNvdBPGljHflbm3yw4w_PCHbsYGg1jfA2_GiSWDa3N5LGZSlKWmINXpaEo3mNuSl4q9HHSJFK45uvx9tn5zpjpsZlo5DIqqixy3J7WTTE_H6bVO8HG5rKzkO456ZjdJNDfxK6XmokYNh7Wt3gwkkHK2CFH3NXm_BdjGEjwlKphUVDwZgEP__ueZ0aUpEOsZQewuN1gpsCHCXnNs7hw',
      latitud: -31.4278,
      longitud: -64.1865,
    },
  ],
  2: [
    {
      id: 'act-3',
      time: '10:00',
      title: 'Manzana Jesuítica',
      category: 'Patrimonio UNESCO',
      badgeClass: 'bg-slate-800/90 text-amber-300',
      description:
        'Recorrido por el Colegio Nacional de Monserrat, la Iglesia de la Compañía de Jesús y el Museo Histórico de la Universidad.',
      detailDescription:
        'Declarada Patrimonio de la Humanidad por la UNESCO en el año 2000. Comprende la Universidad Nacional, el Colegio de Monserrat y la Iglesia Jesuítica.',
      location: 'Obispo Trejo 242, Córdoba',
      hours: '09:30 - 18:00',
      price: 'Visita guiada disponible',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCafsdo6h8bInCpaIq9Dvdf36I0aoSrVKuyF7cgqOiGrBAYvkGo5INNu5FA62cCIEGkbuRVvqmKyKMHtAlrW7NSyr6IbANA3gSxlHxZ0eGre_IYQ1Ql-mObSnkhcZQ_FQK-FcKtuHAYF4a4pYvPrIMl-bluZf4W5SFgPLiXGDgdPjspkLlXE8jWw02XlCaxTbb8b61enaUQr6dljfCSFEnJkQmC6I96OPL6Tr7QKvRpNjPh6TFuJznY7w',
      latitud: -31.4184,
      longitud: -64.1877,
    },
  ],
  3: [
    {
      id: 'act-4',
      time: '11:30',
      title: 'Mercado Norte & Sabores Criollos',
      category: 'Gastronomía',
      badgeClass: 'bg-white/95 text-rose-700',
      description:
        'Degustación de platos tradicionales cordobeses, empanadas criollas y productos regionales en los puestos históricos.',
      detailDescription:
        'Centro gastronómico y comercial histórico con locales tradicionales, cocina en vivo y productos autóctonos de las Sierras de Córdoba.',
      location: 'Oncativo 50, Córdoba',
      hours: '07:00 - 15:00',
      price: 'Entrada libre',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBexIiUUcT0wFpHsLbatXxzzEBYgtgeds09-1kk7Z5-dBar-yNukb1sadmaMc0j9LCWcOy8b05fBLposnONBrIe9yGUJl9lw-A6dxlUOULhNnS17mFhAYtfg1xsYPlHpInDc9klHtYKIcqYW-hOzsRkFvjwmsuhYTxaW1Wg-Xb0qb0VVSaBbH8CgyIOab-62LNr_NgRlnB0h0AB3fB8p5sZyl2X-zqudIE3UzXM-7LPk4yTrRADMtsLQw',
      latitud: -31.4112,
      longitud: -64.1835,
    },
  ],
}

export const ALTERNATIVAS_REEMPLAZO: AlternativaReemplazo[] = [
  {
    id: 'alt-1',
    title: 'Plaza España & Museo Emilio Caraffa',
    category: 'Arte & Cultura',
    badgeClass: 'bg-[#d7a73b] text-amber-950',
    description:
      'Epicentro cultural con salas de exposición contemporánea, túnel de esculturas y arquitectura renovada.',
    walkDistance: 'A 10 min a pie',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD6DhDURv4eQye_1HUBJepHA3axjCFUA-Ru_9a92ursqlN-yWZY7mm-2nhVZd_cY0pS1cPsndtKRQZ92NHpViO1e-gIrOUuOMCZV1uGzx3GfAC-dOB9hPmU9cYpMA4bZQEjz81dzSKneQ1l9WH1qiaYmwm0bY__zyAO0kHE2tudSDTUIZIkILwevSlRjv-XgDDIbvUFUhoh5N-2JV0cXyd7EhLvnECHUSbpAUfK7dh3NLU-fNOHbZHTGQ',
    location: 'Av. Poeta Lugones 411, Córdoba',
    hours: '10:00 - 19:00',
    price: 'Entrada general $800',
    latitud: -31.4288,
    longitud: -64.1846,
  },
  {
    id: 'alt-2',
    title: 'Paseo de las Artes (Güemes)',
    category: 'Paseo & Diseño',
    badgeClass: 'bg-rose-100 text-rose-800',
    description:
      'El barrio bohemio por excelencia, con artesanías de autor, anticuarios, murales urbanos y cafés de especialidad.',
    walkDistance: 'A 8 min a pie',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClN4QG2n99f48rlO8Z8NfbUhTR2sS-gwQbBsjncH7Uc_LFh4I5TABh0dP83jHKP00rSjTg4FbZEo12-8p6v3EvLZBn-w_sS3C9G9_FST3sxqDgahqQQrH4SE5yGhEpYgwTK9WzRWMaEwtEuZ1mROnxKrl7RF1Z2fIqRLNs6-oU9UhLLkvaGKWpQ7-HJDBv3_CJx2WIXKxYtT0-iAhsohVfDjCyfy82lxhWo3l55S0YP07rhhUXnIT-gQ',
    location: 'Belgrano 750, Barrio Güemes',
    hours: '16:00 - 23:00',
    price: 'Entrada libre',
    latitud: -31.4234,
    longitud: -64.1924,
  },
  {
    id: 'alt-3',
    title: 'Parque Sarmiento & Rosedal',
    category: 'Naturaleza & Aire Libre',
    badgeClass: 'bg-sky-100 text-sky-800',
    description:
      'El mayor pulmón verde de la ciudad con lago artificial, mirador panorámico y senderos sombreados.',
    walkDistance: 'A 12 min a pie',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDYmvZucBobKuAULkOWcqDEMRRgmeP3iCCzL9c2qli-tvrh5UZ187IsI3LOqYvZ9baRja9KWYqdSIfVSTe0WkUSnkhaBKJgSQQXqHUYHgNfb5LKSu2z0cTtP92zC1z4UkRE6cqc2sffYquFVZu-mVxCET5IIkagOYI9iYV6NyGBxQh5QuCKpL0StoCN5-_v6hA8aYJfxwwKUG-VuliqNB1-A4OExnnt2OS9suAOVjxBzLR2-oaCtMYIqQ',
    location: 'Av. Deodoro Roca s/n, Córdoba',
    hours: 'Abierto las 24 h',
    price: 'Acceso gratuito',
    latitud: -31.4307,
    longitud: -64.1782,
  },
]

