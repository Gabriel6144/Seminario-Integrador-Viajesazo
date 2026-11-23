import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/api/queries'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/http'
import type {
  CircuitStrategy,
  CircuitoSeleccionadoResponse,
  GeneracionCircuitoResponse,
  OpcionesSustitucionResponse,
  ResumenDiaAlternativaResponse,
  SeleccionCircuitoRequest,
  SugerenciasDiaResponse,
} from '@/types/api'

interface GenerarCircuitoVariables {
  viajeId: number
  reemplazar?: boolean
}

/**
 * Circuito de un viaje. La primera generación responde 201. Si el circuito ya existe, el backend
 * responde 409 y solo regenera cuando se manda `reemplazar=true` de forma explícita.
 */
export function useGenerarCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: number | GenerarCircuitoVariables) => {
      const viajeId = typeof variables === 'number' ? variables : variables.viajeId
      const reemplazar = typeof variables === 'number' ? false : (variables.reemplazar ?? false)
      const query = reemplazar ? '?reemplazar=true' : ''
      return apiPost<GeneracionCircuitoResponse, undefined>(
        `/api/viajes/${viajeId}/circuito${query}`,
        undefined,
      )
    },
    onSuccess: (data, variables) => {
      const viajeId = typeof variables === 'number' ? variables : variables.viajeId
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuitosAll() })
    },
  })
}

export function fetchCircuito(
  viajeId: number,
  signal?: AbortSignal,
): Promise<GeneracionCircuitoResponse> {
  return apiGet<GeneracionCircuitoResponse>(`/api/viajes/${viajeId}/circuito`, signal)
}

export function useCircuito(viajeId: number | null) {
  return useQuery({
    queryKey: queryKeys.circuito(viajeId ?? 0),
    queryFn: ({ signal }) => fetchCircuito(viajeId ?? 0, signal),
    enabled: viajeId !== null,
  })
}

export function fetchCircuitoSeleccionado(
  viajeId: number,
  signal?: AbortSignal,
): Promise<CircuitoSeleccionadoResponse> {
  return apiGet<CircuitoSeleccionadoResponse>(
    `/api/viajes/${viajeId}/circuito/seleccionado`,
    signal,
  )
}

/** VZ-26: circuito elegido, ya agrupado por día por el backend. */
export function useCircuitoSeleccionado(viajeId: number | null) {
  return useQuery({
    queryKey: queryKeys.circuitoSeleccionado(viajeId ?? 0),
    queryFn: ({ signal }) => fetchCircuitoSeleccionado(viajeId ?? 0, signal),
    enabled: viajeId !== null,
  })
}

/**
 * VZ-29: elimina una parada del circuito seleccionado. El backend exige `confirmar=true` y
 * devuelve el circuito actualizado, que se escribe en la caché para que la página no parpadee.
 */
