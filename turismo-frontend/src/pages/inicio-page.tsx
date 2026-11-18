import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AgendaDemo } from "@/components/viajezaso/agenda-demo";
import { useAuth } from "@/components/auth-provider";
import { CircuitGuide } from "@/components/viajezaso/circuit-guide";
import { VIAJEZASO_PATHS, VIAJEZASO_SOCIALS } from "@/components/viajezaso/config";
import {
  PublisherSection,
  TouristSection,
  CraftSection,
  LocalSection,
  PublisherTicket,
  GlossarySection,
  FollowSection,
} from "@/components/viajezaso/content";
import { useViajezaso, AppLink, T } from "@/components/viajezaso/context";
import { MediaViewer, SocialDialog } from "@/components/viajezaso/dialogs";
import type { MediaSelection } from "@/components/viajezaso/types";
import { usePageEffects } from "@/components/viajezaso/use-page-effects";
import { ViajezasoLayout } from "@/components/viajezaso/viajezaso-layout";

type Showcase = "agenda" | "circuit";

export function InicioPage() {
  return (
    <ViajezasoLayout
      showHeader={false}
      showFooter
      paths={VIAJEZASO_PATHS}
      socials={VIAJEZASO_SOCIALS}
      weather={null}
    >
      <InicioContent />
    </ViajezasoLayout>
  );
}

function InicioContent() {
  const { copy, asset, paths } = useViajezaso();
  const { isAuthenticated } = useAuth();
  const { hash } = useLocation();
  const root = useRef<HTMLElement>(null);
  const circuitTab = useRef<HTMLButtonElement>(null);
  const agendaTab = useRef<HTMLButtonElement>(null);
  const [showcase, setShowcase] = useState<Showcase>(
    hash === "#agenda-preview" ? "agenda" : "circuit",
  );
  const [media, setMedia] = useState<MediaSelection | null>(null);
  const [social, setSocial] = useState(false);
  usePageEffects(root, copy.pageTitle);
  useEffect(() => {
    if (hash === "#propuestas") setShowcase("circuit");
    else if (hash === "#agenda-preview") setShowcase("agenda");
  }, [hash]);
  const sectionProps = {
    onOpenMedia: setMedia,
    onOpenSocial: () => setSocial(true),
    onOpenAgenda: () => setShowcase("agenda"),
    onOpenCircuit: () => setShowcase("circuit"),
  };
  return (
    <>
      <main id="contenido" ref={root}>
        <section
          className="cover wrap"
          id="inicio"
          aria-labelledby="cover-title"
        >
          <div className="andes-cover">
            <img
              className="andes-photo"
              src={asset("andes-horizonte.png")}
              width="2172"
              height="724"
              alt={copy.andesAlt}
              fetchPriority="high"
            />
            <h1 id="cover-title" className="visually-hidden">
              {copy.coverAccessibleTitle}
            </h1>
          </div>
          <div className="masthead-caption">
            <span>{copy.coverCaption}</span>
          </div>
          <div className="cover-grid">
            <div className="cover-copy">
              <p className="eyebrow">
                <span className="inline-roman" aria-hidden="true">
                  I —
                </span>{" "}
                {copy.coverEyebrow}
              </p>
              <h2>
                <T id="coverHeadline" />
              </h2>
              <p className="cover-description">
                <T id="coverDescription" />
              </p>
              <a href="#publicadores" className="deco-button primary">
                <T id="coverCta" />
              </a>
            </div>
            <div className="product-stage" id="propuestas">
              <div
                className="showcase-tabs"
                role="tablist"
                aria-label={copy.showcaseLabel}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const value: Showcase =
                    event.key === "Home"
                      ? "circuit"
                      : event.key === "End"
                        ? "agenda"
                        : showcase === "circuit"
                          ? "agenda"
                          : "circuit";
                  setShowcase(value);
                  (value === "circuit"
                    ? circuitTab
                    : agendaTab
                  ).current?.focus();
                }}
              >
                {(["circuit", "agenda"] as const).map((value) => (
                  <button
                    ref={value === "circuit" ? circuitTab : agendaTab}
                    id={`tab-${value}`}
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={showcase === value}
                    aria-controls={
                      value === "circuit" ? "circuit-panel" : "agenda-preview"
                    }
                    tabIndex={showcase === value ? 0 : -1}
                    onClick={() => setShowcase(value)}
                  >
                    {copy[value === "circuit" ? "circuitTab" : "agendaTab"]}
                  </button>
                ))}
              </div>
              <div
                id="circuit-panel"
                className="circuit-window guide-window"
                role="tabpanel"
                aria-labelledby="tab-circuit"
                hidden={showcase !== "circuit"}
              >
                <CircuitGuide active={showcase === "circuit"} />
              </div>
              <div
                id="agenda-preview"
                className="agenda-window"
                role="tabpanel"
                aria-labelledby="tab-agenda"
                hidden={showcase !== "agenda"}
              >
                <AgendaDemo />
              </div>
              <p className="stage-caption">{copy.stageCaption}</p>
            </div>
          </div>
          <div className="cover-index">
            <a href="#publicadores">
              <span>I</span>
              <span>{copy.indexPublisher}</span>
            </a>
            <a href="#turistas">
              <span>II</span>
              <span>{copy.indexTourist}</span>
            </a>
            {!isAuthenticated ? (
              <AppLink to={paths.sobreNosotros}>
                <span>III</span>
                <span>{copy.indexIdea}</span>
              </AppLink>
            ) : null}
          </div>
        </section>
        <PublisherSection {...sectionProps} />
        <TouristSection {...sectionProps} />
        <CraftSection />
        <LocalSection />
        <PublisherTicket />
        <GlossarySection />
        <FollowSection {...sectionProps} />
      </main>
      {media && <MediaViewer media={media} onClose={() => setMedia(null)} />}
      {social && <SocialDialog onClose={() => setSocial(false)} />}
    </>
  );
}
