import type {
  Content,
  ContentSection,
  TableLayout,
  TDocumentDefinitions,
} from 'pdfmake/interfaces'

import type { CircuitoRecomendado } from '@/components/planificador/types'
import type { ViajeResponse } from '@/types/api'
import {
  buildDayData,
  DAY_MAP,
  formatKilometers,
  routeTitle,
  type DayData,
} from '@/lib/circuito-pdf-day'
import { DAY_GALLERY } from '@/lib/circuito-pdf-day-gallery'

const INTEREST_LABELS: Record<string, string> = {
  NATURALEZA: 'Naturaleza',
  GASTRONOMIA: 'Gastronomía',
  CULTURA: 'Cultura',
  HISTORIA: 'Historia',
  AVENTURA: 'Aventura',
  VIDA_NOCTURNA: 'Vida nocturna',
  MUSICA: 'Música',
  COMPRAS: 'Compras',
  FAMILIAR_Y_RELAX: 'Familiar y relax',
}

export interface CircuitoPdfAssets {
  logoDataUrl: string | null
  /** Hero izquierdo del resumen, ya compuesto con foto, degradado y textos. */
  heroDataUrl: string | null
  /** Mapa de cada día con overlay (ruta, pines, etiquetas), como PNG data URL. */
  dayMaps: Record<number, string | null>
  /** Galería editorial de paradas de cada día, como JPEG data URL. */
  dayGalleries: Record<number, string | null>
  /** Círculo con el número del día, por `day.number`. */
  dayBadges: Record<number, string | null>
  /** Círculo coral con el número global de la parada, por número. */
  stopBadges: Record<string, string | null>
  /** Círculo outline con el número local de la parada, por `day.number:stop.number`. */
  dayStopBadges: Record<string, string | null>
}

const BODY_FONT = 'Inter'
const HEADING_FONT = 'Montserrat'
const PAGE_WIDTH = 531
const DAY_MARGIN = 32
const DAY_GAP = 16
const DAY_HEADER_TOP = 152
const PAGE_HEIGHT = 842
const DAY_BOTTOM_MARGIN = 40
const DAY_GALLERY_TOP = PAGE_HEIGHT - DAY_BOTTOM_MARGIN - DAY_GALLERY.height

const STITCH = {
  cordobaBlue: '#0083ca',
  deepBlue: '#004e7c',
  titleBlue: '#007bb8',
  coral: '#e05d52',
  coralDark: '#c94b41',
  coralBadge: '#e45750',
  paper: '#FCFAF6',
  charcoal: '#1C2421',
  slate: '#4A5551',
  muted: '#7A8883',
  sky100: '#e0f2fe',
  sky200: '#bae6fd',
  white: '#FCFAF6',
  pageWhite: '#ffffff',
} as const

const DAY_BADGE_COLORS = ['#0083ca', '#009de0', '#00639e', '#38b6ff', '#0072b2']

const SUMMARY_WIDTH = 842
const SUMMARY_HEIGHT = 595
const HERO_WIDTH = 404
const RIGHT_WIDTH = SUMMARY_WIDTH - HERO_WIDTH
const RIGHT_PADDING = 18
const SUMMARY_FOOTER_HEIGHT = 42

/** Medidas del hero compuesto que arma el diálogo antes de llamar al builder. */
export const SUMMARY_HERO = { width: HERO_WIDTH, height: SUMMARY_HEIGHT } as const

const COLORS = {
  primary: '#00658d',
  accent: '#d7a73b',
  ink: '#191c1e',
  muted: '#3f484e',
  soft: '#eaf6fc',
  border: '#e0e3e5',
  white: '#ffffff',
} as const

export interface SummaryStopData {
  globalNumber: number
  number: number
  title: string
  hours: string
  category: string
}

export interface SummaryDayData {
  number: number
  label: string
  title: string
  location: string
  stops: SummaryStopData[]
}

export interface SummaryData {
  title: string
  ribbon: string
  heroBadge: string
  heroStatLabel: string
  heroStatValue: string
  heroTitle: string
  heroMeta: string
  days: SummaryDayData[]
}

