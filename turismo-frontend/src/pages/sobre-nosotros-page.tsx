import { useRef } from 'react'

import { VIAJEZASO_PATHS, VIAJEZASO_SOCIALS } from '@/components/viajezaso/config'
import { AboutContent } from '@/components/viajezaso/content'
import { AppLink, useViajezaso } from '@/components/viajezaso/context'
import { usePageEffects } from '@/components/viajezaso/use-page-effects'
import { ViajezasoLayout } from '@/components/viajezaso/viajezaso-layout'

export function SobreNosotrosPage() {
  return (
    <ViajezasoLayout
      showHeader={false}
      showFooter
      paths={VIAJEZASO_PATHS}
      socials={VIAJEZASO_SOCIALS}
      weather={null}
    >
      <SobreNosotrosContent />
    </ViajezasoLayout>
  )
}

function SobreNosotrosContent() {
  const { copy, paths, asset } = useViajezaso()
  const root = useRef<HTMLElement>(null)
  usePageEffects(root, `${copy.navAbout} · Viajesazo`)
  return (
    <main id="contenido" ref={root} className="about-view">
      <section
        className="about-page-header wrap"
        aria-labelledby="about-page-title"
      >
        <AppLink to={paths.inicio} className="about-back-link">
          ← {copy.backTop}
        </AppLink>
        <div>
          <h1 id="about-page-title">{copy.navAbout}</h1>
          <img
            src={asset('turista.png')}
            width="96"
            height="106"
            alt="Rumbi"
          />
        </div>
      </section>
      <AboutContent />
    </main>
  )
}
