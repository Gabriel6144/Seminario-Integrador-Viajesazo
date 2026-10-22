import { useMemo, useState } from 'react'
import {
  BinocularsIcon,
  CalendarIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TagIcon,
  TicketIcon,
  XIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { EventoCard } from '@/components/evento-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { usePropuestas } from '@/api/propuestas'
import { Button } from '@/components/ui/button'
import { usePageParam } from '@/lib/use-page-param'
import {
  ESTADO_PROPUESTA_LABELS,
  ESTADOS_PROPUESTA,
  TIPO_PROPUESTA_LABELS,
  TIPOS_PROPUESTA,
  type EstadoPropuesta,
  type EstadoPropuestaObj,
  type PropuestaResumenResponse,
  type TipoPropuesta,
  type TipoRegistro,
} from '@/types/api'

type FiltroTipo = 'TODAS' | TipoRegistro
type FiltroFecha = 'TODAS' | 'PROXIMOS' | 'ESTA_SEMANA' | 'ESTE_MES'
type FiltroEstado = 'TODOS' | EstadoPropuesta
type FiltroTipoPropuesta = 'TODOS' | TipoPropuesta

const FECHA_LABELS: Record<FiltroFecha, string> = {
  TODAS: 'Todas las fechas',
  PROXIMOS: 'Próximos',
  ESTA_SEMANA: 'Esta semana',
  ESTE_MES: 'Este mes',
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function resolveEstadoKey(
  estado: EstadoPropuesta | EstadoPropuestaObj | null | undefined,
): EstadoPropuesta {
  if (!estado) return 'INICIADO'
  return typeof estado === 'object' ? estado.nombre : estado
}

function getTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

/**
 * Listado polimórfico de propuestas turísticas — `GET /api/propuestas?page=&size=`.
 *
 * Incluye barra permanente de píldoras de tipo con contadores en vivo, buscador rápido
 * y menú desplegable colapsable de filtros avanzados (Fecha, Zona y Estado).
 */
export function EventosPage() {
  const [page, setPage] = usePageParam()
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('TODAS')
  const [filtroZona, setFiltroZona] = useState<string>('TODAS')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS')
  const [filtroTipoPropuesta, setFiltroTipoPropuesta] = useState<FiltroTipoPropuesta>('TODOS')

  const opcionesTipoPropuesta: readonly TipoPropuesta[] = TIPOS_PROPUESTA

  const query = usePropuestas(page)
  const todasLasPropuestas = query.data?.content ?? []

  // Zonas (localidades) disponibles dinámicamente según las propuestas cargadas
  const zonasDisponibles = useMemo(() => {
    const unicas = new Set<string>()
    for (const item of todasLasPropuestas) {
      if (item.localidad && item.localidad.trim() !== '') {
        unicas.add(item.localidad.trim())
      }
    }
    return [...unicas].sort((a, b) => a.localeCompare(b, 'es'))
  }, [todasLasPropuestas])

  // 1) Filtrado por buscador + filtros avanzados (Fecha, Zona, Estado)
  const propuestasTrasFiltrosAvanzados = useMemo(() => {
    const q = normalizeText(busqueda)
    const hoy = getTodayIso()
    const finSemana = addDaysIso(hoy, 7)
    const finMes = addDaysIso(hoy, 30)

    return todasLasPropuestas.filter((propuesta) => {
      // Buscador por nombre, localidad, recinto o descripción
      if (q !== '') {
        const texto = [
          propuesta.nombre,
          propuesta.localidad ?? '',
          propuesta.lugarRecinto ?? '',
          propuesta.descripcion ?? '',
        ]
          .map(normalizeText)
          .join(' ')
        if (!texto.includes(q)) return false
      }

      // Filtro por Zona (localidad)
      if (filtroZona !== 'TODAS') {
        if ((propuesta.localidad ?? '').trim().toLowerCase() !== filtroZona.toLowerCase()) {
          return false
        }
      }

      // Filtro por Estado
      if (filtroEstado !== 'TODOS') {
        if (resolveEstadoKey(propuesta.estadoPropuesta) !== filtroEstado) {
          return false
        }
      }

      // Filtro por Tipo de propuesta
      if (filtroTipoPropuesta !== 'TODOS') {
        if (propuesta.tipoPropuesta !== filtroTipoPropuesta) {
          return false
        }
      }

      // Filtro por Fecha (los eventos tienen rango de fechas; las actividades son permanentes)
      if (filtroFecha !== 'TODAS' && propuesta.tipo !== 'ACTIVIDAD') {
        const inicio = propuesta.fechaInicio ?? ''
        const fin = propuesta.fechaFin ?? inicio
        if (filtroFecha === 'PROXIMOS' && fin !== '' && fin < hoy) {
          return false
        }
        if (filtroFecha === 'ESTA_SEMANA' && fin !== '' && (fin < hoy || inicio > finSemana)) {
          return false
        }
        if (filtroFecha === 'ESTE_MES' && fin !== '' && (fin < hoy || inicio > finMes)) {
          return false
        }
      }

      return true
    })
  }, [todasLasPropuestas, busqueda, filtroZona, filtroEstado, filtroTipoPropuesta, filtroFecha])

  // Contadores en vivo por tipo (respetando buscador y filtros avanzados)
  const totalCount = propuestasTrasFiltrosAvanzados.length
  const eventosCount = useMemo(
    () => propuestasTrasFiltrosAvanzados.filter((p) => p.tipo !== 'ACTIVIDAD').length,
    [propuestasTrasFiltrosAvanzados],
  )
  const actividadesCount = useMemo(
    () => propuestasTrasFiltrosAvanzados.filter((p) => p.tipo === 'ACTIVIDAD').length,
    [propuestasTrasFiltrosAvanzados],
  )

  // 2) Filtrado final aplicando la píldora de tipo seleccionada
  const propuestasVisibles = useMemo(() => {
    if (filtroTipo === 'TODAS') return propuestasTrasFiltrosAvanzados
    if (filtroTipo === 'ACTIVIDAD') {
      return propuestasTrasFiltrosAvanzados.filter((p) => p.tipo === 'ACTIVIDAD')
    }
    return propuestasTrasFiltrosAvanzados.filter((p) => p.tipo !== 'ACTIVIDAD')
  }, [propuestasTrasFiltrosAvanzados, filtroTipo])

  // Chips de filtros avanzados activos
  const chipsActivos = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (filtroFecha !== 'TODAS') {
      chips.push({
        key: 'fecha',
        label: FECHA_LABELS[filtroFecha],
        onRemove: () => setFiltroFecha('TODAS'),
      })
    }
    if (filtroZona !== 'TODAS') {
      chips.push({
        key: 'zona',
        label: filtroZona,
        onRemove: () => setFiltroZona('TODAS'),
      })
    }
    if (filtroEstado !== 'TODOS') {
      chips.push({
        key: 'estado',
        label: ESTADO_PROPUESTA_LABELS[filtroEstado],
        onRemove: () => setFiltroEstado('TODOS'),
      })
    }
    if (filtroTipoPropuesta !== 'TODOS') {
      chips.push({
        key: 'tipoPropuesta',
        label: TIPO_PROPUESTA_LABELS[filtroTipoPropuesta],
        onRemove: () => setFiltroTipoPropuesta('TODOS'),
      })
    }
    if (busqueda.trim() !== '') {
      chips.push({
        key: 'busqueda',
        label: `“${busqueda.trim()}”`,
        onRemove: () => setBusqueda(''),
      })
    }
    return chips
  }, [filtroFecha, filtroZona, filtroEstado, filtroTipoPropuesta, busqueda])

  const cantidadFiltrosAvanzados =
    (filtroFecha !== 'TODAS' ? 1 : 0) +
    (filtroZona !== 'TODAS' ? 1 : 0) +
    (filtroEstado !== 'TODOS' ? 1 : 0) +
    (filtroTipoPropuesta !== 'TODOS' ? 1 : 0)

  const limpiarFiltros = () => {
    setFiltroFecha('TODAS')
    setFiltroZona('TODAS')
    setFiltroEstado('TODOS')
    setFiltroTipoPropuesta('TODOS')
    setBusqueda('')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header con título y botón */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Propuestas turísticas
          </h2>
          <p className="text-sm text-[#3f484e]">
            Eventos y actividades turísticas cargados en Córdoba.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/eventos/nuevo">
            <PlusIcon className="h-5 w-5" aria-hidden />
            Nueva propuesta
          </Link>
        </Button>
      </div>

      {/* Barra de píldoras permanentes + buscador + menú desplegable colapsable */}
      <section
        aria-label="Filtros de propuestas"
        className="rounded-2xl border border-[#e0e3e5]/70 bg-white p-3.5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-4"
      >
        {/* Fila principal siempre visible */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Píldoras de tipo */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Filtrar por tipo de propuesta"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'TODAS'}
              onClick={() => setFiltroTipo('TODAS')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                filtroTipo === 'TODAS'
                  ? 'bg-[#00658d] font-bold text-white shadow-sm'
                  : 'bg-[#f2f4f6] font-semibold text-[#3f484e] hover:bg-[#e6e9ec]'
              }`}
            >
              <LayoutGridIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span>Todas las propuestas ({totalCount})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'EVENTO'}
              onClick={() => setFiltroTipo('EVENTO')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                filtroTipo === 'EVENTO'
                  ? 'bg-[#00658d] font-bold text-white shadow-sm'
                  : 'bg-[#f2f4f6] font-semibold text-[#3f484e] hover:bg-[#e6e9ec]'
              }`}
            >
              <TicketIcon
                className={`h-4 w-4 shrink-0 ${
                  filtroTipo === 'EVENTO' ? 'text-white' : 'text-[#df2a29]'
                }`}
                aria-hidden
              />
              <span>Eventos ({eventosCount})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtroTipo === 'ACTIVIDAD'}
              onClick={() => setFiltroTipo('ACTIVIDAD')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                filtroTipo === 'ACTIVIDAD'
                  ? 'bg-[#00658d] font-bold text-white shadow-sm'
                  : 'bg-[#f2f4f6] font-semibold text-[#3f484e] hover:bg-[#e6e9ec]'
              }`}
            >
              <BinocularsIcon
                className={`h-4 w-4 shrink-0 ${
                  filtroTipo === 'ACTIVIDAD' ? 'text-white' : 'text-[#00658d]'
                }`}
                aria-hidden
              />
              <span>Actividades ({actividadesCount})</span>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#70787f]"
              aria-hidden
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, localidad..."
              aria-label="Buscar por nombre o localidad"
              className="h-10 w-full rounded-xl bg-[#f2f4f6] pl-9 pr-3 text-sm text-[#191c1e] placeholder:text-[#70787f] transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00658d]/30"
            />
          </div>

          {/* Botón toggle "Filtros avanzados" */}
          <button
            type="button"
            aria-expanded={panelAbierto}
            onClick={() => setPanelAbierto((prev) => !prev)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e0e3e5]/80 bg-[#f2f4f6] px-3.5 text-sm font-semibold text-[#191c1e] transition-colors hover:bg-[#e6e9ec]"
          >
            <SlidersHorizontalIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
            <span>Filtros avanzados</span>
            {cantidadFiltrosAvanzados > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#bb0413] px-1.5 text-xs font-bold text-white">
                {cantidadFiltrosAvanzados}
              </span>
            )}
            <ChevronDownIcon
              className={`h-4 w-4 text-[#3f484e] transition-transform duration-200 ${
                panelAbierto ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>
        </div>

        {/* Panel colapsable desplegable */}
        {panelAbierto && (
          <div className="mt-3.5 border-t border-[#e0e3e5]/60 pt-3.5">
            {/* 4 selectores: Tipo de propuesta, Fecha, Zona, Estado */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Selector de Tipo de propuesta */}
              <label className="relative flex cursor-pointer items-center gap-2 rounded-xl bg-[#f2f4f6] px-3.5 py-2.5 text-sm text-[#3f484e] transition-colors hover:bg-[#e6e9ec]">
                <TagIcon className="h-4 w-4 shrink-0 text-[#70787f]" aria-hidden />
                <span className="shrink-0">Tipo:</span>
                <select
                  aria-label="Filtrar por tipo de propuesta"
                  value={filtroTipoPropuesta}
                  onChange={(e) => setFiltroTipoPropuesta(e.target.value as FiltroTipoPropuesta)}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 font-bold text-[#191c1e] focus:outline-none"
                >
                  <option value="TODOS">Todos los tipos</option>
                  {opcionesTipoPropuesta.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPO_PROPUESTA_LABELS[tipo]}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3.5 h-4 w-4 text-[#70787f]"
                  aria-hidden
                />
              </label>

              {/* Selector de Fecha */}
              <label className="relative flex cursor-pointer items-center gap-2 rounded-xl bg-[#f2f4f6] px-3.5 py-2.5 text-sm text-[#3f484e] transition-colors hover:bg-[#e6e9ec]">
                <CalendarIcon className="h-4 w-4 shrink-0 text-[#70787f]" aria-hidden />
                <span className="shrink-0">Fecha:</span>
                <select
                  aria-label="Filtrar por fecha"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value as FiltroFecha)}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 font-bold text-[#191c1e] focus:outline-none"
                >
                  <option value="TODAS">Todas las fechas</option>
                  <option value="PROXIMOS">Próximos</option>
                  <option value="ESTA_SEMANA">Esta semana</option>
                  <option value="ESTE_MES">Este mes</option>
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3.5 h-4 w-4 text-[#70787f]"
                  aria-hidden
                />
              </label>

              {/* Selector de Zona */}
              <label className="relative flex cursor-pointer items-center gap-2 rounded-xl bg-[#f2f4f6] px-3.5 py-2.5 text-sm text-[#3f484e] transition-colors hover:bg-[#e6e9ec]">
                <MapPinIcon className="h-4 w-4 shrink-0 text-[#70787f]" aria-hidden />
                <span className="shrink-0">Zona:</span>
                <select
                  aria-label="Filtrar por zona"
                  value={filtroZona}
                  onChange={(e) => setFiltroZona(e.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 font-bold text-[#191c1e] focus:outline-none"
                >
                  <option value="TODAS">Todas las zonas</option>
                  {zonasDisponibles.map((zona) => (
                    <option key={zona} value={zona}>
                      {zona}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3.5 h-4 w-4 text-[#70787f]"
                  aria-hidden
                />
              </label>

              {/* Selector de Estado */}
              <label className="relative flex cursor-pointer items-center gap-2 rounded-xl bg-[#f2f4f6] px-3.5 py-2.5 text-sm text-[#3f484e] transition-colors hover:bg-[#e6e9ec]">
                {/* Icono de toggle/estado */}
                <svg
                  className="h-4 w-4 shrink-0 text-[#70787f]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <rect x="2" y="7" width="20" height="10" rx="5" />
                  <circle cx="16" cy="12" r="2.5" fill="currentColor" />
                </svg>
                <span className="shrink-0">Estado:</span>
                <select
                  aria-label="Filtrar por estado"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 font-bold text-[#191c1e] focus:outline-none"
                >
                  <option value="TODOS">Todos los estados</option>
                  {ESTADOS_PROPUESTA.map((estado) => (
                    <option key={estado} value={estado}>
                      {ESTADO_PROPUESTA_LABELS[estado]}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3.5 h-4 w-4 text-[#70787f]"
                  aria-hidden
                />
              </label>
            </div>

            {/* Pie del panel colapsable: etiquetas de filtros activos + indicador en vivo */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e3e5]/50 pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#70787f]">Filtros activos:</span>
                {chipsActivos.length === 0 ? (
                  <span className="text-[#70787f]">Ninguno</span>
                ) : (
                  <>
                    {chipsActivos.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-1 rounded-full bg-[#ffdad6]/60 px-3 py-1 text-xs font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6]"
                      >
                        <span>{chip.label}</span>
                        <XIcon className="h-3 w-3" aria-hidden />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      className="ml-1 font-bold text-[#00658d] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  </>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 font-semibold text-[#3f484e]">
                <span className="h-2 w-2 rounded-full bg-[#df2a29]" aria-hidden />
                <span>
                  {totalCount} {totalCount === 1 ? 'propuesta activa' : 'propuestas activas'} (
                  {eventosCount} {eventosCount === 1 ? 'evento' : 'eventos'}, {actividadesCount}{' '}
                  {actividadesCount === 1 ? 'actividad' : 'actividades'})
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <PropuestasGrid
        query={query}
        propuestas={propuestasVisibles}
        filtroTipo={filtroTipo}
        hayFiltrosActivos={chipsActivos.length > 0}
        onLimpiarFiltros={limpiarFiltros}
      />

      {query.data === undefined ? null : (
        <PaginationBar page={query.data} onPageChange={setPage} />
      )}
    </div>
  )
}

function PropuestasGrid({
  query,
  propuestas,
  filtroTipo,
  hayFiltrosActivos,
  onLimpiarFiltros,
}: {
  query: ReturnType<typeof usePropuestas>
  propuestas: PropuestaResumenResponse[]
  filtroTipo: FiltroTipo
  hayFiltrosActivos: boolean
  onLimpiarFiltros: () => void
}) {
  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />
  if (propuestas.length === 0) {
    if (hayFiltrosActivos) {
      return (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            title="No se encontraron propuestas con esos filtros"
            description="Probá ajustando o limpiando los filtros de búsqueda, fecha, zona o estado."
          />
          <Button variant="outline" size="sm" onClick={onLimpiarFiltros}>
            Limpiar filtros
          </Button>
        </div>
      )
    }

    const emptyTitle =
      filtroTipo === 'ACTIVIDAD'
        ? 'Todavía no hay actividades cargadas'
        : filtroTipo === 'EVENTO'
          ? 'Todavía no hay eventos cargados'
          : 'Todavía no hay propuestas turísticas'
    return (
      <EmptyState
        title={emptyTitle}
        description="Podés cargar una nueva propuesta turística desde el botón superior."
      />
    )
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy={query.isPlaceholderData}
    >
      {propuestas.map((propuesta) => (
        <EventoCard key={`${propuesta.tipo ?? 'EVENTO'}-${propuesta.id}`} evento={propuesta} />
      ))}
    </div>
  )
}