export function useEliminarParadaCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viajeId, itemId }: { viajeId: number; itemId: number }) =>
      apiDelete<CircuitoSeleccionadoResponse>(
        `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}?confirmar=true`,
      ),
    onSuccess: (data, { viajeId }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

export function fetchAlternativasReemplazo(
  viajeId: number,
  itemId: number,
  signal?: AbortSignal,
): Promise<OpcionesSustitucionResponse> {
  return apiGet<OpcionesSustitucionResponse>(
    `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}/alternativas`,
    signal,
  )
}

/**
 * VZ-28: opciones para sustituir una parada del circuito confirmado. Entra todo lo que el turista
 * puede hacer en el hueco libre del día (entre la parada anterior y la siguiente, con traslados),
 * ordenado por Me gusta, intereses, cercanía y popularidad.
 */
export function useAlternativasReemplazo(viajeId: number | null, itemId: number | null) {
  return useQuery({
    queryKey: queryKeys.alternativasReemplazo(viajeId ?? 0, itemId ?? 0),
    queryFn: ({ signal }) => fetchAlternativasReemplazo(viajeId ?? 0, itemId ?? 0, signal),
    enabled: viajeId !== null && itemId !== null,
  })
}

/**
 * VZ-28: reemplaza una parada del circuito seleccionado. El backend vuelve a validar la
 * propuesta y devuelve el circuito actualizado, que se escribe en la caché.
 */
export function useReemplazarParadaCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      itemId,
      propuestaId,
    }: {
      viajeId: number
      itemId: number
      propuestaId: number
    }) =>
      apiPut<CircuitoSeleccionadoResponse, { propuestaId: number }>(
        `/api/viajes/${viajeId}/circuito/seleccionado/items/${itemId}`,
        { propuestaId },
      ),
    onSuccess: (data, { viajeId, itemId }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.alternativasReemplazo(viajeId, itemId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

/*
 * Ajustes antes de confirmar: mientras el turista no eligió ninguna alternativa puede sustituir o
 * eliminar paradas de cualquiera de las recomendadas. El backend devuelve el circuito generado
 * completo (todas las alternativas), que se escribe en la caché del circuito.
 */

export function fetchReemplazosAlternativa(
  viajeId: number,
  estrategia: CircuitStrategy,
  itemId: number,
  signal?: AbortSignal,
): Promise<OpcionesSustitucionResponse> {
  return apiGet<OpcionesSustitucionResponse>(
    `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/items/${itemId}/alternativas`,
    signal,
  )
}

export function useReemplazosAlternativa(
  viajeId: number | null,
  estrategia: CircuitStrategy | null,
  itemId: number | null,
) {
  return useQuery({
    queryKey: queryKeys.reemplazosAlternativa(viajeId ?? 0, estrategia ?? '', itemId ?? 0),
    queryFn: ({ signal }) =>
      fetchReemplazosAlternativa(viajeId ?? 0, estrategia ?? 'CERCANIA', itemId ?? 0, signal),
    enabled: viajeId !== null && estrategia !== null && itemId !== null,
  })
}

export function useReemplazarParadaAlternativa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      estrategia,
      itemId,
      propuestaId,
    }: {
      viajeId: number
      estrategia: CircuitStrategy
      itemId: number
      propuestaId: number
    }) =>
      apiPut<GeneracionCircuitoResponse, { propuestaId: number }>(
        `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/items/${itemId}`,
        { propuestaId },
      ),
    onSuccess: (data, { viajeId, estrategia }) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      // Reemplazos, estado de los días y sugerencias de esa alternativa cambian con la parada.
      void queryClient.invalidateQueries({ queryKey: queryKeys.alternativa(viajeId, estrategia) })
    },
  })
}

export function useEliminarParadaAlternativa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      estrategia,
      itemId,
    }: {
      viajeId: number
      estrategia: CircuitStrategy
      itemId: number
    }) =>
      apiDelete<GeneracionCircuitoResponse>(
        `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/items/${itemId}?confirmar=true`,
      ),
    onSuccess: (data, { viajeId, estrategia }) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      // Sacar una parada puede dejar el día incompleto: se vuelve a pedir el estado de los días.
      void queryClient.invalidateQueries({ queryKey: queryKeys.alternativa(viajeId, estrategia) })
    },
  })
}

/*
 * Completar días antes de confirmar. El estado de cada día se cuenta en vivo sobre las paradas de
 * la alternativa; las queries solo corren con el detalle abierto y sin alternativa elegida.
 */

export function fetchDiasAlternativa(
  viajeId: number,
  estrategia: CircuitStrategy,
  signal?: AbortSignal,
): Promise<ResumenDiaAlternativaResponse[]> {
  return apiGet<ResumenDiaAlternativaResponse[]>(
    `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/dias`,
    signal,
  )
}

export function useDiasAlternativa(viajeId: number | null, estrategia: CircuitStrategy | null) {
  return useQuery({
    queryKey: queryKeys.diasAlternativa(viajeId ?? 0, estrategia ?? ''),
    queryFn: ({ signal }) =>
      fetchDiasAlternativa(viajeId as number, estrategia as CircuitStrategy, signal),
    enabled: viajeId !== null && estrategia !== null,
  })
}

