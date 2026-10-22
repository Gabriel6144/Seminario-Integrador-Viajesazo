import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useBorradores, useDescartarBorrador } from '@/api/viajes'
import { ViajeBorradorCard } from '@/components/viaje-borrador-card'
import { PaginationBar } from '@/components/pagination-bar'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/query-state'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { usePageParam } from '@/lib/use-page-param'

const USUARIO_DEMO = 'turista_demo'

export function BorradoresPage() {
  const [page, setPage] = usePageParam()
  const query = useBorradores(USUARIO_DEMO, page)
  const descartar = useDescartarBorrador()
  const [borradorADescartarId, setBorradorADescartarId] = useState<number | null>(null)

  const handleConfirmarDescarte = () => {
    if (borradorADescartarId === null) return
    descartar.mutate(borradorADescartarId, {
      onSettled: () => setBorradorADescartarId(null),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#191c1e]">
            Mis Viajes
          </h2>
          <p className="text-sm text-[#3f484e]">
            Circuitos guardados como borrador para retomarlos después.
          </p>
        </div>

        <Button asChild size="sm" className="h-12 rounded-xl bg-[#00658d] px-6 text-white shadow-md hover:bg-[#65b7e8]">
          <Link to="/planificar">+ Planificar un viaje nuevo</Link>
        </Button>
      </div>

      {query.isPending ? <GridSkeleton /> : null}
      {query.isError ? <ErrorState error={query.error} /> : null}
      {query.data && query.data.content.length === 0 ? (
        <EmptyState
          title="Todavía no hay borradores"
          description="Guardá un borrador desde el planificador para verlo acá."
        />
      ) : null}

      {query.data && query.data.content.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={query.isPlaceholderData}>
          {query.data.content.map((borrador) => (
            <ViajeBorradorCard
              key={borrador.id}
              borrador={borrador}
              onDescartar={(id) => setBorradorADescartarId(id)}
              descartando={borradorADescartarId === borrador.id && descartar.isPending}
            />
          ))}
        </div>
      ) : null}

      {query.data === undefined ? null : <PaginationBar page={query.data} onPageChange={setPage} />}

      <AlertDialog
        open={borradorADescartarId !== null}
        onOpenChange={(open) => {
          if (!open && !descartar.isPending) {
            setBorradorADescartarId(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-[360px] gap-5 rounded-3xl bg-white p-6 shadow-2xl sm:max-w-[380px]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ffdad6]">
              <span className="material-symbols-outlined text-[28px] text-[#bb0413]">
                warning
              </span>
            </div>
            <div className="flex flex-col text-left">
              <AlertDialogTitle className="font-heading text-[22px] font-bold leading-tight text-[#191c1e]">
                ¿Descartar este borrador?
              </AlertDialogTitle>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#bb0413]">
                ACCIÓN IRREVERSIBLE
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-left text-[15px] leading-relaxed text-[#3f484e]">
            ¿Estás seguro de descartar este borrador? No podrás recuperar los pasos guardados ni las preferencias configuradas para este itinerario.
          </AlertDialogDescription>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setBorradorADescartarId(null)}
              disabled={descartar.isPending}
              className="flex h-14 items-center justify-center rounded-2xl border border-[#d8dadc] bg-white px-4 text-center text-sm font-semibold leading-tight text-[#191c1e] transition hover:bg-[#f2f4f6] disabled:opacity-50"
            >
              Mantener
              <br />
              borrador
            </button>
            <button
              type="button"
              onClick={handleConfirmarDescarte}
              disabled={descartar.isPending}
              className="flex h-14 items-center justify-center rounded-2xl bg-[#bb0413] px-4 text-center text-sm font-bold leading-tight text-white shadow-sm transition hover:bg-[#93000b] disabled:opacity-50"
            >
              {descartar.isPending ? (
                'Descartando...'
              ) : (
                <>
                  Sí,
                  <br />
                  descartar
                </>
              )}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
