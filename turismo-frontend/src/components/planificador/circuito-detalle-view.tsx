import { useState } from 'react'
import {
  ALTERNATIVAS_REEMPLAZO,
  PARADAS_INICIALES_POR_DIA,
} from './constants'
import { ParadaUbicacionMapaView } from './parada-ubicacion-mapa-view'
import type {
  AlternativaReemplazo,
  CircuitoRecomendado,
  ParadaCircuitoDetalle,
} from './types'

interface CircuitoDetalleViewProps {
  circuito: CircuitoRecomendado
  activeDay: number
  isSavingTrip: boolean
  onChangeActiveDay: (day: number) => void
  onBackToList: () => void
  onSaveTrip: () => void
  onExploreMap: () => void
  onRestart: () => void
}

export function CircuitoDetalleView({
  circuito,
  activeDay,
  isSavingTrip,
  onChangeActiveDay,
  onBackToList,
  onSaveTrip,
  onExploreMap,
  onRestart,
}: CircuitoDetalleViewProps) {
  const [paradasPorDia, setParadasPorDia] = useState<
    Record<number, ParadaCircuitoDetalle[]>
  >(() => ({
    1: [...(PARADAS_INICIALES_POR_DIA[1] ?? [])],
    2: [...(PARADAS_INICIALES_POR_DIA[2] ?? [])],
    3: [...(PARADAS_INICIALES_POR_DIA[3] ?? [])],
  }))

  const [detailStop, setDetailStop] = useState<ParadaCircuitoDetalle | null>(null)
  const [mapStop, setMapStop] = useState<ParadaCircuitoDetalle | null>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false)
  const [localToast, setLocalToast] = useState<string | null>(null)

  if (mapStop !== null) {
    return (
      <ParadaUbicacionMapaView
        circuitoTitle={circuito.title}
        parada={mapStop}
        onBack={() => setMapStop(null)}
      />
    )
  }

  const showLocalToast = (message: string) => {
    setLocalToast(message)
    setTimeout(() => setLocalToast(null), 2400)
  }

  const handleApplyReplacement = (alt: AlternativaReemplazo) => {
    if (!replaceTargetId) return
    setParadasPorDia((prev) => {
      const next: Record<number, ParadaCircuitoDetalle[]> = {}
      for (const [dayKey, stops] of Object.entries(prev)) {
        next[Number(dayKey)] = stops.map((stop) =>
          stop.id === replaceTargetId
            ? {
                ...stop,
                title: alt.title,
                category: alt.category,
                badgeClass: alt.badgeClass,
                description: alt.description,
                detailDescription: alt.description,
                image: alt.image,
                location: alt.location,
                hours: alt.hours,
                price: alt.price,
                latitud: alt.latitud,
                longitud: alt.longitud,
              }
            : stop,
        )
      }
      return next
    })
    setReplaceTargetId(null)
    showLocalToast(`Actividad sustituida por: ${alt.title}`)
  }

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return
    setParadasPorDia((prev) => {
      const next: Record<number, ParadaCircuitoDetalle[]> = {}
      for (const [dayKey, stops] of Object.entries(prev)) {
        next[Number(dayKey)] = stops.filter((stop) => stop.id !== deleteTargetId)
      }
      return next
    })
    setDeleteTargetId(null)
    showLocalToast('Actividad eliminada del itinerario')
  }

  const stopsOfDay = paradasPorDia[activeDay] ?? []

  return (
    <div className="w-full pb-8">
      {/* Top Header */}
      <header className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={onBackToList}
          aria-label="Volver a circuitos recomendados"
          className="flex h-10 w-10 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-slate-100 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-heading flex-1 truncate px-2 text-center text-lg font-bold text-sky-800 sm:text-xl">
          Circuitos Recomendados
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Hero Section */}
      <section className="relative h-64 w-full overflow-hidden rounded-3xl shadow-md sm:h-80">
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${circuito.image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute bottom-0 left-0 z-10 w-full p-5 text-white sm:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className=" flex items-center gap-1 rounded-full border border-amber-200/40 bg-amber-900/40 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">
                {circuito.categoryIcon}
              </span>
              <span>{circuito.categoryTag}</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-sky-200/30 bg-sky-900/50 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
              <span>Personalizable</span>
            </span>
          </div>
          <h2 className="font-heading mb-2 text-2xl font-bold text-white sm:text-3xl">
            {circuito.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-white/90 sm:text-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span>{circuito.daysLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">directions_walk</span>
              <span>{circuito.paceLabel}</span>
            </span>
            <span className="flex items-center gap-1 text-sky-200">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>A tu medida</span>
            </span>
          </div>
        </div>
      </section>

      {/* Weather Alert Banner */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#df2a29] p-4 text-white shadow-sm">
        <span className="material-symbols-outlined mt-0.5 text-white">sunny</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Ideal para exteriores</h3>
          <p className="text-xs text-white/90 sm:text-sm">
            Día despejado con 24°C. Perfecto para recorridos a pie.
          </p>
        </div>
      </div>

      {/* Personalization Banner */}
      <div className="mt-3 flex items-start gap-3.5 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-slate-50 to-white p-4 shadow-sm">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00658d] text-white shadow-sm">
          <span className="material-symbols-outlined text-[22px]">tune</span>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-bold text-[#00658d] sm:text-base">
              Personalizá tu circuito
            </h3>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#00658d]">
              En tiempo real
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-[13px]">
            Podés sustituir o eliminar paradas según tus preferencias y tiempos de viaje. El
            itinerario se recalculará automáticamente.
          </p>
        </div>
      </div>

      {/* Day Selector */}
      <nav className="mt-5 border-b border-slate-200/70 pb-3">
        <ul className="flex gap-2.5 overflow-x-auto">
          {[1, 2, 3].map((d) => {
            const isActive = activeDay === d
            return (
              <li key={d} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeActiveDay(d)}
                  className={`flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold transition-all active:scale-95 sm:text-sm ${
                    isActive
                      ? 'bg-[#00658d] text-white shadow-md'
                      : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/70'
                  }`}
                >
                  <span>Día {d}</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-sky-200" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Itinerary Timeline */}
      <section className="mt-6 space-y-6">
        {stopsOfDay.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No quedan paradas asignadas para el Día {activeDay}.
          </div>
        ) : (
          stopsOfDay.map((stop, idx) => (
            <div key={stop.id}>
              <div className="relative pl-14">
                {idx < stopsOfDay.length - 1 && (
                  <div className="absolute top-6 -bottom-10 left-[23px] z-0 w-0.5 bg-[#D4A373]" />
                )}

                {/* Time Badge */}
                <div className="absolute top-0 left-0 z-10 flex w-12 flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4A373] bg-white shadow-md">
                    <span className="text-xs font-bold text-slate-800">{stop.time}</span>
                  </div>
                </div>

                {/* Stop Card */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md">
                  {/* Image + Category */}
                  <div className="relative mb-3 overflow-hidden rounded-xl">
                    <img
                      alt={stop.title}
                      src={stop.image}
                      className="h-44 w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className={`absolute bottom-2.5 left-2.5 rounded-md px-2.5 py-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm ${stop.badgeClass}`}
                    >
                      {stop.category}
                    </span>
                  </div>

                  <h3 className="font-heading mb-1.5 text-lg font-bold leading-snug text-slate-800">
                    {stop.title}
                  </h3>
                  <p className="mb-4 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {stop.description}
                  </p>

                  {/* 4 Action Buttons */}
                  <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setMapStop(stop)}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">map</span>
                      <span>Mapa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailStop(stop)}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>Detalles</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplaceTargetId(stop.id)}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-[#00658d] transition-colors hover:bg-sky-100 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                      <span>Sustituir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(stop.id)}
                      className="flex h-10 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Walk Connector */}
              {stop.walkNext && idx < stopsOfDay.length - 1 && (
                <div className="relative mt-4 flex items-center gap-3 py-2 pl-14 text-xs text-slate-600">
                  <div className="absolute left-[21.5px] z-10 h-1.5 w-1.5 rounded-full bg-[#D4A373]" />
                  <span className="material-symbols-outlined text-[18px] text-amber-700">
                    directions_walk
                  </span>
                  <span className="rounded-full bg-slate-200/70 px-3 py-1.5 font-medium text-slate-700">
                    {stop.walkNext}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Bottom Confirm Button + Mapa General FAB */}
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          disabled={isSavingTrip}
          onClick={() => setIsSuccessModalOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#00658d] px-6 py-4 font-heading text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-[#004f70] active:scale-[0.98] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[22px]">check_circle</span>
          <span>Confirmar y guardar circuito</span>
        </button>

        <button
          type="button"
          aria-label="Abrir mapa del circuito"
          title="Ver mapa del circuito"
          onClick={onExploreMap}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#00658d] text-white shadow-lg transition-all hover:scale-105 hover:bg-[#004f70] active:scale-95"
        >
          <span className="material-symbols-outlined text-[26px]">map</span>
        </button>
      </div>

      {/* MODAL: SUSTITUIR PARADA */}
      {replaceTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-heading flex items-center gap-1.5 text-lg font-bold text-slate-800">
                  <span className="material-symbols-outlined text-[22px] text-[#00658d]">
                    swap_horiz
                  </span>
                  <span>Sustituir Parada</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Seleccioná una alternativa recomendada para este horario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplaceTargetId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-3.5 overflow-y-auto py-3 pr-0.5">
              {ALTERNATIVAS_REEMPLAZO.map((alt) => (
                <div
                  key={alt.id}
                  className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:border-sky-300"
                >
                  <div className="flex gap-3">
                    <img
                      alt={alt.title}
                      src={alt.image}
                      className="h-24 w-24 shrink-0 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${alt.badgeClass}`}
                      >
                        {alt.category}
                      </span>
                      <h4 className="font-heading mt-1 text-sm font-bold text-slate-800 sm:text-base">
                        {alt.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {alt.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/70 pt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <span className="material-symbols-outlined text-[15px] text-[#00658d]">
                        schedule
                      </span>
                      <span>{alt.walkDistance}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyReplacement(alt)}
                      className="flex items-center gap-1 rounded-xl bg-[#00658d] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#004f70] active:scale-95"
                    >
                      <span>Elegir alternativa</span>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setReplaceTargetId(null)}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <span className="material-symbols-outlined text-[26px]">delete_forever</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-slate-800">
              ¿Quitar esta parada?
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              La actividad se removerá de tu itinerario de este día. Podrás volver a agregarla o
              recalcular tu circuito más tarde.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLES DE LA ACTIVIDAD */}
      {detailStop !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-heading text-lg font-bold text-slate-800">
                {detailStop.title}
              </h3>
              <button
                type="button"
                onClick={() => setDetailStop(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 py-4 text-xs sm:text-sm">
              <p className="leading-relaxed text-slate-600">{detailStop.detailDescription}</p>
              <div className="flex items-center gap-2 text-slate-800">
                <span className="material-symbols-outlined text-[18px] text-[#00658d]">
                  location_on
                </span>
                <span className="font-medium">{detailStop.location}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <span className="material-symbols-outlined text-[18px] text-[#00658d]">
                  schedule
                </span>
                <span className="font-medium">{detailStop.hours}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <span className="material-symbols-outlined text-[18px] text-[#00658d]">
                  payments
                </span>
                <span className="font-medium">{detailStop.price}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const stopToMap = detailStop
                  setDetailStop(null)
                  setMapStop(stopToMap)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00658d] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#004f70]"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span>Ver en mapa</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailStop(null)}
                className="rounded-xl bg-slate-100 px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CIRCUITO GUARDADO CON ÉXITO */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-[#00658d] ring-8 ring-sky-50/60">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-800">
              ¡Circuito guardado con éxito!
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Tu circuito <strong>&quot;{circuito.title}&quot;</strong> ha sido asignado a tu viaje
              en Córdoba.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isSavingTrip}
                onClick={() => {
                  setIsSuccessModalOpen(false)
                  onSaveTrip()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00658d] py-3 text-xs font-semibold text-white shadow-md hover:bg-[#004f70] disabled:opacity-60 sm:text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">luggage</span>
                <span>{isSavingTrip ? 'Guardando...' : 'Ver en Mis Viajes'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccessModalOpen(false)
                  onRestart()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                <span className="material-symbols-outlined text-[20px] text-[#00658d]">
                  explore
                </span>
                <span>Volver al Planificador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST LOCAL */}
      {localToast && (
        <div className="pointer-events-none fixed top-5 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
            <span className="material-symbols-outlined text-[18px] text-sky-300">
              check_circle
            </span>
            <span>{localToast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

