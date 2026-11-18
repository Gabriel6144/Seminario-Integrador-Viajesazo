import { usePublicadorInscriptos } from '@/api/publicador-inscriptos'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'

/**
 * Vista del publicador: cantidad de usuarios con cada propuesta en su circuito seleccionado.
 */
export function PublicadorInscriptosPage() {
  const query = usePublicadorInscriptos()

  if (query.isPending) return <GridSkeleton />
  if (query.isError) return <ErrorState error={query.error} />

  const items = query.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
          Inscriptos por propuesta
        </h2>
        <p className="text-sm text-[#3f484e]">
          Usuarios distintos que tienen cada evento o actividad en el circuito seleccionado de un
          viaje.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No tenés propuestas publicadas"
          description="Cuando publiques eventos o actividades, acá vas a ver cuántos turistas las incluyen en su circuito."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e0e3e5]/80 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-[#3f484e]">
              <tr>
                <th className="px-4 py-3 font-semibold">Propuesta</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold">Inscriptos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.propuestaId} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#191c1e]">{item.nombre}</td>
                  <td className="px-4 py-3 text-[#3f484e]">{item.tipo}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#00658d]">
                    {item.inscriptos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
