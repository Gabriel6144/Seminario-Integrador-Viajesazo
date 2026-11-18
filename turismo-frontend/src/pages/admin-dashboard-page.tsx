import { useAdminDashboard } from '@/api/admin'
import { ErrorState, GridSkeleton } from '@/components/query-state'

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

/**
 * Dashboard exclusivo del administrador: métricas de usuarios, viajes y ranking de propuestas.
 */
export function AdminDashboardPage() {
  const query = useAdminDashboard()

  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />
  if (!query.data) return null

  const data = query.data
  const totalRoles = data.totalTuristas + data.totalPublicadores
  const pctTuristas = totalRoles === 0 ? 0 : Math.round((data.totalTuristas / totalRoles) * 100)
  const pctPublicadores = totalRoles === 0 ? 0 : 100 - pctTuristas

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
          Dashboard de administración de la plataforma
        </h2>
        <p className="text-sm text-[#3f484e]">
          Métricas globales de usuarios activos, nuevos registros, viajes creados y popularidad de
          propuestas según inscriptos en circuitos seleccionados.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de usuarios registrados activos"
          value={data.totalUsuarios}
          hint="Cuentas activas (turistas y publicadores)"
        />
        <MetricCard
          label="Usuarios con actividad reciente (7 días)"
          value={data.usuariosActivos7d}
          hint={`${data.usuariosActivos30d} con actividad en los últimos 30 días`}
        />
        <MetricCard
          label="Nuevos registros de cuentas (7 días)"
          value={data.nuevosRegistros7d}
          hint={`${data.nuevosRegistros30d} altas en los últimos 30 días`}
        />
        <MetricCard
          label="Viajes creados por turistas (7 días)"
          value={data.viajesCreados7d}
          hint={`${data.viajesCreados30d} viajes creados en 30 días`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e0e3e5]/80 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <h3 className="font-heading text-base font-bold text-[#191c1e]">
            Proporción de cuentas: Publicadores frente a Turistas
          </h3>
          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="text-xs text-[#3f484e]">Turistas</p>
              <p className="font-heading text-2xl font-bold text-[#0277BD]">
                {data.totalTuristas}
              </p>
              <p className="text-xs text-[#5f6b73]">{pctTuristas}%</p>
            </div>
            <div>
              <p className="text-xs text-[#3f484e]">Publicadores</p>
              <p className="font-heading text-2xl font-bold text-[#B27B08]">
                {data.totalPublicadores}
              </p>
              <p className="text-xs text-[#5f6b73]">{pctPublicadores}%</p>
            </div>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-[#0277BD]" style={{ width: `${pctTuristas}%` }} />
            <div className="bg-[#B27B08]" style={{ width: `${pctPublicadores}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0e3e5]/80 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <h3 className="font-heading text-base font-bold text-[#191c1e]">
            Ranking de eventos y actividades más populares por cantidad de inscriptos
          </h3>
          {data.propuestasPopulares.length === 0 ? (
            <p className="mt-4 text-sm text-[#5f6b73]">
              Todavía no hay inscriptos derivados de circuitos seleccionados por turistas.
            </p>
          ) : (
            <ol className="mt-4 flex flex-col gap-2">
              {data.propuestasPopulares.map((item, index) => (
                <li
                  key={item.propuestaId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#191c1e]">
                      {index + 1}. {item.nombre}
                    </p>
                    <p className="text-xs text-[#5f6b73]">{item.tipo}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#00658d]">
                    {item.inscriptos}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
