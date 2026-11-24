import type { ViajezasoPaths } from '@/components/viajezaso/context'

/** Rutas reales de turismo-frontend que consumen los enlaces de las páginas públicas. */
export const VIAJEZASO_PATHS: ViajezasoPaths = {
  inicio: '/',
  propuestas: '/descubrir',
  publicaciones: '/descubrir',
  ingresar: '/login',
  sobreNosotros: '/sobre-nosotros',
}

/** Enlaces a redes sociales oficiales. */
export const VIAJEZASO_SOCIALS: Record<string, string> = {
  facebook: '',
  instagram: 'https://www.instagram.com/viajesazo.app/?utm_source=ig_web_button_share_sheet',
  tiktok: '',
}
