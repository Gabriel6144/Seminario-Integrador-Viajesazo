import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { buscarDestino, type DestinoGeocodificado } from '@/lib/geocoding'

import { ZONES } from './constants'
import { GuiaCallout } from './guia-callout'
import type { DestinoSeleccionado } from './types'

const DestinoMapa = lazy(() =>
  import('./destino-mapa').then((module) => ({ default: module.DestinoMapa })),
)

interface Paso4DestinoProps {
  destino: DestinoSeleccionado | null
  isValid: boolean
  onSelectDestino: (destino: DestinoSeleccionado) => void
  onNext: () => void
}

export function Paso4Destino({
  destino,
  onSelectDestino,
  onNext,
}: Paso4DestinoProps) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<DestinoGeocodificado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const buscar = useCallback(async () => {
    const texto = busqueda.trim()
    if (texto.length === 0) {
      setError('Ingresá una ciudad, localidad o punto de interés.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setBuscando(true)
    setError(null)
    setResultados([])

    const encontrados = await buscarDestino(texto, controller.signal)

    if (controller.signal.aborted) return

    setBuscando(false)
    setResultados(encontrados)
    if (encontrados.length === 0) {
      setError('No encontramos ese destino en Córdoba. Probá con otro nombre.')
    }
  }, [busqueda])

  const elegirResultado = (lugar: DestinoGeocodificado) => {
    onSelectDestino({
      nombre: lugar.nombre,
      ciudad: lugar.ciudad,
      localidad: lugar.localidad,
      latitud: lugar.lat,
      longitud: lugar.lng,
    })
    setResultados([])
    setBusqueda('')
    setError(null)
  }

  const elegirZona = (zona: (typeof ZONES)[number]) => {
    onSelectDestino({
      nombre: zona.label,
      ciudad: zona.ubicacion.ciudad,
      localidad: zona.ubicacion.localidad,
      latitud: zona.ubicacion.latitud,
      longitud: zona.ubicacion.longitud,
    })
    setResultados([])
    setBusqueda('')
    setError(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void buscar()
    }
  }

  return (
    <div className="flex min-h-[500px] w-full flex-col justify-between">
      <div>
        <GuiaCallout message="Elegí la zona que querés conocer: la usamos como base para armar el recorrido." />

        <h2 className="font-heading flex items-center gap-2 text-2xl font-bold text-slate-800 sm:text-3xl">
          <span>¿Cuál es tu zona de destino?</span>
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Buscá un lugar de Córdoba o elegí una sugerencia. El mapa te muestra la zona y sus
          alrededores para que imagines el viaje.
        </p>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-12">
          {/* Buscador y sugerencias */}
          <div className="space-y-3 md:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <label
                htmlFor="destino-busqueda"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Buscar destino
              </label>
              <div className="flex gap-2">
                <input
                  id="destino-busqueda"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej.: Villa Carlos Paz, La Cumbrecita…"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => void buscar()}
                  disabled={buscando}
                  className="rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buscando ? 'Buscando…' : 'Buscar'}
                </button>
              </div>

              {error === null ? null : (
                <p className="mt-2 text-xs font-semibold text-amber-700">{error}</p>
              )}

              {resultados.length === 0 ? null : (
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {resultados.map((lugar) => (
                    <li key={`${lugar.lat}-${lugar.lng}-${lugar.ciudad}`}>
                      <button
                        type="button"
                        onClick={() => elegirResultado(lugar)}
                        className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:border-sky-300 hover:bg-sky-50"
                      >
                        <span className="block font-bold text-slate-800">{lugar.nombre}</span>
                        <span className="block text-xs text-slate-500">
                          {[lugar.ciudad, lugar.localidad].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Sugerencias
            </p>

            <div className="space-y-2">
              {ZONES.map((zona) => {
                const isSelected =
                  destino !== null &&
                  destino.latitud === zona.ubicacion.latitud &&
                  destino.longitud === zona.ubicacion.longitud

                return (
                  <button
                    key={zona.name}
                    type="button"
                    onClick={() => elegirZona(zona)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-slate-800 shadow-md ring-1 ring-sky-400/40'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{zona.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{zona.label}</p>
                        <p className="text-xs text-slate-500">{zona.desc}</p>
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
          </div>

          {/* Mapa real */}
          <div className="md:col-span-7">
            <Suspense
              fallback={
                <div className="h-72 w-full animate-pulse rounded-3xl border border-slate-700 bg-slate-900 sm:h-80 md:h-[400px]" />
              }
            >
              <DestinoMapa destino={destino} onSelectDestino={onSelectDestino} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 flex justify-end">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 font-heading text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 active:scale-[0.98] sm:w-auto"
          onClick={onNext}
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
