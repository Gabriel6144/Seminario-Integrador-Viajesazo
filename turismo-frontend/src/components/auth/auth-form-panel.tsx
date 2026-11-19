import type { ReactNode } from 'react'

import { AuthBackButton } from '@/components/auth/auth-back-button'

type AuthFormPanelProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Panel derecho del split auth: card oscura con título y formulario.
 */
export function AuthFormPanel({ title, subtitle, children, footer }: AuthFormPanelProps) {
  return (
    <section className="flex flex-1 items-center justify-center bg-[#0f1418] px-5 py-8 md:px-10 md:py-12">
      <div className="w-full max-w-md">
        <AuthBackButton />
        <div className="rounded-2xl border border-white/10 bg-[#1a1f24] p-6 shadow-xl shadow-black/30 sm:p-8">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>
            {subtitle ? <p className="text-sm text-white/65">{subtitle}</p> : null}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-white/70">{footer}</div> : null}
      </div>
    </section>
  )
}

/** Clases compartidas para inputs sobre card oscura. */
export const authInputClassName =
  'h-10 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#65b7e8] focus-visible:ring-[#65b7e8]/30'

/** Clases para labels sobre card oscura. */
export const authLabelClassName = 'text-white/85'

/** Link / acción secundaria sobre fondo oscuro. */
export const authLinkClassName =
  'font-semibold text-[#65b7e8] hover:text-[#9dd4f0] hover:underline'
