import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { Language } from '@/lib/viajezaso/data'
import { translations } from '@/lib/viajezaso/data'
import type { Copy } from '@/lib/viajezaso/data'

export interface ViajezasoPaths {
  inicio: string
  propuestas: string
  publicaciones: string
  ingresar: string
  sobreNosotros: string
}

export const defaultPaths: Readonly<ViajezasoPaths> = Object.freeze({
  inicio: '/',
  propuestas: '/propuestas',
  publicaciones: '/publicaciones',
  ingresar: '/login',
  sobreNosotros: '/sobre-nosotros',
})

interface ViajezasoContextValue {
  language: Language
  locale: string
  copy: Copy
  paths: ViajezasoPaths
  socials: Record<string, string>
  weather: string | null
  asset: (path: string) => string
  setLanguage: (next: string) => void
}

const ViajezasoContext = createContext<ViajezasoContextValue | null>(null)

export interface ViajezasoProviderProps {
  children: ReactNode
  paths?: Partial<ViajezasoPaths>
  assetBase?: string
  socials?: Record<string, string>
  weather?: string | null
}

export function ViajezasoProvider({
  children,
  paths: overrides,
  assetBase = '/viajezaso/assets',
  socials = {},
  weather = '20°C Córdoba',
}: ViajezasoProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return localStorage.getItem('viajezaso-language') === 'en' ? 'en' : 'es'
    } catch {
      return 'es'
    }
  })
  const value = useMemo<ViajezasoContextValue>(
    () => ({
      language,
      locale: language === 'es' ? 'es-AR' : 'en-GB',
      copy: translations[language],
      paths: { ...defaultPaths, ...overrides },
      socials,
      weather,
      asset: (path) => `${assetBase.replace(/\/$/, '')}/${path}`,
      setLanguage: (next) => {
        const safe: Language = next === 'en' ? 'en' : 'es'
        setLanguageState(safe)
        try {
          localStorage.setItem('viajezaso-language', safe)
        } catch {
          // Preferencia opcional: si el navegador la bloquea, queda en memoria.
        }
      },
    }),
    [language, overrides, assetBase, socials, weather],
  )
  return (
    <ViajezasoContext.Provider value={value}>
      {children}
    </ViajezasoContext.Provider>
  )
}

export function useViajezaso(): ViajezasoContextValue {
  const context = useContext(ViajezasoContext)
  if (!context)
    throw new Error(
      'Render Viajezaso pages inside ViajezasoProvider or ViajezasoLayout.',
    )
  return context
}

interface TProps {
  id: string
  html?: boolean
  values?: Record<string, string | number>
}

export function T({ id, html = false, values = {} }: TProps) {
  const { copy } = useViajezaso()
  const value = Object.entries(values).reduce(
    (text, [key, replacement]) =>
      text.replaceAll(`{${key}}`, String(replacement)),
    copy[id] ?? id,
  )
  // Solo textos editoriales locales contienen markup; nunca HTML de la API o del usuario.
  if (html)
    return (
      <span
        className="viajezaso-copy-html"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  return (
    <>
      {value.split(/\n|<br\s*\/?\s*>/i).map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  )
}

interface AppLinkProps {
  to: string
  children?: ReactNode
  className?: string
  title?: string
  'aria-label'?: string
  onClick?: () => void
}

export function AppLink({ to, children, ...props }: AppLinkProps) {
  if (/^https?:|^mailto:|^tel:|\.html(?:[?#]|$)/i.test(to))
    return (
      <a href={to} {...props}>
        {children}
      </a>
    )
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  )
}
