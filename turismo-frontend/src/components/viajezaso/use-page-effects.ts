import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Título del documento, scroll al ancla y aparición progresiva de las secciones
 * directas del `<main>` de las páginas públicas.
 */
export function usePageEffects(
  root: RefObject<HTMLElement | null>,
  title: string,
) {
  const { hash, pathname } = useLocation()
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) {
        const target = Array.from(
          root.current?.querySelectorAll('[id]') ?? [],
        ).find((node) => `#${node.id}` === hash)
        target?.scrollIntoView({ block: 'start' })
      } else window.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [root, hash, pathname])
  useEffect(() => {
    if (!root.current || !window.IntersectionObserver) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (!reduced.matches) {
            const animation = entry.target.animate(
              [
                { opacity: 0, transform: 'translateY(22px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              { duration: 580, easing: 'cubic-bezier(.2,.75,.2,1)' },
            )
            animations.add(animation)
            animation.finished
              .then(() => animations.delete(animation))
              .catch(() => {})
          }
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    )
    root.current
      .querySelectorAll(':scope > section')
      .forEach((section) => observer.observe(section))
    const stop = () => {
      if (reduced.matches)
        animations.forEach((animation) => animation.cancel())
    }
    reduced.addEventListener('change', stop)
    return () => {
      observer.disconnect()
      reduced.removeEventListener('change', stop)
      animations.forEach((animation) => animation.cancel())
    }
  }, [root])
}
