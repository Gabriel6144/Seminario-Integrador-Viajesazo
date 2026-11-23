type AuthBrandPanelProps = {
  heading: string
  description: string
}

/**
 * Panel izquierdo del split auth: paisaje + overlay claro + logo + copy de marca.
 */
export function AuthBrandPanel({ heading, description }: AuthBrandPanelProps) {
  return (
    <section
      className="relative flex min-h-[36vh] flex-col justify-end overflow-hidden md:min-h-full md:justify-center"
      aria-label="Marca Viajesazo"
    >
      <img
        src="/auth-paisaje.avif"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent md:bg-gradient-to-r md:from-slate-950/75 md:via-slate-950/38 md:to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-8 text-center md:items-start md:px-10 md:py-12 md:text-left lg:px-14">
        <img
          src="/LOGO_V.png"
          alt="Viajesazo"
          className="h-14 w-auto object-contain drop-shadow-sm md:h-16"
        />
        <div className="flex max-w-md flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-white drop-shadow-sm md:text-3xl lg:text-4xl">
            {heading}
          </h1>
          <p className="text-sm leading-relaxed text-white/90 drop-shadow-sm md:text-base">{description}</p>
        </div>
      </div>
    </section>
  )
}
