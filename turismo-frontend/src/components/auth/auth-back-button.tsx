import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Vuelve a la pantalla anterior del historial de la SPA, o a `/` si no hay historial.
 */
export function AuthBackButton() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#00658d] hover:text-[#008ab7] hover:underline"
      onClick={() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx
        if (typeof idx === 'number' && idx > 0) {
          navigate(-1)
          return
        }
        navigate('/', { replace: true })
      }}
    >
      <ArrowLeftIcon className="h-4 w-4" aria-hidden />
      Volver
    </button>
  )
}
