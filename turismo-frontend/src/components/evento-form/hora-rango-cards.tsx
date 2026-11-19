import { FieldError } from '@/components/ui/field'

interface HoraRangoCardsProps {
  horarioInicio: string
  horarioFin: string
  errorInicio?: { message?: string }
  errorFin?: { message?: string }
  onChangeInicio: (value: string) => void
  onChangeFin: (value: string) => void
}

/** Tarjetas de horario con el input nativo visible, para que el selector abra siempre. */
export function HoraRangoCards({
  horarioInicio,
  horarioFin,
  errorInicio,
  errorFin,
  onChangeInicio,
  onChangeFin,
}: HoraRangoCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <HoraCard
        id="horarioInicio"
        label="Horario de inicio"
        value={horarioInicio}
        error={errorInicio}
        onChange={onChangeInicio}
      />
      <HoraCard
        id="horarioFin"
        label="Horario de finalización"
        value={horarioFin}
        error={errorFin}
        onChange={onChangeFin}
      />
    </div>
  )
}

function HoraCard({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: { message?: string }
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center text-xs font-semibold text-slate-600"
      >
        <span>
          {label} <span className="text-destructive">*</span>
        </span>
      </label>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-sky-500">
          schedule
        </span>
        <input
          id={id}
          type="time"
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
