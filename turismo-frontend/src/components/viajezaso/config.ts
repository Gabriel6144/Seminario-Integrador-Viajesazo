import type { ViajezasoPaths } from '@/components/viajezaso/context'

/** Rutas reales de turismo-frontend que consumen los enlaces de las páginas públicas. */
export const VIAJEZASO_PATHS: ViajezasoPaths = {
  inicio: '/',
  propuestas: '/propuestas',
  publicaciones: '/publicadores',
  ingresar: '/login',
  sobreNosotros: '/sobre-nosotros',
}

/** Sin perfiles oficiales cargados: el diálogo muestra el aviso de enlace pendiente. */
export const VIAJEZASO_SOCIALS: Record<string, string> = {
  facebook: '',
  instagram: '',
  tiktok: '',
}