export function fetchSugerenciasDiaAlternativa(
  viajeId: number,
  estrategia: CircuitStrategy,
  fecha: string,
  signal?: AbortSignal,
): Promise<SugerenciasDiaResponse> {
  return apiGet<SugerenciasDiaResponse>(
    `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/dias/${fecha}/sugerencias`,
    signal,
  )
}

export function useSugerenciasDiaAlternativa(
  viajeId: number | null,
  estrategia: CircuitStrategy | null,
  fecha: string | null,
) {
  return useQuery({
    queryKey: queryKeys.sugerenciasDiaAlternativa(viajeId ?? 0, estrategia ?? '', fecha ?? ''),
    queryFn: ({ signal }) =>
      fetchSugerenciasDiaAlternativa(
        viajeId as number,
        estrategia as CircuitStrategy,
        fecha as string,
        signal,
      ),
    enabled: viajeId !== null && estrategia !== null && fecha !== null && fecha !== '',
  })
}

export function useAgregarParadaSugeridaAlternativa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      estrategia,
      fecha,
      propuestaId,
    }: {
      viajeId: number
      estrategia: CircuitStrategy
      fecha: string
      propuestaId: number
    }) =>
      apiPost<GeneracionCircuitoResponse, { propuestaId: number }>(
        `/api/viajes/${viajeId}/circuito/alternativas/${estrategia}/dias/${fecha}/items`,
        { propuestaId },
      ),
    onSuccess: (data, { viajeId, estrategia }) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.alternativa(viajeId, estrategia) })
    },
  })
}

export function fetchSugerenciasDia(
  viajeId: number,
  fecha: string,
  signal?: AbortSignal,
): Promise<SugerenciasDiaResponse> {
  return apiGet<SugerenciasDiaResponse>(
    `/api/viajes/${viajeId}/circuito/seleccionado/dias/${fecha}/sugerencias`,
    signal,
  )
}

/** Sugerencias para completar un día; la query solo corre con el diálogo abierto. */
export function useSugerenciasDia(viajeId: number | null, fecha: string | null) {
  return useQuery({
    queryKey: queryKeys.sugerenciasDia(viajeId ?? 0, fecha ?? ''),
    queryFn: ({ signal }) => fetchSugerenciasDia(viajeId ?? 0, fecha ?? '', signal),
    enabled: viajeId !== null && fecha !== null && fecha !== '',
  })
}

export function useAgregarParadaSugerida() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      viajeId,
      fecha,
      propuestaId,
    }: {
      viajeId: number
      fecha: string
      propuestaId: number
    }) =>
      apiPost<CircuitoSeleccionadoResponse, { propuestaId: number }>(
        `/api/viajes/${viajeId}/circuito/seleccionado/dias/${fecha}/items`,
        { propuestaId },
      ),
    onSuccess: (data, { viajeId, fecha }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sugerenciasDia(viajeId, fecha),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

export function useDescartarAvisoDia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viajeId, fecha }: { viajeId: number; fecha: string }) =>
      apiPut<CircuitoSeleccionadoResponse, { descartado: boolean }>(
        `/api/viajes/${viajeId}/circuito/seleccionado/dias/${fecha}/aviso`,
        { descartado: true },
      ),
    onSuccess: (data, { viajeId }) => {
      queryClient.setQueryData(queryKeys.circuitoSeleccionado(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.circuito(viajeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}

/**
 * Selecciona una de las alternativas. También es única: el backend responde 400 si ya hay una
 * estrategia seleccionada, así que el botón se deshabilita cuando `estrategiaSeleccionada` existe.
 */
export function useSeleccionarCircuito() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ viajeId, estrategia }: { viajeId: number } & SeleccionCircuitoRequest) =>
      apiPost<GeneracionCircuitoResponse, SeleccionCircuitoRequest>(
        `/api/viajes/${viajeId}/circuito/seleccion`,
        { estrategia },
      ),
    onSuccess: (data, { viajeId }) => {
      queryClient.setQueryData(queryKeys.circuito(viajeId), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.viajesAll() })
    },
  })
}
