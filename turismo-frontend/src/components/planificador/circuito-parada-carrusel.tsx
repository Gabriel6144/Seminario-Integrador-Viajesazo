import { useState } from 'react'

interface CircuitoParadaCarruselProps {
  images: string[]
  alt: string
  stopNumber: number
  /** Alto del carrusel. En la tarjeta de la consulta ocupa el espacio libre (h-full). */
  heightClass?: string
}

export function CircuitoParadaCarrusel({
  images,
  alt,
  stopNumber,
  heightClass = 'h-52 sm:h-56',
}: CircuitoParadaCarruselProps) {
  const [index, setIndex] = useState(0)
  const total = images.length
  const showControls = total > 1
  const current = images[Math.min(index, total - 1)] ?? images[0]

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + total) % total)
  }

  const goNext = () => {
    setIndex((prev) => (prev + 1) % total)
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${heightClass}`}>
      <img
        src={current}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />

      <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#D4A373] bg-white text-sm font-bold text-slate-800 shadow-sm">
        {stopNumber}
      </span>

      {showControls && (
        <>
          <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {index + 1} / {total}
          </span>

          <button
            type="button"
            aria-label="Foto anterior"
            onClick={goPrev}
            className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={goNext}
            className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_right</span>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                aria-label={`Ir a foto ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  dotIndex === index ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
