import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { rutaQueryKey } from '@/api/rutas'
import { Button } from '@/components/ui/button'
import { captureCircuitoDiaMapa } from '@/lib/circuito-mapa-captura'
import {
  buildCircuitoPdfDefinition,
  buildSummaryData,
  DAY_BADGE_COLORS,
  SUMMARY_HERO,
} from '@/lib/circuito-pdf'
import { buildDayData, DAY_MAP } from '@/lib/circuito-pdf-day'
import {
  composeDayGalleryDataUrl,
  DAY_GALLERY,
} from '@/lib/circuito-pdf-day-gallery'
import { composeDayMapDataUrl } from '@/lib/circuito-pdf-day-map'
import {
  buildNumberBadgeDataUrl,
  buildOutlineBadgeDataUrl,
  composeHeroDataUrl,
} from '@/lib/circuito-pdf-hero'
import {
  loadBrandFonts,
  loadCanvasFonts,
  loadFirstPhotoDataUrl,
  loadHeroDataUrl,
  loadLogoDataUrl,
} from '@/lib/pdf-assets'
import { loadPdfMake } from '@/lib/pdfmake'
import { obtenerRutaDia, type RutaDia } from '@/lib/rutas'
import type { ViajeResponse } from '@/types/api'
import type { CircuitoRecomendado } from './types'

type Estado = 'idle' | 'loading' | 'ready' | 'error'

interface CircuitoPdfPreviewDialogProps {
  abierto: boolean
  circuito: CircuitoRecomendado
  viaje: ViajeResponse | null
  onClose: () => void
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  return slug === '' ? 'circuito' : slug
}

/**
 * Genera el PDF con pdfmake y lo muestra en un iframe antes de descargarlo.
 *
 * No hay opciones de diseño: el formato es el mismo para todos. La generación carga fuentes,
 * logo y mapas en paralelo; si un mapa falla, el documento sigue con su bloque de marca.
 */