function totalKilometers(circuito: CircuitoRecomendado): number {
  return circuito.days.reduce((total, day) => {
    const stops = circuito.stopsByDay[day.number] ?? []
    return total + stops.reduce((dayTotal, stop) => dayTotal + stop.trasladoKm, 0)
  }, 0)
}

function totalStops(circuito: CircuitoRecomendado): number {
  return circuito.days.reduce(
    (total, day) => total + (circuito.stopsByDay[day.number]?.length ?? 0),
    0,
  )
}

/**
 * Datos del resumen, separados de pdfmake para poder testearlos y para que el composer del
 * hero use exactamente los mismos textos que la columna derecha.
 */
export function buildSummaryData(
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
): SummaryData {
  const days = circuito.days.length
  const stops = totalStops(circuito)
  const km = totalKilometers(circuito)
  const zone = viaje?.ubicacion?.nombre ?? viaje?.ubicacion?.ciudad ?? 'Córdoba'
  const interests = (viaje?.interesesCategoria ?? [])
    .map((interes) => INTEREST_LABELS[interes] ?? interes)
    .filter(Boolean)
  const ribbon = `${days} ${days === 1 ? 'DÍA' : 'DÍAS'} DE ${
    interests.length > 0 ? interests.slice(0, 3).join(' & ') : 'AVENTURA'
  }`

  let globalNumber = 0
  const summaryDays = circuito.days.map((day) => {
    const dayStops = circuito.stopsByDay[day.number] ?? []
    return {
      number: day.number,
      label: `DÍA ${day.number}`,
      title: routeTitle(dayStops, day.label).toUpperCase(),
      location: dayStops[0]?.location ?? day.summary,
      stops: dayStops.map((stop) => {
        globalNumber += 1
        return {
          globalNumber,
          number: stop.number,
          title: stop.title,
          hours: stop.hours,
          category: stop.category,
        }
      }),
    }
  })

  return {
    title: 'Córdoba',
    ribbon: ribbon.toUpperCase(),
    heroBadge: `${zone.toUpperCase()} · CIRCUITO ${circuito.title.toUpperCase()}`,
    heroStatLabel: 'DÍAS',
    heroStatValue: String(days),
    heroTitle: viaje?.nombre ?? circuito.title,
    heroMeta: `${days} días · ${stops} paradas · ${formatKilometers(km)}`,
    days: summaryDays,
  }
}

