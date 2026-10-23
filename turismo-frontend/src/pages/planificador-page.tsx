import { useEffect, useState, useId, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useBorrador,
  useActualizarBorrador,
  useCompletarBorrador,
  useCrearViaje,
  useGuardarBorrador,
} from '@/api/viajes'
import {
  INTEREST_MAP,
  RADIO_MAX_KM,
  RANDOM_NAMES,
  RHYTHM_MAP,
} from '@/components/planificador/constants'
import { Paso1Bienvenida } from '@/components/planificador/paso-1-bienvenida'
import { Paso2Nombre } from '@/components/planificador/paso-2-nombre'
import { Paso3Fechas } from '@/components/planificador/paso-3-fechas'
import { Paso4Destino } from '@/components/planificador/paso-4-destino'
import { Paso5Radio } from '@/components/planificador/paso-5-radio'
import { Paso6Intereses } from '@/components/planificador/paso-6-intereses'
import { Paso7Ritmo } from '@/components/planificador/paso-7-ritmo'
import { Paso8Resumen } from '@/components/planificador/paso-8-resumen'
import { Paso9Generando } from '@/components/planificador/paso-9-generando'
import { Paso10Circuito } from '@/components/planificador/paso-10-circuito'
import { PlanificadorExitModal } from '@/components/planificador/planificador-exit-modal'
import { PlanificadorHeader } from '@/components/planificador/planificador-header'
import type { DestinoSeleccionado, LoadingStep } from '@/components/planificador/types'
import type {
  InteresCategoria,
  TipoRitmo,
  ViajeBorradorRequest,
  ViajeRequest,
} from '@/types/api'

const RHYTHM_REVERSE: Record<TipoRitmo, string> = {
  TRANQUILO: 'Tranquilo',
  EQUILIBRADO: 'Equilibrado',
  INTENSIVO: 'Intensivo',
}

const INTEREST_REVERSE: Partial<Record<InteresCategoria, string>> = Object.fromEntries(
  Object.entries(INTEREST_MAP).map(([k, v]) => [v, k]),
) as Partial<Record<InteresCategoria, string>>

