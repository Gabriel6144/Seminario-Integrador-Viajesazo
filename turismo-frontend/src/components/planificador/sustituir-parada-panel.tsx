import type { UseQueryResult } from '@tanstack/react-query'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useMemo, useState } from 'react'

import { formatTimeRange } from '@/lib/dates'
import { toUserMessage } from '@/lib/http'
import { routeMetrics } from '@/lib/viajezaso/route-geometry'
import {
  CATEGORIA_LABELS,
  type LocalTime,
  type OpcionSustitucionResponse,
  type OpcionesSustitucionResponse,
  type ParadaVecinaResponse,
  type TipoRegistro,
} from '@/types/api'
import { SustitucionMapa, type OpcionEnMapa, type PuntoSustitucion } from './sustitucion-mapa'
import type { ParadaCircuitoDetalle } from './types'

/*
 * Panel "Sustituir parada" (diseño: canvas "Sustituir parada – recomendaciones del día").
 *
 * Muestra el hueco libre del día, cómo se ordenan las opciones (Me gusta, intereses, cercanía,
 * popularidad), filtros, una tarjeta por opción con los motivos, el mapa con la vista previa del
 * recorrido, lo que no entra con el motivo y una barra Antes → Después con el botón de confirmar.
 * El orden "Recomendadas" es el del backend; "Más cerca" y "Más populares" se reordenan acá.
 */

type Filtro = 'todas' | 'gusta' | 'intereses' | 'otras'
type FiltroTipo = 'ambos' | TipoRegistro
type Orden = 'recomendadas' | 'cerca' | 'populares'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'gusta', label: 'Te gustaron' },
  { id: 'intereses', label: 'Tus intereses' },
  { id: 'otras', label: 'Otras categorías' },
]

const TIPOS: { id: FiltroTipo; label: string }[] = [
  { id: 'ambos', label: 'Eventos y actividades' },
  { id: 'EVENTO', label: 'Eventos' },
  { id: 'ACTIVIDAD', label: 'Actividades' },
]

const ORDENES: { id: Orden; label: string }[] = [
  { id: 'recomendadas', label: 'Recomendadas' },
  { id: 'cerca', label: 'Más cerca' },
  { id: 'populares', label: 'Más populares' },
]

function pasaFiltro(opcion: OpcionSustitucionResponse, filtro: Filtro): boolean {
  if (filtro === 'gusta') return opcion.meGusta
  if (filtro === 'intereses') return opcion.enIntereses
  if (filtro === 'otras') return !opcion.enIntereses
  return true
}

function letraDe(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1)
}

function km(valor: number): string {
  return valor.toFixed(1).replace('.', ',')
}