function summaryRibbon(text: string, compact: boolean): Content {
  return {
    table: {
      widths: [12, '*', 12],
      body: [
        [
          {
            canvas: [
              {
                type: 'polyline',
                points: [
                  { x: 12, y: 0 },
                  { x: 0, y: 9 },
                  { x: 12, y: 18 },
                ],
                closePath: true,
                color: STITCH.coralDark,
              },
            ],
          },
          {
            text,
            fillColor: STITCH.coral,
            color: STITCH.white,
            font: HEADING_FONT,
            bold: true,
            fontSize: compact ? 6.2 : 7.5,
            alignment: 'center',
            characterSpacing: 0.8,
            margin: compact ? [5, 3, 5, 3] : [6, 4, 6, 4],
          },
          {
            canvas: [
              {
                type: 'polyline',
                points: [
                  { x: 0, y: 0 },
                  { x: 12, y: 9 },
                  { x: 0, y: 18 },
                ],
                closePath: true,
                color: STITCH.coralDark,
              },
            ],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [12, 0, 12, 0],
  }
}

function summaryHeader(summary: SummaryData, compact: boolean): Content {
  return {
    stack: [
      {
        text: summary.title,
        font: 'Caveat',
        bold: true,
        fontSize: compact ? 30 : 40,
        color: STITCH.titleBlue,
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },
      {
        text: 'ITINERARIO',
        font: 'MontserratBlack',
        fontSize: compact ? 18 : 23,
        color: STITCH.deepBlue,
        alignment: 'center',
        characterSpacing: 1.2,
        margin: [0, -6, 0, 6],
      },
      summaryRibbon(summary.ribbon, compact),
      { text: ' ', fontSize: 2, margin: compact ? [0, 1, 0, 0] : [0, 2, 0, 0] },
    ],
  }
}

function timelineBadge(day: SummaryDayData, assets: CircuitoPdfAssets): Content {
  const badge = assets.dayBadges[day.number]
  if (badge) {
    return { image: badge, width: 28, height: 28, margin: [1, 0, 0, 0] }
  }
  return {
    table: {
      widths: [28],
      heights: [28],
      body: [
        [
          {
            text: String(day.number),
            color: STITCH.white,
            fillColor: STITCH.cordobaBlue,
            alignment: 'center',
            fontSize: 9,
            bold: true,
            margin: [0, 8, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
  }
}

function stopLine(stop: SummaryStopData, assets: CircuitoPdfAssets, compact: boolean): Content {
  const badge = assets.stopBadges[String(stop.globalNumber)]
  const marker: Content = badge
    ? { image: badge, width: compact ? 7 : 10, height: compact ? 7 : 10, margin: [2, 0, 0, 0] }
    : {
        text: String(stop.globalNumber),
        color: STITCH.coralBadge,
        bold: true,
        fontSize: 6,
        margin: [2, 1, 0, 0],
      }

  return {
    columns: [
      { width: compact ? 10 : 14, stack: [marker] },
      {
        width: '*',
        text: stop.title,
        fontSize: compact ? 5.6 : 6.8,
        color: '#374151',
        margin: [2, 0, 0, 0],
      },
      {
        width: 'auto',
        text: stop.hours,
        fontSize: compact ? 4.6 : 5.8,
        color: '#64748b',
        margin: [4, 0, 0, 0],
      },
    ],
    columnGap: 1,
  }
}

function compactStopsTable(
  stops: SummaryStopData[],
  assets: CircuitoPdfAssets,
): Content {
  const half = Math.ceil(stops.length / 2)
  const left = stops.slice(0, half)
  const right = stops.slice(half)
  return {
    table: {
      widths: ['*', '*'],
      body: [
        [
          {
            stack: left.map((stop) => stopLine(stop, assets, true)),
            margin: [0, 0, 6, 0],
          },
          {
            stack: right.map((stop) => stopLine(stop, assets, true)),
            margin: [6, 0, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 0],
  }
}

function daySeparator(compact: boolean): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: RIGHT_WIDTH - RIGHT_PADDING * 2 - 30,
        y2: 0,
        lineWidth: 0.5,
        lineColor: STITCH.sky100,
      },
    ],
    margin: compact ? [0, 0, 0, 1] : [0, 2, 0, 3],
  }
}

function timelineDay(day: SummaryDayData, assets: CircuitoPdfAssets, isLast: boolean, compact: boolean): Content[] {
  const content: Content[] = [
    {
      text: day.label,
      fontSize: compact ? 5 : 6,
      bold: true,
      color: '#94a3b8',
      characterSpacing: 0.8,
    },
    {
      text: day.title,
      font: HEADING_FONT,
      bold: true,
      fontSize: compact ? 7 : 8.5,
      color: STITCH.deepBlue,
      margin: [0, 0, 0, 0],
    },
    {
      text: `• ${day.location}`,
      fontSize: compact ? 5.5 : 6.5,
      color: STITCH.titleBlue,
      margin: [0, 0, 0, 1],
    },
  ]
  if (compact && day.stops.length > 3) {
    content.push(compactStopsTable(day.stops, assets))
  } else {
    content.push(...day.stops.map((stop) => stopLine(stop, assets, compact)))
  }
  if (!isLast) content.push(daySeparator(compact))
  return content
}

function summaryTimeline(summary: SummaryData, assets: CircuitoPdfAssets, compact: boolean): Content {
  return {
    table: {
      widths: [30, '*'],
      body: summary.days.map((day, index) => [
        { stack: [timelineBadge(day, assets)], margin: [0, 0, 0, 0] },
        {
          stack: timelineDay(day, assets, index === summary.days.length - 1, compact),
          margin: [2, 0, 0, 0],
        },
      ]),
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 0],
  }
}

function summaryFooter(): Content {
  return {
    columns: [
      {
        width: '*',
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: 'Desconectar. Explorar. Reconectar.',
                font: 'Caveat',
                bold: true,
                fontSize: 16,
                color: STITCH.white,
                fillColor: '#0092db',
                margin: [12, 4, 12, 4],
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
      {
        width: 70,
        margin: [8, 4, 0, 0],
        canvas: [
          {
            type: 'polyline',
            points: [
              { x: 4, y: 28 },
              { x: 20, y: 6 },
              { x: 36, y: 28 },
            ],
            lineWidth: 1.5,
            lineColor: '#0092db',
          },
          {
            type: 'polyline',
            points: [
              { x: 28, y: 28 },
              { x: 46, y: 12 },
              { x: 64, y: 28 },
            ],
            lineWidth: 1.5,
            lineColor: '#0092db',
          },
        ],
      },
    ],
    columnGap: 4,
  }
}

const posterLayout: TableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
}

function buildSummarySection(
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
  assets: CircuitoPdfAssets,
): ContentSection {
  const summary = buildSummaryData(circuito, viaje)
  const compact = totalStops(circuito) > 18 || circuito.days.length > 6
  const hero: Content = assets.heroDataUrl
    ? { image: assets.heroDataUrl, width: HERO_WIDTH, height: SUMMARY_HEIGHT }
    : {
        table: {
          widths: [HERO_WIDTH],
          heights: [SUMMARY_HEIGHT],
          body: [[{ text: '', fillColor: STITCH.charcoal }]],
        },
        layout: 'noBorders',
      }

  const rightColumn: Content = {
    table: {
      widths: [RIGHT_WIDTH],
      heights: [SUMMARY_HEIGHT - SUMMARY_FOOTER_HEIGHT - 10, SUMMARY_FOOTER_HEIGHT - 2],
      body: [
        [
          {
            fillColor: STITCH.pageWhite,
            margin: [RIGHT_PADDING, 16, RIGHT_PADDING, 0],
            stack: [
              {
                absolutePosition: { x: HERO_WIDTH + RIGHT_PADDING + 15, y: 140 },
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: SUMMARY_HEIGHT - SUMMARY_FOOTER_HEIGHT - 10 - 140,
                    lineWidth: 1.5,
                    lineColor: STITCH.sky200,
                  },
                ],
              },
              summaryHeader(summary, compact),
              summaryTimeline(summary, assets, compact),
            ],
          },
        ],
        [
          {
            fillColor: STITCH.pageWhite,
            margin: [RIGHT_PADDING, 0, RIGHT_PADDING, 4],
            stack: [summaryFooter()],
          },
        ],
      ],
    },
    layout: 'noBorders',
  }

  return {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    footer: null,
    section: {
      table: {
        widths: [HERO_WIDTH, RIGHT_WIDTH],
        heights: [SUMMARY_HEIGHT],
        body: [[hero, rightColumn]],
      },
      layout: posterLayout,
    },
  }
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function dayHeader(data: DayData, assets: CircuitoPdfAssets): Content {
  const titleSize = data.title.length > 32 ? 18 : data.title.length > 24 ? 22 : 26
  return {
    stack: [
      {
        columns: [
          {
            width: '*',
            columns: [
              assets.logoDataUrl
                ? { image: assets.logoDataUrl, width: 16, height: 16 }
                : {
                    canvas: [
                      { type: 'ellipse', x: 8, y: 8, r1: 7, r2: 7, color: STITCH.coral },
                    ],
                  },
              {
                text: 'VIAJESAZO',
                font: HEADING_FONT,
                bold: true,
                fontSize: 7,
                characterSpacing: 1.6,
                color: STITCH.slate,
                margin: [4, 4, 0, 0],
              },
            ],
          },
          {
            width: 'auto',
            text: `ITINERARIO · DÍA ${data.number}`,
            font: HEADING_FONT,
            bold: true,
            fontSize: 7,
            characterSpacing: 1.2,
            color: STITCH.muted,
            alignment: 'right',
            margin: [0, 4, 0, 0],
          },
        ],
      },
      {
        text: data.title.toUpperCase(),
        font: 'MontserratBlack',
        fontSize: titleSize,
        lineHeight: 0.95,
        color: STITCH.charcoal,
        margin: [0, 8, 0, 6],
      },
      {
        columns: [
          {
            width: '*',
            table: {
              widths: ['auto'],
              body: [
                [
                  {
                    text: data.badge,
                    font: HEADING_FONT,
                    bold: true,
                    fontSize: 6.8,
                    characterSpacing: 0.9,
                    color: STITCH.white,
                    fillColor: STITCH.coral,
                    margin: [8, 3, 8, 3],
                  },
                ],
              ],
            },
            layout: 'noBorders',
          },
          {
            width: 'auto',
            text: data.dateLabel.toUpperCase(),
            font: HEADING_FONT,
            bold: true,
            fontSize: 7.2,
            characterSpacing: 0.8,
            color: STITCH.muted,
            alignment: 'right',
          },
        ],
        columnGap: 10,
      },
      {
        columns: [
          {
            width: 10,
            canvas: [{ type: 'ellipse', x: 3, y: 4.5, r1: 2.4, r2: 2.4, color: STITCH.coral }],
          },
          {
            width: '*',
            text: data.location,
            fontSize: 7.6,
            color: STITCH.slate,
            margin: [0, 1, 0, 0],
          },
        ],
        margin: [0, 6, 0, 0],
      },
    ],
    margin: [0, 0, 0, 14],
  }
}

function dayMapBlock(data: DayData, assets: CircuitoPdfAssets): Content {
  const image = assets.dayMaps[data.number]
  if (image) {
    return { image, width: DAY_MAP.width, height: DAY_MAP.height }
  }
  return {
    table: {
      widths: [DAY_MAP.width],
      heights: [DAY_MAP.height],
      body: [
        [
          {
            fillColor: STITCH.sky100,
            stack: [
              {
                text: 'SIN UBICACIÓN',
                font: HEADING_FONT,
                bold: true,
                fontSize: 7,
                characterSpacing: 1.3,
                color: STITCH.deepBlue,
                alignment: 'center',
                margin: [0, 150, 0, 4],
              },
              {
                text: 'Las paradas de este día no tienen coordenadas.',
                fontSize: 7.2,
                color: STITCH.slate,
                alignment: 'center',
                margin: [24, 0, 24, 0],
              },
            ],
          },
        ],
      ],
    },
    layout: 'noBorders',
  }
}

function dayGallery(data: DayData, assets: CircuitoPdfAssets): Content {
  const image = assets.dayGalleries[data.number]
  if (image) {
    return {
      absolutePosition: { x: DAY_MARGIN, y: DAY_GALLERY_TOP },
      image,
      width: DAY_GALLERY.width,
      height: DAY_GALLERY.height,
    }
  }
  return {
    absolutePosition: { x: DAY_MARGIN, y: DAY_GALLERY_TOP },
    table: {
      widths: [DAY_GALLERY.width],
      heights: [DAY_GALLERY.height],
      body: [
        [
          {
            text: 'Galería no disponible',
            fontSize: 7.2,
            color: STITCH.slate,
            fillColor: STITCH.sky100,
            alignment: 'center',
            margin: [0, 100, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
  }
}

function timePill(time: string, compact: boolean): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: time,
            font: HEADING_FONT,
            bold: true,
            fontSize: compact ? 6.6 : 7.4,
            color: STITCH.deepBlue,
            alignment: 'center',
            fillColor: STITCH.white,
            margin: [0, compact ? 2 : 3, 0, compact ? 2 : 3],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      hLineColor: () => STITCH.sky200,
      vLineColor: () => STITCH.sky200,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  }
}

function dayTimelineBadge(
  stop: DayData['stops'][number],
  data: DayData,
  assets: CircuitoPdfAssets,
  compact: boolean,
): Content {
  const size = compact ? 18 : 22
  const image = assets.dayStopBadges[`${data.number}:${stop.number}`]
  if (image) {
    return { image, width: size, height: size }
  }
  return {
    table: {
      widths: [size],
      heights: [size],
      body: [
        [
          {
            text: String(stop.number),
            font: HEADING_FONT,
            bold: true,
            fontSize: compact ? 7 : 8.5,
            color: STITCH.deepBlue,
            alignment: 'center',
            margin: [0, compact ? 5 : 6, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
  }
}

function timelineRow(
  stop: DayData['stops'][number],
  data: DayData,
  assets: CircuitoPdfAssets,
  compact: boolean,
): Content {
  const content: Content[] = [
    {
      text: stop.title,
      font: HEADING_FONT,
      bold: true,
      fontSize: compact ? 8 : 9.3,
      lineHeight: 1.05,
      color: STITCH.charcoal,
    },
    {
      text: stop.category + (stop.duration ? ` · ${stop.duration}` : ''),
      fontSize: compact ? 6.2 : 7,
      color: STITCH.muted,
      margin: [0, 1, 0, 0],
    },
  ]
  if (!compact) {
    content.push({
      text: truncate(stop.description, 150),
      fontSize: 7,
      lineHeight: 1.15,
      color: STITCH.slate,
      margin: [0, 3, 0, 0],
    })
  }

  return {
    unbreakable: true,
    table: {
      widths: [compact ? 38 : 44, compact ? 22 : 26, '*'],
      body: [
        [
          { stack: [timePill(stop.time, compact)], margin: [0, compact ? 1 : 2, 0, 0] },
          {
            stack: [dayTimelineBadge(stop, data, assets, compact)],
            alignment: 'center',
            margin: [0, compact ? 0 : 1, 0, 0],
          },
          { stack: content, margin: [6, 0, 0, 0] },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, compact ? 8 : 16],
  }
}

function timelineConnector(rows: number, compact: boolean): Content {
  const height = rows * (compact ? 34 : 66)
  const x = DAY_MARGIN + DAY_MAP.width + DAY_GAP + (compact ? 38 : 44) + (compact ? 11 : 13)
  const points: { x: number; y: number }[] = []
  for (let y = 0; y <= height; y += 8) {
    points.push({ x: 5 + Math.sin(y / 18) * 3, y })
  }
  return {
    absolutePosition: { x, y: DAY_HEADER_TOP },
    canvas: [
      {
        type: 'polyline',
        points,
        lineWidth: 1.1,
        lineColor: STITCH.sky200,
        dash: { length: 3, space: 3 },
        lineCap: 'round',
      },
      {
        type: 'ellipse',
        x: 5,
        y: height + 4,
        r1: 3.4,
        r2: 3.4,
        color: STITCH.coral,
      },
    ],
  }
}

function emptyDay(): Content {
  return {
    table: {
      widths: ['*'],
      heights: [220],
      body: [
        [
          {
            fillColor: STITCH.white,
            stack: [
              {
                text: 'DÍA LIBRE',
                font: 'MontserratBlack',
                fontSize: 18,
                characterSpacing: 1.4,
                color: STITCH.sky200,
                alignment: 'center',
                margin: [0, 88, 0, 6],
              },
              {
                text: 'No hay paradas programadas para este día.',
                fontSize: 8,
                color: STITCH.slate,
                alignment: 'center',
              },
            ],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => STITCH.sky200,
      vLineColor: () => STITCH.sky200,
    },
  }
}

function daySection(
  day: CircuitoRecomendado['days'][number],
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
  assets: CircuitoPdfAssets,
  isFirst: boolean,
): Content {
  const data = buildDayData(day, circuito, viaje)
  const compact = data.stops.length > 5
  const contenido: Content[] = [dayHeader(data, assets)]

  if (data.stops.length === 0) {
    contenido.push(emptyDay())
  } else {
    contenido.push(timelineConnector(data.stops.length, compact))
    contenido.push({
      columns: [
        {
          width: DAY_MAP.width,
          stack: [dayMapBlock(data, assets)],
        },
        {
          width: '*',
          margin: [DAY_GAP, 0, 0, 0],
          stack: data.stops.map((stop) => timelineRow(stop, data, assets, compact)),
        },
      ],
      columnGap: 0,
    })
    contenido.push(dayGallery(data, assets))
  }

  return {
    ...(isFirst ? {} : { pageBreak: 'before' as const }),
    stack: contenido,
  }
}

function pageFooter(currentPage: number, pageCount: number): Content {
  return {
    margin: [DAY_MARGIN, 6, DAY_MARGIN, 0],
    stack: [
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: PAGE_WIDTH,
            y2: 0,
            lineWidth: 2,
            lineColor: COLORS.accent,
          },
        ],
      },
      {
        columns: [
          { text: 'Viajesazo · Turismo Córdoba', style: 'footer', width: '*' },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'footer',
            alignment: 'right',
            width: 'auto',
          },
        ],
        margin: [0, 4, 0, 0],
      },
    ],
  }
}

function buildDaysSection(
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
  assets: CircuitoPdfAssets,
): ContentSection {
  return {
    pageOrientation: 'portrait',
    pageSize: 'A4',
    pageMargins: [DAY_MARGIN, 32, DAY_MARGIN, 40],
    section: {
      stack: circuito.days.map((day, index) =>
        daySection(day, circuito, viaje, assets, index === 0),
      ),
    },
  }
}

/**
 * Definición pura del PDF del circuito. No importa pdfmake: recibe los assets ya resueltos.
 * El resumen va en A4 horizontal; las páginas por día siguen en A4 vertical.
 */
export function buildCircuitoPdfDefinition(
  circuito: CircuitoRecomendado,
  viaje: ViajeResponse | null,
  assets: CircuitoPdfAssets,
): TDocumentDefinitions {
  const summary = buildSummaryData(circuito, viaje)

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [DAY_MARGIN, 32, DAY_MARGIN, 40],
    info: {
      title: `Circuito ${summary.heroTitle}`,
      author: 'Viajesazo',
      subject: 'Circuito de viaje',
      creator: 'Viajesazo',
    },
    defaultStyle: {
      font: BODY_FONT,
      fontSize: 9.5,
      color: COLORS.ink,
      lineHeight: 1.2,
    },
    styles: {
      brand: {
        font: HEADING_FONT,
        fontSize: 12,
        bold: true,
        color: COLORS.primary,
        characterSpacing: 0.8,
      },
      brandSub: { fontSize: 7.5, color: COLORS.muted },
      title: {
        font: HEADING_FONT,
        fontSize: 24,
        bold: true,
        color: COLORS.ink,
        margin: [0, 2, 0, 2],
      },
      subtitle: { fontSize: 9.5, color: COLORS.muted, margin: [0, 0, 0, 6] },
      section: {
        font: HEADING_FONT,
        fontSize: 13,
        bold: true,
        color: COLORS.primary,
        margin: [0, 8, 0, 4],
      },
      dayTitle: { font: HEADING_FONT, fontSize: 18, bold: true, color: COLORS.ink },
      dayMeta: { fontSize: 9, color: COLORS.muted, margin: [0, 2, 0, 8] },
      stopTitle: { font: HEADING_FONT, fontSize: 10.5, bold: true, color: COLORS.ink },
      stopTime: { font: HEADING_FONT, fontSize: 10, bold: true, color: COLORS.primary },
      small: { fontSize: 8, color: COLORS.muted },
      label: { fontSize: 7, bold: true, color: COLORS.muted, characterSpacing: 0.5 },
      value: { font: HEADING_FONT, fontSize: 12, bold: true, color: COLORS.ink },
      tableHeader: {
        fontSize: 7.5,
        bold: true,
        color: COLORS.muted,
        characterSpacing: 0.4,
      },
      tableCell: { fontSize: 9, color: COLORS.ink },
      footer: { fontSize: 7.5, color: COLORS.muted },
    },
    footer: pageFooter,
    background: (currentPage, pageSize) => ({
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: pageSize.width,
          h: pageSize.height,
          color: currentPage === 1 ? STITCH.pageWhite : STITCH.paper,
        },
      ],
    }),
    content: [
      buildSummarySection(circuito, viaje, assets),
      buildDaysSection(circuito, viaje, assets),
    ],
  }
}

export { DAY_BADGE_COLORS }


