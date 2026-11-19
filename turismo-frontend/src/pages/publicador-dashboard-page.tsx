import { Link } from 'react-router-dom'

import { usePublicadorDashboard } from '@/api/publicador-portal'
import { useAuth } from '@/components/auth-provider'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-[#e0e3e5]/80 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[#3f484e]">{label}</p>
      <p className="mt-2 font-heading text-3xl font-bold text-[#191c1e]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#5f6b73]">{hint}</p> : null}
    </div>
  )
}

function tipoLabel(tipo: string): string {
  if (tipo === 'ACTIVIDAD') return 'Actividad'
  if (tipo === 'EVENTO') return 'Evento'
  return tipo
}

/**
 * Dashboard del publicador: métricas solo del publicador vinculado a la sesión
 * (`GET /api/publicador/dashboard` resuelve el publicador por JWT).
 *
 * Los inscriptos se incrementan cuando un turista confirma un circuito que incluye
 * propuestas de este publicador (conteo DISTINCT por propuesta).
 */
export function PublicadorDashboardPage() {
  const { user } = useAuth()
  const query = usePublicadorDashboard()

  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />
  if (!query.data) return null

  const data = query.data
  const publicadorNombre = user?.nombre
  const propuestasConInscriptos = data.inscriptosPorPropuesta
  const totalInscriptos = propuestasConInscriptos.reduce((sum, item) => sum + item.inscriptos, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Panel del publicador
          </h2>
          <p className="text-sm text-[#3f484e]">
            {publicadorNombre
              ? `Resumen exclusivo de ${publicadorNombre}: tus eventos y actividades publicados y próximos en agenda.`
              : 'Resumen exclusivo de tu cuenta publicadora: eventos y actividades publicados y próximos en agenda.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/publicador/agenda">Ver mi agenda</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full bg-[#00658d] text-white hover:bg-[#65b7e8]">
            <Link to="/propuestas/nueva">Nueva propuesta</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total propuestas" value={data.totalPropuestas} />
        <MetricCard label="Eventos" value={data.totalEventos} />
        <MetricCard label="Actividades" value={data.totalActividades} />
        <MetricCard
          label="Próximas (7 días)"
          value={data.proximas7d}
          hint="Con fechas que se solapan con la próxima semana"
        />
        <MetricCard
          label="Inscriptos totales"
          value={totalInscriptos}
          hint="Suma de turistas por propuesta (circuitos confirmados)"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-bold text-[#191c1e]">Inscriptos por propuesta</h3>
          <p className="text-sm text-[#3f484e]">
            Cantidad de turistas que incluyen cada evento o actividad en el circuito confirmado de un
            viaje. Un mismo turista no se cuenta dos veces en la misma propuesta.
          </p>
        </div>
        {propuestasConInscriptos.length === 0 ? (
          <EmptyState
            title="No tenés propuestas publicadas"
            description="Cuando publiques eventos o actividades, acá vas a ver cuántos turistas los incluyen en su circuito confirmado."
          />
        ) : (
          <div className="max-h-[min(50vh,420px)] overflow-hidden rounded-2xl border border-[#e0e3e5]/80 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
            <div className="max-h-[min(50vh,420px)] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/95 text-xs uppercase tracking-wide text-[#3f484e]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Propuesta</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-right font-semibold">Inscriptos</th>
                  </tr>
                </thead>
                <tbody>
                  {propuestasConInscriptos.map((item) => (
                    <tr key={item.propuestaId} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-[#191c1e]">{item.nombre}</td>
                      <td className="px-4 py-3 text-[#3f484e]">{tipoLabel(item.tipo)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#00658d]">
                        {item.inscriptos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
