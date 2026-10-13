import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'

// Mascot / assistant avatar URLs
const ASISTENTE_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCbZKsGcD0xrEOEeozKzqfLLJKdMsUKJA4HhQwyjwhvnr8tCSW5qnBlb7kaZZpcJ4BjC7ISYJGTFJFAPBWT3KyEcK_Wlwxr-HWEayC_DRqjdp27xhwV3d8A9UJVNVhqFz9BIDM4t1zr_MHoGbkUmkWMabstRwrOWv_ldGXankjVIDPt5iHuly4wG4RJfiz_GfID4SFwaWSO7u2mAm1O_XnsFDOA94Sx9OLDROlHlCacYB4-Ssvp2GmYOsh5v_cVO4WV-B4'

const GUIA_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCzExuco80JKkW9A1GrARQStb-dumG-R-2EinWxQWQHG4UIkPQ0oumk38UzslIwryGneVxxaqNt5pBNlArJZJMWOvO8btNDuP4Masw10GYFAO6EuLwiiytR2hN5VP5ITGT9FNW4Wyox8ObpTS40-g24DknoAINJ0yo5zPS0Ht7m5jxwe_ut5Ws1DW5ZapYUuE3G6K3O8eZadUfDHRtVj0hrAuXOoPQNS26JLxfYtq_KyQG-EVO5ac1TqscVqFIuv4KseJk'

const RANDOM_NAMES = [
  'Escapada a Córdoba',
  'Aventura cordobesa',
  'Córdoba con amigos',
  'Nuestro finde serrano',
  'Sabores & Paisajes',
  'Ruta del Fernet & Sierras',
]

const ZONES = [
  {
    name: 'Centro Histórico',
    label: 'Centro Histórico & Nueva Córdoba',
    desc: 'Museos, vida urbana y gastronomía',
    emoji: '🏛️',
  },
  {
    name: 'Villa Carlos Paz',
    label: 'Villa Carlos Paz (Valle de Punilla)',
    desc: 'Lago San Roque, teatros y sierras',
    emoji: '🌲',
  },
  {
    name: 'La Cumbrecita / Calamuchita',
    label: 'La Cumbrecita & Valle de Calamuchita',
    desc: 'Bosques, cascadas y aldeas alpinas',
    emoji: '🌿',
  },
  {
    name: 'Colonia Caroya / Sierras Chicas',
    label: 'Colonia Caroya & Sierras Chicas',
    desc: 'Bodegas, salames y estancias jesuitas',
    emoji: '🍷',
  },
  {
    name: 'Mina Clavero / Traslasierra',
    label: 'Mina Clavero & Traslasierra',
    desc: 'Ríos cristalinos y microclima serrano',
    emoji: '⛰️',
  },
]

