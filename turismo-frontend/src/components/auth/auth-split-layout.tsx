import type { ReactNode } from 'react'

import { AuthBrandPanel } from '@/components/auth/auth-brand-panel'
import { AuthFormPanel } from '@/components/auth/auth-form-panel'

type AuthSplitLayoutProps = {
  brandHeading: string
  brandDescription: string
  formTitle: string
  formSubtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shell 50/50 (desktop) / brand arriba + form abajo (mobile) para pantallas de auth.
 */
export function AuthSplitLayout({
  brandHeading,
  brandDescription,
  formTitle,
  formSubtitle,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
      <AuthBrandPanel heading={brandHeading} description={brandDescription} />
      <AuthFormPanel title={formTitle} subtitle={formSubtitle} footer={footer}>
        {children}
      </AuthFormPanel>
    </div>
  )
}