export function CircuitoPdfPreviewDialog({
  abierto,
  circuito,
  viaje,
  onClose,
}: CircuitoPdfPreviewDialogProps) {
  const [estado, setEstado] = useState<Estado>('idle')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const definicionRef = useRef<TDocumentDefinitions | null>(null)
  const pdfUrlRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const reemplazarPdfUrl = useCallback((next: string | null) => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
    }
    pdfUrlRef.current = next
    setPdfUrl(next)
  }, [])

  const generar = useCallback(async () => {
    setEstado('loading')
    setError(null)
    reemplazarPdfUrl(null)
    definicionRef.current = null

    try {
      const summary = buildSummaryData(circuito, viaje)

      await Promise.all([loadBrandFonts(), loadCanvasFonts()])
      const heroImage = await loadHeroDataUrl()

      const [
        logoDataUrl,
        heroDataUrl,
        dayEntries,
        dayBadgeEntries,
        stopBadgeEntries,
        dayStopBadgeEntries,
      ] = await Promise.all([
        loadLogoDataUrl(),
        composeHeroDataUrl({
          imageDataUrl: heroImage,
          badge: summary.heroBadge,
          statLabel: summary.heroStatLabel,
          statValue: summary.heroStatValue,
          title: summary.heroTitle,
          meta: summary.heroMeta,
          width: SUMMARY_HERO.width,
          height: SUMMARY_HERO.height,
        }),
        Promise.all(
          circuito.days.map(async (day) => {
            const dayStops = circuito.stopsByDay[day.number] ?? []
            const data = buildDayData(day, circuito, viaje)
            const coords = dayStops.flatMap((stop) =>
              typeof stop.latitud === 'number' && typeof stop.longitud === 'number'
                ? [{ lat: stop.latitud, lng: stop.longitud }]
                : [],
            )
            const routePromise: Promise<RutaDia | null> =
              coords.length >= 2
                ? viaje
                  ? queryClient
                      .fetchQuery<RutaDia>({
                        queryKey: rutaQueryKey(
                          viaje.id,
                          circuito.estrategia,
                          day.fecha,
                          dayStops.map((stop) => stop.id),
                        ),
                        queryFn: ({ signal }) => obtenerRutaDia(coords, signal),
                        staleTime: Infinity,
                        retry: false,
                      })
                      .catch(() => null)
                  : obtenerRutaDia(coords).catch(() => null)
                : Promise.resolve(null)
            const [route, photos] = await Promise.all([
              routePromise,
              Promise.all(
                dayStops.map((stop) =>
                  loadFirstPhotoDataUrl(
                    stop.images.length > 0 ? stop.images : [stop.image],
                  ),
                ),
              ),
            ])
            const capture = await captureCircuitoDiaMapa(
              dayStops.map((stop) => ({
                number: stop.number,
                title: stop.title,
                latitud: stop.latitud,
                longitud: stop.longitud,
              })),
              {
                width: DAY_MAP.width * 2,
                height: DAY_MAP.height * 2,
                route: route?.geometria,
              },
            )
            const map = await composeDayMapDataUrl({
              capture,
              width: DAY_MAP.width,
              height: DAY_MAP.height,
              stops: data.mapStops,
              routePoints: capture?.routePoints,
              dayNumber: day.number,
              routeTitle: data.title,
              totalKm: data.totalKm,
            })
            const gallery = await composeDayGalleryDataUrl({
              stops: data.stops.map((stop, index) => ({
                ...stop,
                imageDataUrl: photos[index] ?? null,
              })),
              width: DAY_GALLERY.width,
              height: DAY_GALLERY.height,
            })
            return [day.number, { map, gallery }] as const
          }),
        ),
        Promise.all(
          circuito.days.map(async (day, index) => {
            const badge = await buildNumberBadgeDataUrl(
              day.number,
              DAY_BADGE_COLORS[index % DAY_BADGE_COLORS.length],
              28,
            )
            return [day.number, badge] as const
          }),
        ),
        Promise.all(
          summary.days
            .flatMap((day) => day.stops)
            .map(async (stop) => {
              const badge = await buildNumberBadgeDataUrl(
                stop.globalNumber,
                '#e45750',
                14,
              )
              return [String(stop.globalNumber), badge] as const
            }),
        ),
        Promise.all(
          circuito.days.flatMap((day) =>
            (circuito.stopsByDay[day.number] ?? []).map(async (stop) => {
              const badge = await buildOutlineBadgeDataUrl(stop.number, '#00658d', 24)
              return [`${day.number}:${stop.number}`, badge] as const
            }),
          ),
        ),
      ])

      const dayMaps = Object.fromEntries(
        dayEntries.map(([number, entry]) => [number, entry.map]),
      ) as Record<number, string | null>
      const dayGalleries = Object.fromEntries(
        dayEntries.map(([number, entry]) => [number, entry.gallery]),
      ) as Record<number, string | null>
      const dayBadges = Object.fromEntries(dayBadgeEntries) as Record<number, string | null>
      const stopBadges: Record<string, string | null> = Object.fromEntries(stopBadgeEntries)
      const dayStopBadges: Record<string, string | null> =
        Object.fromEntries(dayStopBadgeEntries)

      const definition = buildCircuitoPdfDefinition(circuito, viaje, {
        logoDataUrl,
        heroDataUrl,
        dayMaps,
        dayGalleries,
        dayBadges,
        stopBadges,
        dayStopBadges,
      })
      definicionRef.current = definition

      const pdfMake = await loadPdfMake()
      const blob = await pdfMake.createPdf(definition).getBlob()
      reemplazarPdfUrl(URL.createObjectURL(blob))
      setEstado('ready')
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'No pudimos generar el PDF',
      )
      setEstado('error')
    }
  }, [circuito, viaje, reemplazarPdfUrl, queryClient])

  useEffect(() => {
    if (abierto) {
      void generar()
    }
  }, [abierto, generar])

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
      }
    }
  }, [])

  const handleDescargar = async () => {
    const definition = definicionRef.current
    if (!definition) return
    setDescargando(true)
    try {
      const pdfMake = await loadPdfMake()
      const nombre = `circuito-${slugify(viaje?.nombre ?? circuito.title)}.pdf`
      await pdfMake.createPdf(definition).download(nombre)
    } catch (downloadError) {
      toast.error(
        downloadError instanceof Error
          ? downloadError.message
          : 'No pudimos descargar el PDF',
      )
    } finally {
      setDescargando(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={abierto}
      onOpenChange={(open) => {
        if (!open && estado !== 'loading') onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(92dvh,920px)] sm:w-[min(980px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-heading text-xl font-bold text-sky-900 sm:text-2xl">
                Vista previa del PDF
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-slate-600">
                Revisá cómo queda el circuito antes de descargarlo.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Cerrar vista previa"
                disabled={estado === 'loading'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-4">
            {estado === 'loading' && (
              <div
                role="status"
                aria-live="polite"
                className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center"
              >
                <span className="material-symbols-outlined animate-spin text-[32px] text-[#00658d]">
                  progress_activity
                </span>
                <p className="text-sm font-semibold text-slate-700">Generando PDF...</p>
                <p className="max-w-sm text-xs text-slate-500">
                  Estamos cargando las fotos y los mapas del circuito. Puede tardar unos segundos.
                </p>
              </div>
            )}

            {estado === 'error' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <span className="material-symbols-outlined text-[32px] text-red-600">
                  error
                </span>
                <p className="text-sm font-semibold text-red-800">
                  {error ?? 'No pudimos generar el PDF'}
                </p>
                <Button type="button" onClick={() => void generar()}>
                  Reintentar
                </Button>
              </div>
            )}

            {estado === 'ready' && pdfUrl && (
              <iframe
                title="Vista previa del PDF"
                src={pdfUrl}
                className="h-full w-full rounded-xl border border-slate-200 bg-white"
              />
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={estado === 'loading'}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleDescargar}
              disabled={estado !== 'ready' || descargando}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              {descargando ? 'Descargando...' : 'Descargar PDF'}
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

