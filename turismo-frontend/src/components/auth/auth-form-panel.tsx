import type { ReactNode } from 'react'

import { AuthBackButton } from '@/components/auth/auth-back-button'

type AuthFormPanelProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Panel derecho del split auth: card clara con el tono de la página inicial.
 */
export function AuthFormPanel({ title, subtitle, children, footer }: AuthFormPanelProps) {
  return (
    <section className="flex flex-1 items-center justify-center bg-[#eef2f6] px-5 py-8 md:px-10 md:py-12">
      <div className="w-full max-w-md">
        <AuthBackButton />
        <div className="rounded-2xl border border-[#dbe8ee] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-6 flex flex-col gap-1">
            <h2 className="font-heading text-xl font-bold tracking-tight text-[#191c1e] sm:text-2xl">
              {title}
            </h2>
            {subtitle ? <p className="text-sm text-[#475569]">{subtitle}</p> : null}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-[#475569]">{footer}</div> : null}
      </div>
    </section>
  )
}

/** Clases compartidas para inputs sobre card clara. */
export const authInputClassName =
  'h-10 border-slate-200 bg-slate-50/70 text-[#191c1e] placeholder:text-slate-400 focus-visible:border-[#00658d] focus-visible:ring-[#00658d]/25'

/** Clases para labels sobre card clara. */
export const authLabelClassName = 'text-[#191c1e] font-semibold'

/** Link / acción secundaria sobre fondo claro. */
export const authLinkClassName =
  'font-semibold text-[#00658d] hover:text-[#008ab7] hover:underline'