/** "HH:mm" o "HH:mm:ss" → minutos del día. */
function minutos(hora: LocalTime | string | null | undefined): number | null {
  if (!hora) return null
  const [h, m] = hora.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function hhmm(totalMinutos: number): string {
  const h = Math.floor(totalMinutos / 60) % 24
  const m = totalMinutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function punto(
  nombre: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): PuntoSustitucion | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null
  return { nombre: nombre ?? 'Parada', lat, lng }
}

function vecino(parada: ParadaVecinaResponse | null): PuntoSustitucion | null {
  return parada ? punto(parada.propuestaNombre, parada.latitud, parada.longitud) : null
}

function distanciaKm(a: PuntoSustitucion, b: PuntoSustitucion): number {
  return routeMetrics([
    [a.lat, a.lng],
    [b.lat, b.lng],
  ]).total / 1000
}

function ubicacion(opcion: OpcionSustitucionResponse): string {
  const partes = [opcion.direccion, opcion.localidad, opcion.ciudad]
    .filter((parte): parte is string => Boolean(parte && parte.trim()))
    .filter((parte, index, todas) => todas.indexOf(parte) === index)
  return partes.length > 0 ? partes.join(', ') : 'Ubicación a confirmar'
}

interface SustituirParadaPanelProps {
  /** Parada a sustituir; `null` cierra el panel. */
  parada: ParadaCircuitoDetalle | null
  /** Etiqueta del día, por ejemplo "Domingo 1". */
  diaLabel: string
  opciones: UseQueryResult<OpcionesSustitucionResponse>
  isPending: boolean
  onCancel: () => void
  onConfirm: (propuestaId: number) => void
}

export function SustituirParadaPanel({
  parada,
  diaLabel,
  opciones,
  isPending,
  onCancel,
  onConfirm,
}: SustituirParadaPanelProps) {
  return (
    <DialogPrimitive.Root
      open={parada !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(92dvh,920px)] sm:w-[min(1180px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          {parada !== null && (
            <PanelContenido
              key={parada.id}
              parada={parada}
              diaLabel={diaLabel}
              opciones={opciones}
              isPending={isPending}
              onCancel={onCancel}
              onConfirm={onConfirm}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PanelContenido({
  parada,
  diaLabel,
  opciones,
  isPending,
  onCancel,
  onConfirm,
}: Omit<SustituirParadaPanelProps, 'parada'> & { parada: ParadaCircuitoDetalle }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [tipo, setTipo] = useState<FiltroTipo>('ambos')
  const [orden, setOrden] = useState<Orden>('recomendadas')
  const [elegida, setElegida] = useState<number | null>(null)

  // La respuesta se valida antes de usarla: si el backend todavía corre una versión vieja (por
  // ejemplo, no se reinició después de actualizar), devuelve otra forma y el panel no debe romperse.
  const crudo = opciones.data
  const respuestaVieja = crudo !== undefined && !Array.isArray(crudo?.opciones)
  const data = useMemo<OpcionesSustitucionResponse | undefined>(
    () =>
      crudo === undefined || !Array.isArray(crudo?.opciones)
        ? undefined
        : {
            ...crudo,
            noEntran: Array.isArray(crudo.noEntran) ? crudo.noEntran : [],
            paradaAnterior: crudo.paradaAnterior ?? null,
            paradaSiguiente: crudo.paradaSiguiente ?? null,
            mensaje: crudo.mensaje ?? null,
          },
    [crudo],
  )
  const todas = useMemo(() => data?.opciones ?? [], [data])
  const letras = useMemo(
    () => new Map(todas.map((opcion, index) => [opcion.propuestaId, letraDe(index)])),
    [todas],
  )

  const porTipo = useMemo(
    () => todas.filter((opcion) => tipo === 'ambos' || opcion.tipo === tipo),
    [todas, tipo],
  )
  const visibles = useMemo(() => {
    const lista = porTipo.filter((opcion) => pasaFiltro(opcion, filtro))
    if (orden === 'cerca') return [...lista].sort((a, b) => a.distanciaKm - b.distanciaKm)
    if (orden === 'populares') return [...lista].sort((a, b) => b.totalMeGusta - a.totalMeGusta)
    return lista
  }, [porTipo, filtro, orden])

  // Arranca con la mejor recomendación elegida; el turista la cambia con un toque.
  const seleccionId = elegida ?? todas[0]?.propuestaId ?? null
  const seleccion = todas.find((opcion) => opcion.propuestaId === seleccionId) ?? null
  const letraSeleccion = seleccion ? (letras.get(seleccion.propuestaId) ?? '') : ''

  const anterior = vecino(data?.paradaAnterior ?? null)
  const siguiente = vecino(data?.paradaSiguiente ?? null)
  const actual = punto(parada.title, parada.latitud, parada.longitud)
  const referencia =
    data?.paradaAnterior?.propuestaNombre ??
    data?.paradaSiguiente?.propuestaNombre ??
    'la parada que reemplazás'

  const opcionesMapa = useMemo<OpcionEnMapa[]>(
    () =>
      visibles.flatMap((opcion) => {
        const p = punto(opcion.propuestaNombre, opcion.latitud, opcion.longitud)
        return p ? [{ ...p, propuestaId: opcion.propuestaId, letra: letras.get(opcion.propuestaId) ?? '' }] : []
      }),
    [visibles, letras],
  )

  // Diferencia de traslado: misma referencia (la parada anterior o, si no hay, la siguiente).
  const refPunto = anterior ?? siguiente
  const deltaKm =
    seleccion && refPunto && actual ? seleccion.distanciaKm - distanciaKm(refPunto, actual) : null

  return (
    <>
      <header className="flex items-start gap-4 border-b border-slate-200 px-5 pt-5 pb-4 sm:px-6">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-[#00658d] sm:flex">
          <span className="material-symbols-outlined">swap_horiz</span>
        </span>
        <div className="min-w-0 flex-1">
          <DialogPrimitive.Title className="font-heading text-xl font-bold text-sky-900 sm:text-2xl">
            Sustituir parada
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-slate-700">
            Reemplazás <strong>{parada.title}</strong> ({parada.hours}) del{' '}
            <strong>{diaLabel.toLowerCase()}</strong>. Te mostramos solo lo que podés hacer ese
            día, en ese hueco y dentro de tu zona.
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            aria-label="Cerrar sin sustituir"
            disabled={isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </DialogPrimitive.Close>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {data && <HuecoDelDia data={data} parada={parada} seleccion={seleccion} letra={letraSeleccion} />}

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3 text-xs font-semibold sm:px-6">
          <span className="text-sm font-bold text-slate-900">Cómo las ordenamos:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1.5 text-pink-800">
            <span className="material-symbols-outlined fill text-[15px]">favorite</span>1 · Lo que
            marcaste con Me gusta
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800">2 · Tus intereses</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">
            3 · Cercanía a tu recorrido
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">4 · Popularidad</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 sm:px-6">
          <div role="group" aria-label="Filtrar por motivo" className="flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const activo = filtro === f.id
              const cantidad = porTipo.filter((opcion) => pasaFiltro(opcion, f.id)).length
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltro(f.id)}
                  className={`min-h-10 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                    activo
                      ? 'bg-[#00658d] text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {f.label} ({cantidad})
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Tipo de propuesta" className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tipo === t.id}
                  onClick={() => setTipo(t.id)}
                  className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    tipo === t.id ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Ordenar" className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">Ordenar:</span>
              {ORDENES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={orden === o.id}
                  onClick={() => setOrden(o.id)}
                  className={`min-h-9 border-b-2 px-1.5 text-xs font-semibold ${
                    orden === o.id ? 'border-[#00658d] text-[#00658d]' : 'border-transparent text-slate-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row sm:px-6">
          <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1 lg:flex-[1.4]">
            {opciones.isPending && (
              <div role="status" className="flex flex-col gap-3">
                <p className="text-sm text-slate-600">Buscando lo que entra en tu día…</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            )}
            {respuestaVieja && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                No pudimos leer las opciones que mandó el servidor. Si acabás de actualizar el
                sistema, reiniciá el backend y volvé a intentar.
              </p>
            )}
            {opciones.isError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {toUserMessage(opciones.error)}
              </p>
            )}
            {data && todas.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm leading-relaxed text-slate-600">
                {data.mensaje ?? 'No hay propuestas disponibles para reemplazar esta parada.'}
              </p>
            )}
            {data && todas.length > 0 && (
              <>
                <p className="text-sm text-slate-600" aria-live="polite">
                  {visibles.length === 1
                    ? '1 opción entra en tu hueco.'
                    : `${visibles.length} opciones entran en tu hueco.`}
                </p>
                {visibles.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600">
                    No hay propuestas con este filtro que entren en tu hueco. Probá con otro o con
                    “Todas”.
                  </p>
                )}
                <ul className="flex flex-col gap-3">
                  {visibles.map((opcion) => (
                    <li key={opcion.propuestaId}>
                      <TarjetaOpcion
                        opcion={opcion}
                        letra={letras.get(opcion.propuestaId) ?? ''}
                        referencia={referencia}
                        seleccionada={opcion.propuestaId === seleccionId}
                        onSelect={() => setElegida(opcion.propuestaId)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data && data.noEntran.length > 0 && (
              <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" open={todas.length === 0}>
                <summary className="min-h-7 cursor-pointer text-[13px] font-bold text-slate-700">
                  No entran ese día ({data.noEntran.length}) — ver por qué
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5 pl-1 text-[13px] leading-snug text-slate-600">
                  {data.noEntran.map((item) => (
                    <li key={item.propuestaId}>
                      <strong className="text-slate-900">{item.propuestaNombre}</strong>
                      {item.meGusta && <span className="text-pink-700"> (te gustó)</span>} —{' '}
                      {item.motivo}.
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="order-1 flex min-w-0 flex-col gap-2 lg:order-2 lg:flex-1">
            <div className="h-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-72 lg:h-[420px]">
              {data && (
                <SustitucionMapa
                  anterior={anterior}
                  siguiente={siguiente}
                  actual={actual}
                  opciones={opcionesMapa}
                  seleccionadaId={seleccionId}
                  onSelect={setElegida}
                />
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Tocá una letra del mapa o una tarjeta para ver cómo queda el recorrido (línea azul, en
              línea recta). La punteada es el recorrido actual. Solo aparecen propuestas activas,
              dentro de tu radio y que todavía no están en tu circuito.
            </p>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
        <div className="flex min-w-0 flex-[1_1_420px] flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <div className="hidden min-w-0 sm:block">
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Antes</p>
            <p className="truncate text-slate-600 line-through">
              {parada.title} · {parada.hours}
            </p>
          </div>
          <span className="material-symbols-outlined hidden text-[#00658d] sm:inline" aria-hidden>
            arrow_forward
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wide text-[#00658d] uppercase">Después</p>
            <p className="truncate font-bold text-slate-900">
              {seleccion
                ? `${seleccion.propuestaNombre} · ${formatTimeRange(seleccion.horaInicio, seleccion.horaFin) ?? 'A confirmar'}`
                : 'Elegí una opción'}
            </p>
          </div>
          {deltaKm !== null && Math.abs(deltaKm) >= 0.05 && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                deltaKm < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {deltaKm < 0
                ? `${km(Math.abs(deltaKm))} km menos de traslado`
                : `${km(deltaKm)} km más de traslado`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => seleccion && onConfirm(seleccion.propuestaId)}
            disabled={seleccion === null || isPending}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-[#00658d] px-5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#00577a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              check
            </span>
            {isPending ? 'Sustituyendo…' : seleccion ? `Sustituir por ${letraSeleccion}` : 'Sustituir'}
          </button>
        </div>
      </footer>
    </>
  )
}

function HuecoDelDia({
  data,
  parada,
  seleccion,
  letra,
}: {
  data: OpcionesSustitucionResponse
  parada: ParadaCircuitoDetalle
  seleccion: OpcionSustitucionResponse | null
  letra: string
}) {
  const inicioHueco = minutos(data.huecoInicio) ?? 6 * 60
  const finHueco = minutos(data.huecoFin) ?? 24 * 60
  const anteriorInicio = minutos(data.paradaAnterior?.horaInicio)
  const siguienteFin = minutos(data.paradaSiguiente?.horaFin)
  // Escala de la barra: una hora antes y después de lo que se muestra, en horas enteras.
  const desde = Math.max(0, Math.floor(((anteriorInicio ?? inicioHueco) - 60) / 60) * 60)
  const hasta = Math.min(24 * 60, Math.ceil(((siguienteFin ?? finHueco) + 60) / 60) * 60)
  const rango = Math.max(hasta - desde, 60)
  const pos = (inicio: number, fin: number) => ({
    left: `${((Math.max(inicio, desde) - desde) / rango) * 100}%`,
    width: `${(Math.max(Math.min(fin, hasta) - Math.max(inicio, desde), 0) / rango) * 100}%`,
  })
  const marcas: number[] = []
  const paso = rango > 10 * 60 ? 180 : 120
  for (let m = Math.ceil(desde / paso) * paso; m <= hasta; m += paso) marcas.push(m)

  const actualInicio = minutos(parada.horaInicio)
  const actualFin = minutos(parada.horaFin)
  const selInicio = minutos(seleccion?.horaInicio)
  const selFin = minutos(seleccion?.horaFin)
  const finVecinaAnterior = minutos(data.paradaAnterior?.horaFin)
  const inicioVecinaSiguiente = minutos(data.paradaSiguiente?.horaInicio)

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">
          Tu hueco libre: {hhmm(inicioHueco)} – {hhmm(finHueco)}
        </h3>
        <p className="text-xs text-slate-600">
          {data.paradaAnterior || data.paradaSiguiente
            ? 'Entre la parada anterior y la siguiente. Cada opción ya tiene en cuenta el traslado.'
            : 'Es la única parada del día: entra cualquier horario.'}
        </p>
      </div>
      <div
        className="relative h-14 rounded-xl border border-slate-200 bg-white"
        role="img"
        aria-label={`Hueco libre de ${hhmm(inicioHueco)} a ${hhmm(finHueco)}`}
      >
        {data.paradaAnterior && anteriorInicio !== null && finVecinaAnterior !== null && (
          <div
            className="absolute top-2 bottom-2 overflow-hidden rounded-lg bg-slate-300 px-2 py-1 text-[11px] leading-tight font-semibold text-slate-800"
            style={pos(anteriorInicio, finVecinaAnterior)}
          >
            {data.paradaAnterior.propuestaNombre}
          </div>
        )}
        <div
          className="absolute top-1 bottom-1 rounded-lg border-2 border-dashed border-sky-300 bg-sky-50/60"
          style={pos(inicioHueco, finHueco)}
        />
        {actualInicio !== null && actualFin !== null && (
          <div
            className="absolute top-2 bottom-2 overflow-hidden rounded-lg border border-dashed border-slate-400 px-2 py-1 text-[11px] text-slate-500 line-through"
            style={pos(actualInicio, actualFin)}
          >
            {parada.title}
          </div>
        )}
        {selInicio !== null && selFin !== null && (
          <div
            className="absolute top-3.5 bottom-3.5 flex items-center overflow-hidden rounded-lg bg-[#00658d] px-2 text-[11px] font-bold whitespace-nowrap text-white shadow-md"
            style={pos(selInicio, selFin <= selInicio ? selFin + 24 * 60 : selFin)}
          >
            {letra} · {hhmm(selInicio)} – {hhmm(selFin)}
          </div>
        )}
        {data.paradaSiguiente && inicioVecinaSiguiente !== null && siguienteFin !== null && (
          <div
            className="absolute top-2 bottom-2 overflow-hidden rounded-lg bg-slate-300 px-2 py-1 text-[11px] leading-tight font-semibold text-slate-800"
            style={pos(inicioVecinaSiguiente, siguienteFin)}
          >
            {data.paradaSiguiente.propuestaNombre}
          </div>
        )}
      </div>
      <div className="relative h-4 text-[11px] text-slate-500" aria-hidden>
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute -translate-x-1/2"
            style={{ left: `${((m - desde) / rango) * 100}%` }}
          >
            {hhmm(m)}
          </span>
        ))}
      </div>
    </div>
  )
}

function TarjetaOpcion({
  opcion,
  letra,
  referencia,
  seleccionada,
  onSelect,
}: {
  opcion: OpcionSustitucionResponse
  letra: string
  referencia: string
  seleccionada: boolean
  onSelect: () => void
}) {
  const categoria = opcion.categoria ? (CATEGORIA_LABELS[opcion.categoria] ?? opcion.categoria) : null
  const motivos: string[] = []
  if (opcion.meGusta) motivos.push('Le diste Me gusta')
  if (opcion.enIntereses && categoria) motivos.push(`${categoria} es de tus intereses`)
  motivos.push('Entra en tu hueco')
  if (opcion.distanciaKm <= 0.5) motivos.push(`Muy cerca de ${referencia}`)

  return (
    <button
      type="button"
      aria-pressed={seleccionada}
      aria-label={`${letra}. ${opcion.propuestaNombre}`}
      onClick={onSelect}
      className={`flex w-full gap-3.5 rounded-2xl bg-white p-3.5 text-left transition-shadow ${
        seleccionada
          ? 'border-2 border-[#00658d] shadow-[0_6px_18px_rgba(0,101,141,0.18)]'
          : 'border border-slate-200 hover:border-sky-300'
      }`}
    >
      <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#0b4f6c] to-[#3d8fb8] sm:h-[104px] sm:w-[116px]">
        {opcion.imagen && (
          <img src={opcion.imagen} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-[#00658d] shadow">
          {letra}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-start justify-between gap-2">
          <span className="font-heading text-[15px] leading-snug font-bold text-slate-900">
            {opcion.propuestaNombre}
          </span>
          <span
            aria-hidden
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              seleccionada ? 'bg-[#00658d] text-white' : 'border-2 border-slate-300'
            }`}
          >
            {seleccionada && <span className="material-symbols-outlined text-[16px]">check</span>}
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span
            className={`rounded-full px-2 py-0.5 ${
              opcion.tipo === 'EVENTO' ? 'bg-pink-100 text-pink-800' : 'bg-sky-100 text-sky-800'
            }`}
          >
            {opcion.tipo === 'EVENTO' ? 'Evento' : 'Actividad'}
          </span>
          {categoria && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{categoria}</span>}
          {!opcion.enIntereses && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Fuera de tus preferencias</span>
          )}
        </span>
        <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]" aria-hidden>
              schedule
            </span>
            <strong>{formatTimeRange(opcion.horaInicio, opcion.horaFin) ?? 'A confirmar'}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]" aria-hidden>
              location_on
            </span>
            a {km(opcion.distanciaKm)} km de {referencia}
          </span>
          <span className="inline-flex items-center gap-1 text-pink-800">
            <span className={`material-symbols-outlined text-[15px] ${opcion.meGusta ? 'fill' : ''}`} aria-hidden>
              favorite
            </span>
            {opcion.meGusta
              ? `Te gustó · ${opcion.totalMeGusta} Me gusta`
              : `${opcion.totalMeGusta} Me gusta`}
          </span>
        </span>
        <span className="truncate text-xs text-slate-500">{ubicacion(opcion)}</span>
        <span className="flex flex-wrap gap-1.5">
          {motivos.map((motivo) => (
            <span
              key={motivo}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
            >
              <span className="material-symbols-outlined text-[13px]" aria-hidden>
                check
              </span>
              {motivo}
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}
