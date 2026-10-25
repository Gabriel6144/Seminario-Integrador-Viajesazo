import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDaysIcon,
  CheckIcon,
  CompassIcon,
  MapPinIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TicketIcon,
  XIcon,
} from 'lucide-react'

import {
  AGENDA_FILTERS_DEFAULT,
  useAgenda,
  type AgendaFilters,
} from '@/api/agenda'
import { DayHeading } from '@/components/day-heading'
import { EventoCard } from '@/components/evento-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { groupByDay } from '@/lib/group-by-day'
import { usePageParam } from '@/lib/use-page-param'
import {
  CATEGORIA_LABELS,
  CATEGORIAS,
  TIPO_ACCESO_LABELS,
  TIPO_PROPUESTA_LABELS,
  TIPOS_ACCESO,
  TIPOS_PROPUESTA,
} from '@/types/api'

/**
 * Agenda de eventos — `GET /api/agenda`.
 *
 * Cumple los criterios de aceptación de la historia de usuario:
 * - CA1: Eventos ordenados cronológicamente por fecha (los más próximos primero) y agrupados por día.
 * - CA2: Filtrado opcional en un panel lateral deslizable (Drawer / Sheet) por fecha, tipo de propuesta, categoría, ubicación y acceso (gratuito/arancelado).
 * - CA3: Selección de cualquier evento para consultar su información en detalle (`/eventos/:id`).
 *
 * El orden y los filtros los resuelve el backend: la página solo refleja la página recibida.
 */