export function PlanificadorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const borradorIdInicial = searchParams.get('borrador')
  const [borradorId, setBorradorId] = useState<number | null>(
    borradorIdInicial ? Number(borradorIdInicial) : null,
  )

  // Sincroniza `borradorId` cuando el query param `borrador` cambia
  // (por ejemplo, al recargar la página o navegar entre borradores)
  useEffect(() => {
    const nuevoId = searchParams.get('borrador')
    setBorradorId(nuevoId ? Number(nuevoId) : null)
  }, [searchParams])

  const borradorQuery = useBorrador(borradorId)
  const guardarBorrador = useGuardarBorrador()
  const actualizarBorrador = useActualizarBorrador()
  const completarBorrador = useCompletarBorrador()
  const crearViaje = useCrearViaje()

  const tripNameId = useId()
  const dateFromId = useId()
  const dateToId = useId()
  const sliderKmId = useId()

  // Wizard state
  const [step, setStep] = useState<number>(1)
  const [tripName, setTripName] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [destino, setDestino] = useState<DestinoSeleccionado | null>(null)
  const [radiusKm, setRadiusKm] = useState<number>(8)
  const [interests, setInterests] = useState<string[]>([])
  const [rhythm, setRhythm] = useState<string>('')

  // Scroll to top whenever step changes
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }, [step])

  // Screen states
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<number>(1)

  // Loading animation state
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  const loadingSteps: LoadingStep[] = [
    { title: 'Estamos buscando experiencias para vos...', sub: 'Explorando paradas serranas y recomendaciones locales...', bar: 30 },
    { title: 'Encontramos actividades que coinciden con tus intereses...', sub: `Combinando ${interests.slice(0, 2).join(' & ')}...`, bar: 65 },
    { title: 'Estamos armando la mejor combinación...', sub: 'Calculando tiempos óptimos sin apurarte...', bar: 88 },
    { title: '¡Tu aventura está lista!', sub: 'Itinerario optimizado con éxito.', bar: 100 },
  ]

  // Validation helpers for each step
  const todayStr = (() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  const isStep2Valid = tripName.trim().length > 0
  const isStep3Valid = dateFrom !== '' && dateTo !== '' && dateFrom >= todayStr && dateFrom <= dateTo
  const isStep4Valid = destino !== null
  const isStep5Valid =
    typeof radiusKm === 'number' && radiusKm > 0 && radiusKm <= RADIO_MAX_KM
  const isStep6Valid = interests.length > 0
  const isStep7Valid = rhythm.trim().length > 0

  // Calculate day difference
  const daysCount = (() => {
    if (!dateFrom || !dateTo) return 0
    const d1 = new Date(dateFrom)
    const d2 = new Date(dateTo)
    if (d1 > d2) return 0
    const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return isNaN(diff) || diff < 1 ? 0 : diff
  })()

  useEffect(() => {
    const d = borradorQuery.data
    if (!d) return
    setTripName(d.nombre ?? 'Escapada a Córdoba')
    if (d.fechaInicio) setDateFrom(d.fechaInicio)
    if (d.fechaFin) setDateTo(d.fechaFin)
    if (d.rangoInteresKm != null) {
      setRadiusKm(Math.min(Math.max(d.rangoInteresKm, 1), RADIO_MAX_KM))
    }
    if (d.interesesCategoria.length > 0) {
      setInterests(d.interesesCategoria.map((item) => INTEREST_REVERSE[item] ?? item))
    }
    if (d.ritmo) setRhythm(RHYTHM_REVERSE[d.ritmo] ?? rhythm)
    if (d.ubicacion) {
      const ubicacion = d.ubicacion
      setDestino({
        nombre:
          [ubicacion.ciudad, ubicacion.localidad].filter(Boolean).join(' · ') ||
          ubicacion.nombre,
        ciudad: ubicacion.ciudad,
        localidad: ubicacion.localidad,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
      })
    }
    if (d.pasoActual) setStep(d.pasoActual)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorQuery.data, borradorId])

  const isSavingTrip =
    crearViaje.isPending ||
    guardarBorrador.isPending ||
    actualizarBorrador.isPending ||
    completarBorrador.isPending

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleRandomName = () => {
    const chosen = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    setTripName(chosen)
  }

  const toggleInterest = (name: string) => {
    if (interests.includes(name)) {
      setInterests(interests.filter((i) => i !== name))
    } else {
      setInterests([...interests, name])
    }
  }

  const handleNextStep = (targetStep: number) => {
    if (step === 2 && !isStep2Valid) {
      showToast('Por favor, ingresá un nombre para tu viaje')
      return
    }
    if (step === 3) {
      if (!dateFrom || !dateTo) {
        showToast('Por favor, seleccioná las fechas de llegada y partida')
        return
      }
      if (dateFrom < todayStr) {
        showToast('La fecha de llegada no puede ser anterior a la fecha actual')
        return
      }
      if (dateFrom > dateTo) {
        showToast('La fecha de llegada no puede ser posterior a la de partida')
        return
      }
    }
    if (step === 4 && !isStep4Valid) {
      showToast('Por favor, seleccioná tu zona de destino')
      return
    }
    if (step === 5 && !isStep5Valid) {
      showToast('Por favor, elegí un radio de exploración válido')
      return
    }
    if (step === 6 && !isStep6Valid) {
      showToast('Por favor, seleccioná al menos 1 interés')
      return
    }
    if (step === 7 && !isStep7Valid) {
      showToast('Por favor, seleccioná un ritmo de viaje')
      return
    }
    setStep(targetStep)
  }

  const startCircuitGeneration = () => {
    setStep(9)
    setLoadingStepIndex(0)

    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx += 1
      if (idx < loadingSteps.length) {
        setLoadingStepIndex(idx)
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
        timeoutRef.current = setTimeout(() => {
          setStep(10)
        }, 500)
      }
    }, 1100)
  }

  const buildViajePayload = (): ViajeBorradorRequest => ({
    nombre: tripName.trim() || 'Escapada a Córdoba',
    fechaInicio: dateFrom,
    fechaFin: dateTo,
    ubicacion:
      destino === null
        ? null
        : {
            ciudad: destino.ciudad,
            localidad: destino.localidad,
            latitud: destino.latitud,
            longitud: destino.longitud,
          },
    rangoInteresKm: Number(radiusKm),
    ritmo: RHYTHM_MAP[rhythm] ?? 'EQUILIBRADO',
    interesesCategoria: interests.map((item) => INTEREST_MAP[item] ?? 'NATURALEZA'),
    pasoActual: step,
    usuario: 'turista_demo',
  })

  const handleSaveTrip = () => {
    if (borradorId !== null) {
      completarBorrador.mutate(borradorId, {
        onSuccess: (data) => {
          showToast(`¡Viaje "${data.nombre ?? 'sin nombre'}" guardado en Mis viajes! 💙`)
          setBorradorId(null)
          setTimeout(() => navigate('/borradores'), 1200)
        },
        onError: (error) => {
          showToast(error instanceof Error ? error.message : 'Error al completar el viaje')
        },
      })
      return
    }

    crearViaje.mutate(buildViajePayload() as ViajeRequest, {
      onSuccess: (data) => {
        showToast(`¡Viaje "${data.nombre ?? 'sin nombre'}" guardado en Mis viajes! 💙`)
        setTimeout(() => navigate('/borradores'), 1200)
      },
      onError: (error) => {
        showToast(error instanceof Error ? error.message : 'Error al guardar el viaje')
      },
    })
  }

  const handleSaveDraft = () => {
    setIsExitModalOpen(false)
    const payload = buildViajePayload()
    const onSuccess = (data: { id: number; nombre: string | null }) => {
      setBorradorId(data.id)
      showToast('Borrador guardado correctamente')
      setTimeout(() => navigate('/borradores'), 1200)
    }
    const onError = (error: unknown) => {
      showToast(error instanceof Error ? error.message : 'Error al guardar el borrador')
    }

    if (borradorId !== null) {
      actualizarBorrador.mutate({ id: borradorId, request: payload }, { onSuccess, onError })
    } else {
      guardarBorrador.mutate(payload, { onSuccess, onError })
    }
  }

  const handleDiscardExit = () => {
    setIsExitModalOpen(false)
    navigate('/')
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div>
        {/* HEADER PROGRESO (Pasos 1 al 8) */}
        <PlanificadorHeader
          step={step}
          onBack={() => setStep((s) => s - 1)}
          onClose={() => setIsExitModalOpen(true)}
        />

        {/* CONTENIDO PRINCIPAL RESPONSIVE */}
        <main className="p-2 sm:p-4">
          {step === 1 && <Paso1Bienvenida onStart={() => setStep(2)} />}

          {step === 2 && (
            <Paso2Nombre
              tripName={tripName}
              tripNameId={tripNameId}
              isValid={isStep2Valid}
              onChangeTripName={setTripName}
              onRandomName={handleRandomName}
              onNext={() => handleNextStep(3)}
            />
          )}

          {step === 3 && (
            <Paso3Fechas
              dateFrom={dateFrom}
              dateTo={dateTo}
              dateFromId={dateFromId}
              dateToId={dateToId}
              todayStr={todayStr}
              daysCount={daysCount}
              isValid={isStep3Valid}
              onChangeDateFrom={setDateFrom}
              onChangeDateTo={setDateTo}
              onNext={() => handleNextStep(4)}
            />
          )}

          {step === 4 && (
            <Paso4Destino
              destino={destino}
              isValid={isStep4Valid}
              onSelectDestino={setDestino}
              onNext={() => handleNextStep(5)}
            />
          )}

          {step === 5 && (
            <Paso5Radio
              destino={destino}
              radiusKm={radiusKm}
              sliderKmId={sliderKmId}
              isValid={isStep5Valid}
              onChangeRadiusKm={setRadiusKm}
              onNext={() => handleNextStep(6)}
            />
          )}

          {step === 6 && (
            <Paso6Intereses
              interests={interests}
              isValid={isStep6Valid}
              onToggleInterest={toggleInterest}
              onNext={() => handleNextStep(7)}
            />
          )}

          {step === 7 && (
            <Paso7Ritmo
              rhythm={rhythm}
              isValid={isStep7Valid}
              onChangeRhythm={setRhythm}
              onNext={() => handleNextStep(8)}
            />
          )}

          {step === 8 && (
            <Paso8Resumen
              tripName={tripName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              daysCount={daysCount}
              destinoLabel={destino?.nombre ?? ''}
              radiusKm={radiusKm}
              interests={interests}
              rhythm={rhythm}
              onEditStep={setStep}
              onGenerate={startCircuitGeneration}
            />
          )}

          {step === 9 && (
            <Paso9Generando
              loadingStep={loadingSteps[loadingStepIndex] ?? loadingSteps[0]}
            />
          )}

          {step === 10 && (
            <Paso10Circuito
              tripName={tripName}
              daysCount={daysCount}
              rhythm={rhythm}
              activeDay={activeDay}
              isSavingTrip={isSavingTrip}
              onChangeActiveDay={setActiveDay}
              onSaveTrip={handleSaveTrip}
              onExploreMap={() => setStep(5)}
              onRestart={() => setStep(1)}
            />
          )}
        </main>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE SALIDA */}
      <PlanificadorExitModal
        isOpen={isExitModalOpen}
        isSaving={isSavingTrip}
        onClose={() => setIsExitModalOpen(false)}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardExit}
      />

      {/* NOTIFICACIÓN TOAST */}
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 transition-all duration-300">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 px-5 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
            <span className="material-symbols-outlined text-base text-amber-400">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