const ALL_INTERESTS = [
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

const RHYTHMS = [
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

const DAYS_DATA: Record<number, Array<{ time: string; cat: string; catClass: string; dur: string; title: string; desc: string }>> = {
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

export function PlanificadorPage() {
  const navigate = useNavigate()
  const tripNameId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  const sliderKmId = useId()

  // Wizard state
  const [step, setStep] = useState<number>(1)
  const [tripName, setTripName] = useState<string>('Escapada a Córdoba')
  const [dateFrom, setDateFrom] = useState<string>('2026-04-10')
  const [dateTo, setDateTo] = useState<string>('2026-04-14')
  const [zone, setZone] = useState<string>('Centro Histórico')
  const [radiusKm, setRadiusKm] = useState<number>(8)
  const [interests, setInterests] = useState<string[]>(['Naturaleza', 'Gastronomía', 'Cultura'])
  const [rhythm, setRhythm] = useState<string>('Equilibrado')

  // Screen states
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<number>(1)

  // Loading animation state
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0)
  const loadingSteps = [
    { title: 'Estamos buscando experiencias para vos... 🔎', sub: 'Explorando paradas serranas y recomendaciones locales...', bar: 30 },
    { title: 'Encontramos actividades que coinciden con tus intereses... ✨', sub: `Combinando ${interests.slice(0, 2).join(' & ')}...`, bar: 65 },
    { title: 'Estamos armando la mejor combinación... 🗺️', sub: 'Calculando tiempos óptimos sin apurarte...', bar: 88 },
    { title: '¡Tu aventura está lista! 🎉', sub: 'Itinerario optimizado con éxito.', bar: 100 },
  ]

  // Calculate day difference
  const daysCount = (() => {
    if (!dateFrom || !dateTo) return 5
    const d1 = new Date(dateFrom)
    const d2 = new Date(dateTo)
    const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return isNaN(diff) || diff < 1 ? 1 : diff
  })()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleRandomName = () => {
    const chosen = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    setTripName(chosen)
  }

  const toggleInterest = (name: string) => {
    if (interests.includes(name)) {
      if (interests.length <= 1) {
        showToast('Mantené al menos 1 interés seleccionado')
        return
      }
      setInterests(interests.filter((i) => i !== name))
    } else {
      setInterests([...interests, name])
    }
  }

  const startCircuitGeneration = () => {
    setStep(9) // Step 9 = Loading
    setLoadingStepIndex(0)

    let idx = 0
    const interval = setInterval(() => {
      idx += 1
      if (idx < loadingSteps.length) {
        setLoadingStepIndex(idx)
      } else {
        clearInterval(interval)
        setTimeout(() => {
          setStep(10) // Step 10 = Final Circuit
        }, 500)
      }
    }, 1100)
  }

  const handleSaveTrip = () => {
    showToast('¡Circuito guardado con éxito en Mis Viajes! 💙')
  }

  const handleSaveDraft = () => {
    setIsExitModalOpen(false)
    showToast('Borrador guardado correctamente 💾')
    setTimeout(() => {
      navigate('/')
    }, 1200)
  }

  const handleDiscardExit = () => {
    setIsExitModalOpen(false)
    navigate('/')
  }

  const progressPercent = step <= 8 ? Math.min(100, Math.round((step / 8) * 100)) : 100

  return (
    <div>
      {/* CARD PRINCIPAL RESPONSIVE */}
      <div>
        {/* HEADER */}
        <header>
  {/* Progress Tracker (Pasos 1 al 8) */}
  {step <= 8 && (
    <div className="flex items-center gap-3 w-full">
      
      {/* BOTÓN VOLVER ATRÁS (Solo visible si no es el primer paso) */}
      {step > 1 ? (
        <button
          type="button"
          aria-label="Atrás"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 md:h-9 md:w-9"
          onClick={() => setStep(step - 1)} // Ajusta esto a tu función real de volver atrás
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
      ) : (
        // Espaciador vacío para mantener la barra centrada en el paso 1
        <div className="h-8 w-8 flex-shrink-0 md:h-9 md:w-9"></div>
      )}

      {/* BARRA DE PROGRESO (Tu código adaptado para flex) */}
      <div className="flex-1">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span className="font-semibold text-sky-800">Paso {step} de 8</span>
          {/* Agregué el porcentaje que tenías en el HTML anterior, es opcional */}
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-600 to-amber-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* BOTÓN CERRAR / X */}
      {step > 1 ? (
      <button
        type="button"
        aria-label="Salir"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-90 md:h-9 md:w-9"
        onClick={() => setIsExitModalOpen(true)} // Ajusta esto a tu función real de abrir modal de salida
      >
        <span className="material-symbols-outlined text-xl">close</span>
      </button>
      ) : (
        // Espaciador vacío para mantener la barra centrada en el paso 1
        <div className="h-8 w-8 flex-shrink-0 md:h-9 md:w-9"></div>
      )}
    </div>
  )}
</header>

        {/* CONTENIDO PRINCIPAL RESPONSIVE */}
        <main className="p-4 sm:p-8">
          {/* ================= PASO 1: BIENVENIDA ================= */}
          {step === 1 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative mb-6 flex h-44 w-44 items-center justify-center">
                <div className="animate-ripple absolute inset-0 rounded-full bg-sky-200/50" />
                <div className="animate-gentle-pulse relative z-10 h-36 w-36 overflow-hidden rounded-full border-4 border-sky-300 bg-white p-1.5 shadow-xl">
                  <img
                    alt="Guía de Córdoba"
                    className="h-full w-full object-cover rounded-full"
                    src={ASISTENTE_AVATAR}
                  />
                </div>
                <span className="absolute bottom-2 right-4 z-20 flex items-center justify-center rounded-full bg-amber-400 p-2 text-sm text-white shadow-md">
                  👋
                </span>
              </div>


              <h1 className="font-heading mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                ¡Córdoba te espera!
              </h1>

              <p className="max-w-md px-2 text-base leading-relaxed text-slate-600 sm:text-lg">
                ¿Preparado para descubrirla a tu manera? Te acompaño paso a paso a organizar una experiencia inolvidable adaptada a tus gustos y tiempos.
              </p>

              <div className="mt-8 w-full max-w-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 px-8 py-4 font-heading text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-700 hover:to-sky-600 active:scale-[0.98]"
                  onClick={() => setStep(2)}
                >
                  <span>Empecemos</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 2: NOMBRE DEL VIAJE ================= */}
          {step === 2 && (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 rounded-full border border-sky-200"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">¡Empecemos por bautizar la aventura!</p>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                Primero, pongámosle un nombre a esta aventura 💙
              </h2>

              <div className="mt-6">
                <label htmlFor={tripNameId} className="mb-2 block text-sm font-semibold text-slate-700">
                  ¿Cómo querés llamar a tu viaje?
                </label>
                <div className="relative">
                  <input
                    id={tripNameId}
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="Ej: Finde Serrano en Córdoba"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-12 text-base font-semibold text-slate-800 shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                  <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 text-xl">
                    edit
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRandomName}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 transition-all hover:bg-amber-100/80 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined fill text-[18px] text-amber-500">
                  auto_awesome
                </span>
                <span>✨ Sorprendeme con un nombre</span>
              </button>

              <div className="mt-6">
                <span className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Sugerencias rápidas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {RANDOM_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTripName(name)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                        tripName === name
                          ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-400 hover:text-sky-600'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(3)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 3: FECHAS ================= */}
          {step === 3 && (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 rounded-full border border-sky-200"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">Reviso el clima y aperturas para esos días.</p>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                ¿Cuándo venís a Córdoba? 📅
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Elegí las fechas para encontrar actividades que estén realmente disponibles durante tu estadía.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label htmlFor={dateFromId} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Fecha de Llegada</span>
                    <span className="text-[11px] font-bold text-sky-600">Check-in</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-sky-500">
                      flight_land
                    </span>
                    <input
                      id={dateFromId}
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label htmlFor={dateToId} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Fecha de Partida</span>
                    <span className="text-[11px] font-bold text-amber-600">Check-out</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-amber-500">
                      flight_takeoff
                    </span>
                    <input
                      id={dateToId}
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50 p-4 transition-all">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div>
                  <p className="text-sm font-bold leading-snug text-emerald-900">
                    Perfecto, tenemos {daysCount} días para disfrutar Córdoba al máximo.
                  </p>
                  <p className="text-xs text-emerald-700">Tiempo ideal para recorrer, degustar y relajarte en las sierras.</p>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(4)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 4: ZONA DE HOSPEDAJE ================= */}
          {step === 4 && (
            <div>
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 rounded-full border border-sky-200"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">Calculo traslados desde tu punto base para organizar el mejor recorrido.</p>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                ¿Dónde te vas a quedar? 📍
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Esto nos ayuda a armar un circuito con sentido logístico y sin viajes innecesarios.
              </p>

              {/* Layout 2 columnas en desktop */}
              <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-12">
                {/* Lista de Zonas */}
                <div className="space-y-2.5 md:col-span-7">
                  {ZONES.map((z) => {
                    const isSelected = zone === z.name
                    return (
                      <button
                        key={z.name}
                        type="button"
                        onClick={() => setZone(z.name)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-slate-800 shadow-md ring-1 ring-sky-400/40'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-2xl">{z.emoji}</span>
                          <div>
                            <p className="text-sm font-bold">{z.label}</p>
                            <p className="text-xs text-slate-500">{z.desc}</p>
                          </div>
                        </div>
                        <span
                          className={`material-symbols-outlined text-xl ${
                            isSelected ? 'text-sky-600' : 'text-slate-300'
                          }`}
                        >
                          {isSelected ? 'check_circle' : 'circle'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Mapa Preview */}
                <div className="relative flex h-52 flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-xl md:col-span-5 md:h-[340px]">
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                  <svg className="absolute inset-0 h-full w-full stroke-sky-400 opacity-30" fill="none" viewBox="0 0 350 200">
                    <path d="M 20 80 Q 90 30 180 80 T 330 60" strokeDasharray="4 4" strokeWidth="2" />
                    <path d="M 60 160 Q 150 100 240 140" strokeWidth="1.5" />
                  </svg>

                  <div className="relative z-10 flex items-start justify-between">
                    <span className="rounded-md bg-black/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-sky-300">
                      MAPA REGIONAL CÓRDOBA
                    </span>
                    <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      {zone}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center gap-2.5">
                    <div className="absolute -ml-1 h-9 w-9 animate-ping rounded-full bg-red-500/25" />
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                      <span className="material-symbols-outlined text-[18px]">hotel</span>
                    </div>
                    <div className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-lg backdrop-blur-sm">
                      <span>Base de hospedaje: {zone.split('/')[0]}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(5)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 5: RADIO DE INTERÉS ================= */}
          {step === 5 && (
            <div>
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 rounded-full border border-sky-200"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">Ajustá cuánto te querés mover desde tu base de alojamiento.</p>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                ¿Hasta dónde querés explorar? 🗺️
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Podemos buscar actividades a pasos de tu hotel o abrir el abanico a toda la región serrana.
              </p>

              {/* Layout 2 columnas en desktop */}
              <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                {/* Radar Interactivo */}
                <div className="relative flex h-60 flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:h-72">
                  <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-20" />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-28 w-28 rounded-full border border-sky-500/20" />
                    <div className="absolute h-48 w-48 rounded-full border border-sky-500/20" />

                    {/* Círculo dinámico según km */}
                    <div
                      className="flex items-center justify-center rounded-full border-2 border-sky-400 bg-sky-400/25 shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all duration-300"
                      style={{
                        width: `${60 + radiusKm * 7}px`,
                        height: `${60 + radiusKm * 7}px`,
                      }}
                    >
                      <span className="rounded bg-slate-900/80 px-2 py-0.5 font-mono text-xs font-bold text-sky-200">
                        {radiusKm} km
                      </span>
                    </div>

                    {/* Pin central */}
                    <div className="absolute z-20 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
                      <span className="material-symbols-outlined text-[19px]">cottage</span>
                    </div>

                    {/* Puntos de interés simulados */}
                    <div className="absolute -translate-x-12 -translate-y-10 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
                      ☕ Café
                    </div>
                    <div className="absolute translate-x-14 translate-y-8 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
                      🌲 Parque
                    </div>
                    <div className="absolute -translate-x-16 translate-y-14 rounded-full bg-sky-300 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
                      🎨 Museo
                    </div>
                  </div>

                  <div className="relative z-20 flex items-center justify-between text-white">
                    <span className="rounded border border-sky-800 bg-sky-950/80 px-2.5 py-1 font-mono text-[11px] text-sky-400">
                      RADIO ACTIVO
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <span className="material-symbols-outlined text-sm">near_me</span>
                      <span>{radiusKm} km a la redonda</span>
                    </div>
                  </div>

                  <div className="relative z-20 rounded-xl border border-slate-800/80 bg-slate-950/70 p-2.5 text-xs text-slate-300 backdrop-blur-sm">
                    <span>Explorarás actividades y atractivos dentro de {radiusKm} km de tu hospedaje.</span>
                  </div>
                </div>

                {/* Control Slider y Presets */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Distancia máxima de recorrido</span>
                    <span className="font-heading text-3xl font-extrabold text-sky-600">{radiusKm} km</span>
                  </div>
                  <label htmlFor={sliderKmId} className="sr-only">
                    Distancia máxima de viaje en kilómetros
                  </label>
                  <input
                    id={sliderKmId}
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                    className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-600"
                  />
                  <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-400">
                    <span>1 km</span>
                    <span>5 km</span>
                    <span>10 km</span>
                    <span>15 km</span>
                    <span>20 km</span>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
                    {[
                      { km: 3, label: 'Más cerca 🏠' },
                      { km: 8, label: 'Equilibrado ✨' },
                      { km: 18, label: 'Aventura 🧭' },
                    ].map((preset) => {
                      const isSelected = radiusKm === preset.km
                      return (
                        <button
                          key={preset.km}
                          type="button"
                          onClick={() => setRadiusKm(preset.km)}
                          className={`rounded-2xl border py-3 px-2 text-center text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-1 ring-sky-400/30'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-500'
                          }`}
                        >
                          {preset.label}
                          <span className="block mt-0.5 text-[11px] font-normal text-slate-400">{preset.km} km</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(6)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 6: INTERESES ================= */}
          {step === 6 && (
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 rounded-full border border-sky-200"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">¡Seleccioná todas las temáticas que te gusten!</p>
                </div>
              </div>

              <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                  ¿Qué te gustaría descubrir? 👀
                </h2>
                <span className="mt-2 inline-block w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 sm:mt-0">
                  {interests.length} seleccionados
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                Nosotros nos encargamos de combinarlos de forma balanceada a lo largo del viaje.
              </p>

              {/* Grid responsive de chips */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3">
                {ALL_INTERESTS.map((it) => {
                  const isSelected = interests.includes(it.name)
                  return (
                    <button
                      key={it.name}
                      type="button"
                      onClick={() => toggleInterest(it.name)}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-xs transition-all active:scale-95 ${
                        isSelected
                          ? 'border-sky-300 bg-sky-50/90 font-bold text-sky-800 shadow-md ring-1 ring-sky-400/40'
                          : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="mb-1.5 text-3xl">{it.emoji}</span>
                      <span className="text-center font-bold text-slate-900">{it.label || it.name}</span>
                      <span
                        className={`material-symbols-outlined mt-1.5 text-base ${
                          isSelected ? 'text-sky-600' : 'text-slate-300'
                        }`}
                      >
                        {isSelected ? 'check_circle' : 'add_circle'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(7)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 7: RITMO DEL VIAJE ================= */}
          {step === 7 && (
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
                <img
                  alt="Guía de Córdoba"
                  className="h-11 w-11 flex-shrink-0 rounded-full border border-sky-200 object-cover"
                  src={GUIA_AVATAR}
                />
                <div>
                  <span className="block text-xs font-bold text-sky-800">Guía de Córdoba</span>
                  <p className="text-sm text-slate-600">¡Elegí tu ritmo, disfrutá tu tiempo!</p>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                ¿Cómo querés vivir Córdoba? 💫
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                No todos viajamos al mismo ritmo. Elegí el que mejor te describa en este viaje.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {RHYTHMS.map((r) => {
                  const isSelected = rhythm === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRhythm(r.id)}
                      className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/90 shadow-md ring-1 ring-sky-400/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`rounded-xl p-2.5 text-3xl ${r.iconBg}`}>{r.emoji}</span>
                          <span
                            className={`material-symbols-outlined text-2xl ${
                              isSelected ? 'text-sky-600' : 'text-slate-300'
                            }`}
                          >
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                        <p className="mt-4 text-base font-bold tracking-wide text-slate-800">{r.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
                      </div>
                      <span className={`mt-4 inline-block w-fit rounded-lg border px-3 py-1 text-[11px] font-semibold ${r.badgeClass}`}>
                        {r.tag}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
                  onClick={() => setStep(8)}
                >
                  <span>Continuar</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= PASO 8: RESUMEN ================= */}
          {step === 8 && (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
                  <span className="material-symbols-outlined fill text-3xl">task_alt</span>
                </div>
                <h2 className="font-heading text-2xl font-bold text-slate-800 sm:text-3xl">
                  ¡Listo! Tenemos tu aventura preparada 💙
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Con esta información la IA generará un itinerario inteligente optimizado.
                </p>
              </div>

              {/* Grid 2 columnas en desktop */}
              <div className="grid grid-cols-1 gap-3.5 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
                {/* Row 1: Nombre */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">luggage</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Viaje</span>
                      <span className="text-sm font-bold text-slate-800">{tripName}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                {/* Row 2: Fechas */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">calendar_month</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Fechas</span>
                      <span className="text-sm font-bold text-slate-800">
                        {dateFrom} al {dateTo} ({daysCount} días)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                {/* Row 3: Hospedaje */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">location_on</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Hospedaje</span>
                      <span className="text-sm font-bold text-slate-800">{zone}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                {/* Row 4: Radio */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">radar</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Radio</span>
                      <span className="text-sm font-bold text-slate-800">Hasta {radiusKm} km a la redonda</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                {/* Row 5: Intereses */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">favorite</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Intereses</span>
                      <span className="text-sm font-bold text-slate-800">{interests.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>

                {/* Row 6: Ritmo */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-sky-600">speed</span>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Ritmo</span>
                      <span className="text-sm font-bold text-slate-800">{rhythm}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(7)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={startCircuitGeneration}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-amber-500 px-8 py-4 font-heading text-lg font-bold text-white shadow-xl shadow-sky-500/25 transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                  <span>✨ Generar mi circuito</span>
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">
                  Personalizado con motor turístico de Viajesazo
                </p>
              </div>
            </div>
          )}

          {/* ================= PASO 9: PANTALLA DE CARGA ================= */}
          {step === 9 && (
            <div className="flex min-h-[440px] flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-6 h-40 w-40">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-4 border-dashed border-sky-400"
                  style={{ animationDuration: '9s' }}
                />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white p-2 shadow-2xl">
                  <img
                    alt="Asistente Buscando"
                    className="animate-gentle-pulse h-28 w-28 object-cover rounded-full"
                    src={GUIA_AVATAR}
                  />
                </div>
              </div>

              <div className="max-w-md space-y-2.5">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3.5 py-1 text-xs font-bold text-sky-800">
                  <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                  <span>Procesando itinerario</span>
                </div>
                <h3 className="font-heading text-xl font-bold text-slate-800 transition-all duration-300 sm:text-2xl">
                  {loadingSteps[loadingStepIndex]?.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  {loadingSteps[loadingStepIndex]?.sub}
                </p>
              </div>

              <div className="mt-8 h-2.5 w-64 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all duration-500"
                  style={{ width: `${loadingSteps[loadingStepIndex]?.bar || 30}%` }}
                />
              </div>
            </div>
          )}

          {/* ================= PASO 10: CIRCUITO FINAL ================= */}
          {step === 10 && (
            <div className="mx-auto max-w-3xl">
              {/* Banner de Éxito */}
              <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 to-sky-800 p-6 text-white shadow-lg">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <span className="inline-block rounded bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                      Itinerario Oficial
                    </span>
                    <h2 className="font-heading mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">
                      ¡Tu aventura está lista! 🎉
                    </h2>
                    <p className="mt-1 text-sm text-sky-100">
                      {tripName} • {daysCount} Días ({rhythm})
                    </p>
                  </div>
                  <div className="h-16 w-16 flex-shrink-0 rounded-full bg-white/10 p-1">
                    <img
                      alt="Guía de Córdoba"
                      className="h-full w-full object-cover rounded-full"
                      src={GUIA_AVATAR}
                    />
                  </div>
                </div>
              </div>

              {/* Selector de Días Tabs */}
              <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDay(d)}
                    className={`flex-1 rounded-xl py-2.5 text-center transition-all ${
                      activeDay === d
                        ? 'bg-white text-sky-600 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DÍA {d}
                  </button>
                ))}
              </div>

              {/* Diagrama de Ruta Conectada */}
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-inner">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-sky-400">RUTA CONECTADA DEL DÍA</span>
                  <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    3 Paradas optimizadas
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-800/90 px-4 py-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold">Hospedaje</span>
                  </div>
                  <span className="text-slate-400">━━ 12 min ━━</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                    <span className="font-semibold">Centro</span>
                  </div>
                  <span className="text-slate-400">━━ 8 min ━━</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="font-semibold">Güemes</span>
                  </div>
                </div>
              </div>

              {/* Tarjetas de Actividades */}
              <div className="space-y-3.5">
                {DAYS_DATA[activeDay]?.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
                  >
                    <div className="flex flex-col items-center">
                      <span className="rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                        {it.time}
                      </span>
                      {idx < 2 && <div className="my-1.5 h-12 w-0.5 bg-slate-200" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${it.catClass}`}>
                          {it.cat}
                        </span>
                        <span className="text-xs text-slate-400">{it.dur}</span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-800">{it.title}</h4>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{it.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones Finales */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleSaveTrip}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">bookmark</span>
                  <span>Guardar en Mis viajes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-heading text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-base text-slate-500">map</span>
                  <span>Explorar en el mapa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2 text-center text-xs font-bold text-sky-600 hover:underline sm:px-3"
                >
                  🔄 Reiniciar
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE SALIDA */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsExitModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl transition-all">
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-inner">
              <span className="material-symbols-outlined text-3xl">bookmark_add</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-slate-800">
              ¿Querés guardar tu aventura? 💙
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Podés guardar tu planificación como borrador y continuarla en cualquier momento.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">bookmark</span>
                <span>Guardar como borrador</span>
              </button>
              <button
                type="button"
                onClick={handleDiscardExit}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition-all hover:text-slate-800"
              >
                Seguir planificando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN TOAST */}
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 transition-all duration-300">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 px-5 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
            <span className="material-symbols-outlined text-base text-amber-400">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