export function AgendaPage() {
  const [page, setPage] = usePageParam()
  const [filters, setFilters] = useState<AgendaFilters>(AGENDA_FILTERS_DEFAULT)
  const [drawerAbierto, setDrawerAbierto] = useState(false)

  const query = useAgenda(page, filters)

  // Cerrar el drawer con Escape para accesibilidad
  useEffect(() => {
    if (!drawerAbierto) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerAbierto(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerAbierto])

  const cantidadFiltrosActivos = useMemo(() => {
    let count = 0
    if (filters.ubicacion.trim() !== '') count++
    if (filters.fechaDesde !== '') count++
    if (filters.fechaHasta !== '') count++
    if (filters.tipoPropuesta !== '') count++
    if (filters.categoria !== '') count++
    if (filters.tipoAcceso !== '') count++
    return count
  }, [filters])

  const hayFiltrosActivos = cantidadFiltrosActivos > 0

  // Sugerencias rápidas de localidades presentes en los eventos cargados
  const localidadesDisponibles = useMemo(() => {
    if (!query.data) return []
    const unicas = new Set<string>()
    for (const ev of query.data.content) {
      if (ev.localidad && ev.localidad.trim() !== '') {
        unicas.add(ev.localidad.trim())
      }
    }
    return [...unicas].slice(0, 6)
  }, [query.data])

  function updateFilter<K extends keyof AgendaFilters>(key: K, value: AgendaFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    if (page !== 0) {
      setPage(0)
    }
  }

  function limpiarFiltros() {
    setFilters(AGENDA_FILTERS_DEFAULT)
    if (page !== 0) {
      setPage(0)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado limpio (consistente con el resto de la app) + botón del panel lateral */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Agenda Turística
          </h2>
          <p className="text-sm text-[#3f484e]">
            Próximos eventos disponibles en Córdoba, ordenados desde los más cercanos.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setDrawerAbierto(true)}
          aria-expanded={drawerAbierto}
          aria-controls="drawer-filtros-agenda"
          className="h-11 gap-2.5 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-[#191c1e] shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50/50 hover:text-[#00658d]"
        >
          <SlidersHorizontalIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
          <span>Filtrar eventos</span>
          {hayFiltrosActivos ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00658d] px-1.5 text-xs font-bold text-white">
              {cantidadFiltrosActivos}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Píldoras de filtros activos debajo del encabezado */}
      {hayFiltrosActivos ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.ubicacion.trim() !== '' ? (
            <ActiveFilterPill
              label={filters.ubicacion.trim()}
              onRemove={() => updateFilter('ubicacion', '')}
            />
          ) : null}

          {filters.fechaDesde !== '' ? (
            <ActiveFilterPill
              label={`Desde ${filters.fechaDesde}`}
              onRemove={() => updateFilter('fechaDesde', '')}
            />
          ) : null}

          {filters.fechaHasta !== '' ? (
            <ActiveFilterPill
              label={`Hasta ${filters.fechaHasta}`}
              onRemove={() => updateFilter('fechaHasta', '')}
            />
          ) : null}

          {filters.tipoAcceso !== '' ? (
            <ActiveFilterPill
              label={TIPO_ACCESO_LABELS[filters.tipoAcceso]}
              onRemove={() => updateFilter('tipoAcceso', '')}
            />
          ) : null}

          {filters.tipoPropuesta !== '' ? (
            <ActiveFilterPill
              label={TIPO_PROPUESTA_LABELS[filters.tipoPropuesta]}
              onRemove={() => updateFilter('tipoPropuesta', '')}
            />
          ) : null}

          {filters.categoria !== '' ? (
            <ActiveFilterPill
              label={CATEGORIA_LABELS[filters.categoria]}
              onRemove={() => updateFilter('categoria', '')}
            />
          ) : null}

          <button
            type="button"
            onClick={limpiarFiltros}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100/70"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {/* Panel lateral deslizable (Drawer / Sheet) desde la derecha */}
      {drawerAbierto ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setDrawerAbierto(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
          />

          {/* Contenido del Drawer */}
          <aside
            id="drawer-filtros-agenda"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros de la agenda"
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header del Drawer */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Filtrar eventos
                </h3>
                <p className="text-xs text-slate-500">
                  Elegí tus preferencias para explorar la agenda
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                aria-label="Cerrar panel de filtros"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <XIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Cuerpo scrollable con controles y chips interactivos */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* 1. Ubicación */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="filtro-ubicacion"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  <MapPinIcon className="h-4 w-4 text-[#bb0413]" aria-hidden />
                  Ubicación
                </Label>
                <div className="relative">
                  <SearchIcon
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    id="filtro-ubicacion"
                    type="text"
                    placeholder="Buscar por ciudad, localidad o lugar…"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-10 pr-9 text-sm focus:bg-white"
                    value={filters.ubicacion}
                    onChange={(e) => updateFilter('ubicacion', e.target.value)}
                  />
                  {filters.ubicacion !== '' ? (
                    <button
                      type="button"
                      onClick={() => updateFilter('ubicacion', '')}
                      aria-label="Borrar ubicación"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <XIcon className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>

                {localidadesDisponibles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {localidadesDisponibles.map((loc) => {
                      const seleccionada =
                        filters.ubicacion.trim().toLowerCase() === loc.toLowerCase()
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() =>
                            updateFilter('ubicacion', seleccionada ? '' : loc)
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            seleccionada
                              ? 'border-sky-500 bg-sky-50 font-bold text-sky-700 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700'
                          }`}
                        >
                          {loc}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <Separator />

              {/* 2. Rango de fechas */}
              <div className="space-y-2.5">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <CalendarDaysIcon className="h-4 w-4 text-[#7a5900]" aria-hidden />
                  Fechas
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="filtro-fecha-desde" className="text-xs text-slate-500">
                      Fecha desde
                    </Label>
                    <Input
                      id="filtro-fecha-desde"
                      type="date"
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                      value={filters.fechaDesde}
                      onChange={(e) => updateFilter('fechaDesde', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="filtro-fecha-hasta" className="text-xs text-slate-500">
                      Fecha hasta
                    </Label>
                    <Input
                      id="filtro-fecha-hasta"
                      type="date"
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white"
                      value={filters.fechaHasta}
                      onChange={(e) => updateFilter('fechaHasta', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 3. Acceso (Gratuito / Arancelado) */}
              <div className="space-y-2.5" role="group" aria-label="Acceso">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <TicketIcon className="h-4 w-4 text-[#1e7d32]" aria-hidden />
                  Tipo de acceso
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    aria-pressed={filters.tipoAcceso === ''}
                    onClick={() => updateFilter('tipoAcceso', '')}
                    className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      filters.tipoAcceso === ''
                        ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-400/40'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Todos
                  </button>
                  {TIPOS_ACCESO.map((acceso) => {
                    const activo = filters.tipoAcceso === acceso
                    return (
                      <button
                        key={acceso}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => updateFilter('tipoAcceso', activo ? '' : acceso)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                          activo
                            ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-400/40'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {activo ? <CheckIcon className="h-3.5 w-3.5 text-sky-600" aria-hidden /> : null}
                        <span>{TIPO_ACCESO_LABELS[acceso]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* 4. Tipo de propuesta (Chips interactivos) */}
              <div className="space-y-2.5" role="group" aria-label="Tipo de propuesta">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <SparklesIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
                  Tipo de propuesta
                </span>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_PROPUESTA.map((tipo) => {
                    const activo = filters.tipoPropuesta === tipo
                    return (
                      <button
                        key={tipo}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => updateFilter('tipoPropuesta', activo ? '' : tipo)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                          activo
                            ? 'border-sky-400 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-400/40'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'
                        }`}
                      >
                        {activo ? <CheckIcon className="h-3.5 w-3.5 text-sky-600" aria-hidden /> : null}
                        <span>{TIPO_PROPUESTA_LABELS[tipo]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* 5. Categoría turística (Chips interactivos) */}
              <div className="space-y-2.5" role="group" aria-label="Categoría">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <CompassIcon className="h-4 w-4 text-[#00658d]" aria-hidden />
                  Categoría turística
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((categoria) => {
                    const activa = filters.categoria === categoria
                    return (
                      <button
                        key={categoria}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => updateFilter('categoria', activa ? '' : categoria)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                          activa
                            ? 'border-sky-400 bg-sky-50 text-sky-800 shadow-xs ring-1 ring-sky-400/40'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'
                        }`}
                      >
                        {activa ? <CheckIcon className="h-3.5 w-3.5 text-sky-600" aria-hidden /> : null}
                        <span>{CATEGORIA_LABELS[categoria]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!hayFiltrosActivos}
                onClick={limpiarFiltros}
                className="gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <RotateCcwIcon className="h-4 w-4" aria-hidden />
                Limpiar filtros
              </Button>

              <Button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                className="h-11 rounded-xl bg-[#00658d] px-6 font-semibold text-white shadow-md hover:bg-[#005273]"
              >
                Ver eventos ({query.data?.page.totalElements ?? 0})
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      {query.isPending ? <GridSkeleton /> : null}

      {query.isError ? <ErrorState error={query.error} /> : null}

      {query.isSuccess && query.data.content.length === 0 ? (
        <EmptyState
          title={hayFiltrosActivos ? 'No se encontraron eventos con esos filtros' : 'No hay eventos próximos'}
          description={
            hayFiltrosActivos
              ? 'Probá ajustando o limpiando los filtros seleccionados.'
              : 'Todavía no hay eventos cargados para la agenda.'
          }
        />
      ) : null}

      {query.isSuccess && query.data.content.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groupByDay(query.data.content).map(([date, eventos]) => (
            <section key={date} className="flex flex-col gap-3">
              <DayHeading date={date} />
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eventos.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : (
        <PaginationBar page={query.data} onPageChange={setPage} />
      )}
    </div>
  )
}

function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 shadow-2xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="rounded-full p-0.5 text-sky-600 transition-colors hover:bg-sky-200/60 hover:text-sky-900"
      >
        <XIcon className="h-3 w-3" aria-hidden />
      </button>
    </span>
  )
}
