import { apiPost } from '@/lib/http'
import type { ViajeRequest, ViajeResponse } from '@/types/api'

export async function crearViaje(data: ViajeRequest): Promise<ViajeResponse> {
  return apiPost<ViajeResponse, ViajeRequest>('/api/viajes', data)
}