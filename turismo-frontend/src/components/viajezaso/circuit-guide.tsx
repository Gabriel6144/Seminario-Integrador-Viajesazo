import { useEffect, useRef, useState } from "react";
import { useViajezaso, T } from "./context";
import { ROUTE_EXAMPLES, ROUTE_GEOMETRY } from "@/lib/viajezaso/data";
import { formatDate, guideDateState, todayBuenosAires } from "@/lib/viajezaso/date-utils";
import { CircuitMap } from "./circuit-map";

interface GuideDates {
  arrival: string;
  departure: string;
}

export function CircuitGuide({ active }: { active: boolean }) {
  const { copy, asset, locale, language } = useViajezaso();
  const [step, setStep] = useState(0);
  const [dates, setDates] = useState<GuideDates>({ arrival: "", departure: "" });
  const [selected, setSelected] = useState(0);
  const arrivalRef = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const state = guideDateState(dates.arrival, dates.departure);
  const duration = `${state.days || 1} ${copy[state.days === 1 ? "oneDay" : "manyDays"]}`;
  const route = ROUTE_EXAMPLES[language][selected];
  const geometry = ROUTE_GEOMETRY[selected];
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      heading.current?.focus({ preventScroll: true });
      previousStep.current = step;
    }
  }, [step]);
  const transition = (next: number) => setStep(next);
  const next = () => {
    if (step === 1 && !state.valid) {
      arrivalRef.current?.focus();
      return;
    }
    transition(step === 3 ? 1 : step + 1);
  };
  const coach = (key: string) => (
    <div className="guide-coach">
      <img src={asset("turista.png")} width="1199" height="1312" alt="" />
      <div>
        <strong>{copy.guideCoachTitle}</strong>
        <span>{copy[key]}</span>
      </div>
    </div>
  );
  return (
    <>
      <div className="window-bar">
        <span className="window-monogram" aria-hidden="true">
          <img src={asset("turista.png")} alt="" width="1199" height="1312" />
        </span>
        <span>{copy.circuitTab}</span>
        <span className="demo-badge">{copy.example}</span>
      </div>
      <div className="guide-progress-header">
        {step > 0 && (
          <button
            type="button"
            className="guide-top-back"
            onClick={() => transition(step - 1)}
            aria-label={copy.guideBack}
          >
            ‹
          </button>
        )}
        <div className="guide-progress-copy">
          <p aria-live="polite">{copy.guideStep.replace("{step}", String(step + 1))}</p>
          <div
            className="guide-progress-track"
            role="progressbar"
            aria-label={copy.guideProgressLabel}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={step + 1}
          >
            <span style={{ width: `${(step + 1) * 25}%` }} />
          </div>
        </div>
      </div>
      {step === 0 && (
        <div className="guide-step guide-welcome">
          <img
            src={asset("rumbi-saludo.png")}
            width="1199"
            height="1312"
            alt={copy.guideWaveAlt}
            className="guide-hello-mascot"
          />
          <h3 ref={heading} tabIndex={-1}>
            {copy.guideWelcomeTitle}
          </h3>
          <p>{copy.guideWelcomeBody}</p>
        </div>
      )}
      {step === 1 && (
        <div className="guide-step guide-dates">
          {coach("guideDateCoach")}
          <h3 ref={heading} tabIndex={-1}>
            {copy.guideDatesTitle}
          </h3>
          <p>{copy.guideDatesBody}</p>
          <div className="guide-date-fields">
            <label>
              <span className="guide-date-label">
                <span>{copy.arrivalLabel}</span>
                <small>Check-in</small>
              </span>
              <input
                ref={arrivalRef}
                type="date"
                min={todayBuenosAires()}
                value={dates.arrival}
                aria-describedby="guide-date-status"
                onChange={(event) =>
                  setDates({ ...dates, arrival: event.target.value })
                }
              />
            </label>
            <label>
              <span className="guide-date-label">
                <span>{copy.departureLabel}</span>
                <small>Check-out</small>
              </span>
              <input
                type="date"
                min={dates.arrival || todayBuenosAires()}
                value={dates.departure}
                aria-describedby="guide-date-status"
                onChange={(event) =>
                  setDates({ ...dates, departure: event.target.value })
                }
              />
            </label>
          </div>
          <p
            className={`guide-date-status ${!state.valid && dates.departure ? "is-error" : ""}`}
            id="guide-date-status"
            role="status"
          >
            {state.valid
              ? copy.guideStayDuration.replace("{duration}", duration)
              : copy[state.key]}
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="guide-step guide-circuits">
          {coach("guideCircuitsCoach")}
          <h3 ref={heading} tabIndex={-1}>
            {copy.guideCircuitsTitle}
          </h3>
          <p>
            {formatDate(dates.arrival, locale)} —{" "}
            {formatDate(dates.departure, locale)} · {duration}
          </p>
          <div className="generated-circuits">
            {[
              {
                index: 0,
                title: "nearEverything",
                detail: "nearEverythingDetail",
              },
              {
                index: 2,
                title: "byYourInterests",
                detail: "byYourInterestsDetail",
              },
            ].map((choice, i) => (
              <button
                className={`generated-circuit-choice ${i ? "interests-choice" : "near-choice"}`}
                type="button"
                key={choice.index}
                aria-pressed={selected === choice.index}
                onClick={() => setSelected(choice.index)}
              >
                <span className="generated-circuit-banner">
                  <small className="generated-example">{copy.example}</small>
                  <strong>{copy[choice.title]}</strong>
                </span>
                <span className="generated-circuit-content">
                  <strong className="generated-circuit-title">
                    {copy[choice.title]}
                  </strong>
                  <span className="generated-circuit-chips">
                    <span>{duration}</span>
                    <span>{copy.threeStops}</span>
                    <span>
                      {new Intl.NumberFormat(locale, {
                        maximumFractionDigits: 1,
                      }).format(
                        ROUTE_GEOMETRY[choice.index].distance / 1000,
                      )}{" "}
                      km
                    </span>
                  </span>
                  <span className="generated-circuit-detail">
                    {copy[choice.detail]}
                  </span>
                  <span className="generated-select-label">
                    {
                      copy[
                        selected === choice.index
                          ? "circuitSelected"
                          : "selectCircuit"
                      ]
                    }
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="guide-step guide-map-step">
          <div className="circuit-heading">
            <div>
              <p className="micro-label">{copy.circuitPlace}</p>
              <h3 ref={heading} tabIndex={-1}>
                {route.title}
              </h3>
            </div>
            <span className="route-count">
              {copy.threeStops}
              <br />
              {new Intl.NumberFormat(locale, {
                maximumFractionDigits: 1,
              }).format(geometry.distance / 1000)}{" "}
              km · {Math.round(geometry.duration / 60)} min
            </span>
          </div>
          <CircuitMap routeIndex={selected} active={active} />
          <ol className="route-stops">
            {route.stops.map((stop, i) => (
              <li key={stop}>
                <span>{i + 1}</span>
                <span>{stop}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="route-refresh"
            onClick={() => transition(2)}
          >
            <T id="generateRoute" />
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      )}
      <div className="guide-footer">
        {step > 0 && (
          <button
            className="guide-back"
            type="button"
            onClick={() => transition(step - 1)}
          >
            {copy.guideBack}
          </button>
        )}
        <button
          type="button"
          className="guide-next"
          disabled={step === 1 && !state.valid}
          onClick={next}
        >
          {
            copy[
              ["guideStart", "guideGenerate", "guideSeeMap", "guideRestart"][
                step
              ]
            ]
          }
        </button>
      </div>
    </>
  );
}
