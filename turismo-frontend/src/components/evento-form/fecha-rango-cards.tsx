import { FieldError } from '@/components/ui/field'

interface FechaRangoCardsProps {
  fechaInicio: string
  fechaFin: string
  min?: string
  errorInicio?: { message?: string }
  errorFin?: { message?: string }
  onChangeInicio: (value: string) => void
  onChangeFin: (value: string) => void
}

/**
 * Tarjetas de fecha con el lenguaje visual de VZ-19, pero con el input nativo visible.
 * Así el selector abre siempre y el usuario también puede escribir la fecha.
 */
export function FechaRangoCards({
  fechaInicio,
  fechaFin,
  min,
  errorInicio,
  errorFin,
  onChangeInicio,
  onChangeFin,
}: FechaRangoCardsProps) {
  const dias =
    fechaInicio !== '' && fechaFin !== '' && fechaFin >= fechaInicio
      ? Math.round(
          (new Date(`${fechaFin}T12:00:00`).getTime() -
            new Date(`${fechaInicio}T12:00:00`).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FechaCard
          id="fechaInicio"
          label="Fecha de inicio"
          hint="Desde"
          icon="event_available"
          value={fechaInicio}
          min={min}
          error={errorInicio}
          onChange={onChangeInicio}
        />
        <FechaCard
          id="fechaFin"
          label="Fecha de finalización"
          hint="Hasta"
          icon="event_busy"
          value={fechaFin}
          min={fechaInicio !== '' && (!min || fechaInicio >= min) ? fechaInicio : min}
          error={errorFin}
          onChange={onChangeFin}
        />
      </div>

      {dias > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <span className="material-symbols-outlined text-base">date_range</span>
          {dias === 1
            ? 'La propuesta dura un día.'
            : `La propuesta ocupa ${dias} días; el horario se repite en cada uno.`}
        </div>
      ) : null}
    </div>
  )
}

function FechaCard({
  id,
  label,
  hint,
  icon,
  value,
  min,
  error,
  onChange,
}: {
  id: string
  label: string
  hint: string
  icon: string
  value: string
  min?: string
  error?: { message?: string }
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600"
      >
        <span>
          {label} <span className="text-destructive">*</span>
        </span>
        <span className="text-[11px] font-bold text-sky-600">{hint}</span>
      </label>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-sky-500">
          {icon}
        </span>
        <input
          id={id}
          type="date"
          min={min}
          value={value}
          required
          aria-label={label}
          aria-required="true"
          aria-invalid={error !== undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full rounded-xl border bg-slate-50 pl-12 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-sky-500 focus:bg-white ${
            error ? 'border-destructive' : 'border-slate-200'
          }`}
        />
      </div>
      {error?.message ? <FieldError>{error.message}</FieldError> : null}
    </div>
  )
}
