import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useBorradores, useDescartarBorrador } from '@/api/viajes'
import { ViajeBorradorCard } from '@/components/viaje-borrador-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { usePageParam } from '@/lib/use-page-param'
import type { ViajeResponse } from '@/types/api'

const USUARIO_DEMO = 'turista_demo'

type FiltroViaje = 'TODOS' | 'BORRADORES' | 'CONFIRMADOS'
type OrdenViaje = 'recientes' | 'proximos' | 'avance' | 'alfabetico'

function esCircuitoConfirmado(viaje: ViajeResponse): boolean {
  return viaje.estado !== 'BORRADOR' || (viaje.pasoActual ?? 0) >= 8
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function BorradoresPage() {
  const [page, setPage] = usePageParam()
  const query = useBorradores(USUARIO_DEMO, page)
  const descartar = useDescartarBorrador()
  const [borradorADescartarId, setBorradorADescartarId] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<FiltroViaje>('TODOS')
  const [busqueda, setBusqueda] = useState<string>('')
  const [orden, setOrden] = useState<OrdenViaje>('recientes')

  const todosLosViajes = query.data?.content ?? []

  const totalCount = todosLosViajes.length
  const borradoresCount = useMemo(
    () => todosLosViajes.filter((v) => !esCircuitoConfirmado(v)).length,
    [todosLosViajes],
  )
  const confirmadosCount = useMemo(
    () => todosLosViajes.filter((v) => esCircuitoConfirmado(v)).length,
    [todosLosViajes],
  )

  const viajesFiltradosYOrdenados = useMemo(() => {
    const q = normalizarTexto(busqueda)

    const filtrados = todosLosViajes.filter((viaje) => {
      if (filtroEstado === 'BORRADORES' && esCircuitoConfirmado(viaje)) return false
      if (filtroEstado === 'CONFIRMADOS' && !esCircuitoConfirmado(viaje)) return false

      if (q.length > 0) {
        const campos = [
          viaje.nombre ?? '',
          viaje.ubicacion?.nombre ?? '',
          viaje.ubicacion?.ciudad ?? '',
          viaje.ubicacion?.localidad ?? '',
        ]
          .map(normalizarTexto)
          .join(' ')
        if (!campos.includes(q)) return false
      }

      return true
    })

    return [...filtrados].sort((a, b) => {
      if (orden === 'proximos') {
        const fa = a.fechaInicio ?? '9999-12-31'
        const fb = b.fechaInicio ?? '9999-12-31'
        return fa.localeCompare(fb)
      }
      if (orden === 'avance') {
        return (b.pasoActual ?? 0) - (a.pasoActual ?? 0)
      }
      if (orden === 'alfabetico') {
        return (a.nombre ?? 'Borrador sin nombre').localeCompare(
          b.nombre ?? 'Borrador sin nombre',
          'es',
        )
      }
      return b.id - a.id
    })
  }, [todosLosViajes, filtroEstado, busqueda, orden])

  const handleConfirmarDescarte = () => {
    if (borradorADescartarId === null) return
    descartar.mutate(borradorADescartarId, {
      onSettled: () => setBorradorADescartarId(null),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Mis Viajes
          </h2>
          <p className="text-sm text-[#3f484e]">
            Circuitos guardados como borrador para retomarlos después.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/planificar">+ Planificar un viaje nuevo</Link>
        </Button>
      </div>

      {/* 3 Botones de Resumen y Filtro */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setFiltroEstado('TODOS')}
          aria-pressed={filtroEstado === 'TODOS'}
          className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all sm:gap-4 ${
            filtroEstado === 'TODOS'
              ? 'border-[#00658d] ring-2 ring-[#00658d]/25'
              : 'border-[#bfc8cf]/40 hover:border-[#00658d]/50 hover:shadow-md'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c6e7ff] text-[#00658d] sm:h-12 sm:w-12">
            <span className="material-symbols-outlined text-xl sm:text-2xl">luggage</span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-[#70787f]">
              Total guardados
            </span>
            <span className="font-heading text-lg font-bold text-[#191c1e]">
              {totalCount} {totalCount === 1 ? 'viaje en total' : 'viajes en total'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroEstado((prev) => (prev === 'BORRADORES' ? 'TODOS' : 'BORRADORES'))
          }
          aria-pressed={filtroEstado === 'BORRADORES'}
          className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all sm:gap-4 ${
            filtroEstado === 'BORRADORES'
              ? 'border-amber-600 ring-2 ring-amber-500/25'
              : 'border-[#bfc8cf]/40 hover:border-amber-400 hover:shadow-md'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/50 bg-amber-50 text-amber-700 sm:h-12 sm:w-12">
            <span className="material-symbols-outlined text-xl sm:text-2xl">edit_calendar</span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-[#70787f]">
              Borradores activos
            </span>
            <span className="font-heading text-lg font-bold text-amber-700">
              {borradoresCount} en planificación
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFiltroEstado((prev) => (prev === 'CONFIRMADOS' ? 'TODOS' : 'CONFIRMADOS'))
          }
          aria-pressed={filtroEstado === 'CONFIRMADOS'}
          className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all sm:gap-4 ${
            filtroEstado === 'CONFIRMADOS'
              ? 'border-emerald-600 ring-2 ring-emerald-500/25'
              : 'border-[#bfc8cf]/40 hover:border-emerald-400 hover:shadow-md'
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200/50 bg-emerald-50 text-emerald-700 sm:h-12 sm:w-12">
            <span className="material-symbols-outlined text-xl sm:text-2xl">verified</span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-[#70787f]">
              Listos para disfrutar
            </span>
            <span className="font-heading text-lg font-bold text-emerald-800">
              {confirmadosCount}{' '}
              {confirmadosCount === 1 ? 'circuito confirmado' : 'circuitos confirmados'}
            </span>
          </div>
        </button>
      </div>

      {/* Buscador por viaje o destino + Selector Ordenar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80 md:w-96">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-xl text-[#70787f]">
            search
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por viaje o destino..."
            className="w-full rounded-xl border border-[#bfc8cf]/60 bg-white py-2.5 pr-4 pl-11 text-sm text-[#191c1e] shadow-sm outline-none transition-colors placeholder:text-[#70787f]/70 focus:border-[#00658d] focus:ring-1 focus:ring-[#00658d]"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="whitespace-nowrap text-xs font-medium text-[#3f484e] sm:text-sm">
            Ordenar:
          </span>
          <div className="relative flex-1 sm:w-48">
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenViaje)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#bfc8cf]/60 bg-white py-2.5 pr-8 pl-3.5 text-xs font-semibold text-[#191c1e] shadow-sm outline-none transition-colors focus:border-[#00658d] focus:ring-1 focus:ring-[#00658d] sm:text-sm"
            >
              <option value="recientes">Más recientes</option>
              <option value="proximos">Próximos a viajar</option>
              <option value="avance">Por grado de avance</option>
              <option value="alfabetico">Orden alfabético</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-base text-[#70787f]">
              unfold_more
            </span>
          </div>
        </div>
      </div>

      {query.isPending ? <GridSkeleton /> : null}
      {query.isError ? <ErrorState error={query.error} /> : null}
      {query.data && query.data.content.length === 0 ? (
        <EmptyState
          title="Todavía no hay borradores"
          description="Guardá un borrador desde el planificador para verlo acá."
        />
      ) : null}

      {query.data &&
      query.data.content.length > 0 &&
      viajesFiltradosYOrdenados.length === 0 ? (
        <EmptyState
          title="No se encontraron viajes"
          description="Probá cambiando el filtro seleccionado o el texto de búsqueda."
        />
      ) : null}

      {query.data && viajesFiltradosYOrdenados.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={query.isPlaceholderData}>
          {viajesFiltradosYOrdenados.map((borrador) => (
            <ViajeBorradorCard
              key={borrador.id}
              borrador={borrador}
              onDescartar={(id) => setBorradorADescartarId(id)}
              descartando={borradorADescartarId === borrador.id && descartar.isPending}
            />
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : <PaginationBar page={query.data} onPageChange={setPage} />}

      <AlertDialog
        open={borradorADescartarId !== null}
        onOpenChange={(open) => {
          if (!open && !descartar.isPending) {
            setBorradorADescartarId(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-[360px] gap-5 rounded-3xl bg-white p-6 shadow-2xl sm:max-w-[380px]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ffdad6]">
              <span className="material-symbols-outlined text-[28px] text-[#bb0413]">
                warning
              </span>
            </div>
            <div className="flex flex-col text-left">
              <AlertDialogTitle className="font-heading text-[22px] font-bold leading-tight text-[#191c1e]">
                ¿Descartar este borrador?
              </AlertDialogTitle>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#bb0413]">
                ACCIÓN IRREVERSIBLE
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-left text-[15px] leading-relaxed text-[#3f484e]">
            ¿Estás seguro de descartar este borrador? No podrás recuperar los pasos guardados ni las preferencias configuradas para este itinerario.
          </AlertDialogDescription>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setBorradorADescartarId(null)}
              disabled={descartar.isPending}
              className="flex h-14 items-center justify-center rounded-2xl border border-[#d8dadc] bg-white px-4 text-center text-sm font-semibold leading-tight text-[#191c1e] transition hover:bg-[#f2f4f6] disabled:opacity-50"
            >
              Mantener
              <br />
              borrador
            </button>
            <button
              type="button"
              onClick={handleConfirmarDescarte}
              disabled={descartar.isPending}
              className="flex h-14 items-center justify-center rounded-2xl bg-[#bb0413] px-4 text-center text-sm font-bold leading-tight text-white shadow-sm transition hover:bg-[#93000b] disabled:opacity-50"
            >
              {descartar.isPending ? (
                'Descartando...'
              ) : (
                <>
                  Sí,
                  <br />
                  descartar
                </>
              )}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
