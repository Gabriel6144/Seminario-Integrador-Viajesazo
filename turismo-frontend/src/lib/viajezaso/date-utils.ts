import type { AgendaEvent, Language } from '@/lib/viajezaso/data'

export const dateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const localDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const validDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(localDate(value)) === value

export const todayBuenosAires = (): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())

export type GuideDateState =
  | { valid: false; key: string; days: 0 }
  | { valid: true; days: number }

export function guideDateState(
  arrival: string,
  departure: string,
  minDate = todayBuenosAires(),
): GuideDateState {
  if (!validDate(arrival) || !validDate(departure))
    return { valid: false, key: 'selectGuideDates', days: 0 }
  if (arrival < minDate) return { valid: false, key: 'guidePastDate', days: 0 }
  if (departure < arrival)
    return { valid: false, key: 'guideDepartureBeforeArrival', days: 0 }
  const a = arrival.split('-').map(Number)
  const b = departure.split('-').map(Number)
  return {
    valid: true,
    days: Math.max(
      1,
      Math.round(
        (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) /
          86400000,
      ),
    ),
  }
}

export function formatDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(`${value}T12:00:00Z`))
}

export function mondayOf(date: Date): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return copy
}

export const demoRegistrations: Readonly<Record<string, number>> =
  Object.freeze({
    oktoberfest: 5,
    cosquin: 3,
    reartes: 2,
    degustacion: 1,
    masa: 0,
    senderismo: 4,
  })

export interface ReschedulePlan {
  id: string
  from: string
  to: string
  count: number
}

export function makeReschedulePlan(
  events: AgendaEvent[],
  id: string,
  to: string,
): ReschedulePlan | null {
  const event = events.find((item) => item.id === id)
  return !event || !validDate(to) || to === event.date
    ? null
    : { id, from: event.date, to, count: demoRegistrations[id] || 0 }
}

export interface RescheduleNotification extends ReschedulePlan {
  name: Record<Language, string>
  kind: AgendaEvent['kind']
  at: string
}

export interface RescheduleResult {
  events: AgendaEvent[]
  notification: RescheduleNotification | null
}

export function commitReschedule(
  events: AgendaEvent[],
  plan: ReschedulePlan | null,
  now = new Date(),
): RescheduleResult | null {
  if (!plan || !validDate(plan.to) || plan.to === plan.from) return null
  const record = events.find((event) => event.id === plan.id)
  if (!record || record.date !== plan.from) return null
  const count = demoRegistrations[plan.id] || 0
  return {
    events: events.map((event) =>
      event.id === plan.id ? { ...event, date: plan.to } : event,
    ),
    notification:
      count > 0
        ? {
            ...plan,
            count,
            name: record.name,
            kind: record.kind,
            at: now.toISOString(),
          }
        : null,
  }
}
