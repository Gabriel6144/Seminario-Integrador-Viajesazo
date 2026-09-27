import { CalendarDaysIcon } from 'lucide-react'

import { formatWeekdayAndDate } from '@/lib/dates'
import type { LocalDate } from '@/types/api'

/** Encabezado de un grupo de la agenda, con el día legible. */
export function DayHeading({ date }: { date: LocalDate }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <CalendarDaysIcon aria-hidden />
      {formatWeekdayAndDate(date)}
    </h2>
  )
}
