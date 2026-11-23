import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import {
  AppLink,
  T,
  useViajezaso,
  ViajezasoProvider,
} from '@/components/viajezaso/context'
import type { ViajezasoProviderProps } from '@/components/viajezaso/context'
import './viajezaso.css'

export function ViajezasoHeader() {
  const { copy, asset, paths, weather } = useViajezaso()
  return (
    <header className="app-header">
      <AppLink
        to={paths.inicio}
        className="app-brand"
        aria-label="Viajesazo · Inicio"
      >
        <img src={asset('turista.png')} alt="" width="40" height="42" />
        <span>Viajesazo</span>
      </AppLink>
      <nav className="app-nav" aria-label={copy.navLabel}>
        <AppLink to={paths.propuestas}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="1" />
            <path d="M4 10h16M8 2v6m8-6v6" />
          </svg>
          <T id="navProposals" />
        </AppLink>
        <AppLink to={paths.publicaciones}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 21 0-14 7-4 7 4v14ZM3 21h18M9 21v-7h6v7" />
          </svg>
          <T id="navPublishers" />
        </AppLink>
        <NavLink to={paths.sobreNosotros}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="7" r="3" />
            <path d="M5 21v-3a7 7 0 0 1 14 0v3Z" />
          </svg>
          <T id="navAbout" />
        </NavLink>
      </nav>
      <div className="app-header-right">
        {weather && (
          <span className="weather">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18a5 5 0 0 1-1-10 6 6 0 0 1 12-1 5.5 5.5 0 0 1 1 11Z" />
            </svg>
            <span>{weather}</span>
          </span>
        )}
        <AppLink className="login-button" to={paths.ingresar}>
          <T id="login" />
        </AppLink>
      </div>
    </header>
  )
}

export function ViajezasoFooter() {
  const { language, setLanguage, paths, socials } = useViajezaso()
  const instagramUrl = socials.instagram
  return (
    <footer className="footer">
      <div className="footer-top wrap">
        <AppLink to={paths.inicio} className="footer-wordmark">
          VIAJESAZO<span>CÓRDOBA, ARGENTINA</span>
        </AppLink>
        <div className="footer-social">
          <span>
            <T id="followCta" />
          </span>
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="footer-social-link"
              aria-label="Instagram de Viajesazo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          )}
        </div>
        <div className="footer-right">
          <AppLink to={`${paths.inicio}#inicio`} className="back-top">
            <T id="backTop" />
          </AppLink>
          <p>
            <T id="footerPlace" />
          </p>
        </div>
      </div>
      <div className="footer-bottom wrap">
        <span>
          <T id="footerBottom" />
        </span>
        <div className="languages" role="group" aria-label="Idioma / Language">
          {['es', 'en'].map((lang, i) => (
            <Fragment key={lang}>
              {i > 0 && <span>/</span>}
              <button
                className={`lang ${language === lang ? 'active' : ''}`}
                type="button"
                aria-pressed={language === lang}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            </Fragment>
          ))}
        </div>
        <span>
          <T id="footerClosingNew" />
        </span>
      </div>
    </footer>
  )
}

function LayoutContent({
  children,
  showHeader,
  showFooter,
}: {
  children?: ReactNode
  showHeader: boolean
  showFooter: boolean
}) {
  const { language, copy } = useViajezaso()
  return (
    <div className="viajezaso-page" lang={language}>
      <a className="skip-link" href="#contenido">
        {copy.skip}
      </a>
      {showHeader && <ViajezasoHeader />}
      {children || <Outlet />}
      {showFooter && <ViajezasoFooter />}
    </div>
  )
}

export interface ViajezasoLayoutProps extends ViajezasoProviderProps {
  showHeader?: boolean
  showFooter?: boolean
}

/**
 * Envuelve las páginas públicas con el provider, el contenedor `.viajezaso-page`
 * y, opcionalmente, el encabezado/pie editoriales. No instala router.
 */
export function ViajezasoLayout({
  children,
  showHeader = true,
  showFooter = true,
  ...configuration
}: ViajezasoLayoutProps) {
  return (
    <ViajezasoProvider {...configuration}>
      <LayoutContent showHeader={showHeader} showFooter={showFooter}>
        {children}
      </LayoutContent>
    </ViajezasoProvider>
  )
}
