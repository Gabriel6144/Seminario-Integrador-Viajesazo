import { AppLink, T, useViajezaso } from './context'
import type { OpenMedia } from './types'

interface PublisherSectionProps {
  onOpenMedia: OpenMedia
  onOpenAgenda: () => void
}

export function PublisherSection({
  onOpenMedia,
  onOpenAgenda,
}: PublisherSectionProps) {
  const { copy, asset } = useViajezaso()
  return (
    <section
      className="audience-section publisher-section wrap"
      id="publicadores"
      aria-labelledby="publisher-new-title"
    >
      {"\n      "}
      <div className="audience-copy">
        <p className="eyebrow">
          <span className="inline-roman">{"I —"}</span>{" "}
          <span>
            <T id="publisherNewEyebrow" />
          </span>
        </p>
        <h2 id="publisher-new-title">
          <T id="publisherNewTitle" />
        </h2>
        <p className="manifesto-lead">
          <T id="publisherNewLead" />
        </p>
        <p>
          <T id="publisherNewBody" />
        </p>
        <a
          className="deco-button secondary"
          href="#agenda-preview"
          onClick={onOpenAgenda}
        >
          <T id="publisherNewCta" />
        </a>
      </div>
      {"\n      "}
      <div className="role-composition">
        <div className="role-line" aria-hidden="true"></div>
        <figure className="role-image problem-image">
          <button
            className="role-expand"
            type="button"
            aria-haspopup="dialog"
            aria-controls="media-dialog"
            aria-label={copy["expandPublisherProblem"]}
            onClick={() =>
              onOpenMedia({
                type: "image",
                src: asset("publicaciones-dispersas.png"),
                alt: copy["publisherProblemAlt"],
                title: copy["scatteredImageTitle"],
              })
            }
          >
            <span className="role-image-label">
              <span>{"I"}</span>
              <span>
                <T id="beforeLabel" />
              </span>
            </span>
            <span className="role-card-media">
              <img
                className="role-card-image scattered-preview"
                src={asset("publicaciones-dispersas.png")}
                width="1200"
                height="1310"
                loading="lazy"
                alt={copy["publisherProblemAlt"]}
              />
            </span>
            <span className="media-expand-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"></path>
              </svg>
            </span>
          </button>
        </figure>
        <figure className="role-character">
          <div className="character-arch" aria-hidden="true"></div>
          <img
            src={asset("publicador.png")}
            width="1254"
            height="1254"
            loading="lazy"
            alt={copy["publisherMascotAlt"]}
          />
        </figure>
        <figure className="role-image solution-image">
          <button
            className="role-expand"
            type="button"
            aria-haspopup="dialog"
            aria-controls="media-dialog"
            aria-label={copy["expandPublisherPanel"]}
            onClick={() =>
              onOpenMedia({
                type: "image",
                src: asset("panel-publicador.png"),
                alt: copy["publisherSolutionAlt"],
                title: copy["publisherPanelTitle"],
              })
            }
          >
            <span className="role-image-label">
              <span>{"II"}</span>
              <span>
                <T id="afterLabel" />
              </span>
            </span>
            <span className="role-card-media">
              <img
                className="role-card-image panel-preview"
                src={asset("panel-publicador.png")}
                width="1849"
                height="851"
                loading="lazy"
                alt={copy["publisherSolutionAlt"]}
              />
            </span>
            <span className="media-expand-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"></path>
              </svg>
            </span>
          </button>
        </figure>
        <p className="role-caption">
          <T id="publisherOrganizedCaption" />
        </p>
      </div>
      {"\n    "}
    </section>
  );
}

interface TouristSectionProps {
  onOpenMedia: OpenMedia
  onOpenCircuit: () => void
}

export function TouristSection({
  onOpenMedia,
  onOpenCircuit,
}: TouristSectionProps) {
  const { copy, asset } = useViajezaso()
  return (
    <section className="tourist-band">
      <div
        className="audience-section wrap"
        id="turistas"
        aria-labelledby="tourist-title"
      >
        <div className="audience-copy">
          <p className="eyebrow">
            <span className="inline-roman">{"II —"}</span>{" "}
            <span>
              <T id="touristEyebrow" />
            </span>
          </p>
          <h2 id="tourist-title">
            <T id="touristTitle" />
          </h2>
          <p className="manifesto-lead">
            <T id="touristLead" />
          </p>
          <p>
            <T id="touristBody" />
          </p>
          <a
            className="deco-button secondary"
            href="#propuestas"
            onClick={onOpenCircuit}
          >
            <T id="touristCta" />
          </a>
        </div>
        <div className="role-composition">
          <div className="role-line" aria-hidden="true"></div>
          <figure className="role-image problem-image">
            <button
              className="role-expand"
              type="button"
              aria-haspopup="dialog"
              aria-controls="media-dialog"
              aria-label={copy["expandTouristProblem"]}
              onClick={() =>
                onOpenMedia({
                  type: "image",
                  src: asset("rumbi-buscando.png"),
                  alt: copy["touristProblemAlt"],
                  title: copy["rumbiSearchTitle"],
                })
              }
            >
              <span className="role-image-label">
                <span>{"I"}</span>
                <span>
                  <T id="beforeLabel" />
                </span>
              </span>
              <span className="role-card-media">
                <img
                  className="role-card-image scattered-preview"
                  src={asset("rumbi-buscando.png")}
                  width="1200"
                  height="1310"
                  loading="lazy"
                  alt={copy["touristProblemAlt"]}
                />
              </span>
              <span className="media-expand-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"></path>
                </svg>
              </span>
            </button>
          </figure>
          <figure className="role-character">
            <div className="character-arch" aria-hidden="true"></div>
            <img
              src={asset("turista.png")}
              width="1199"
              height="1312"
              loading="lazy"
              alt={copy["touristMascotAlt"]}
            />
            <figcaption className="rumbi-name">
              <T id="touristCharacter" />
            </figcaption>
          </figure>
          <figure className="role-image solution-image">
            <button
              className="role-expand"
              type="button"
              aria-haspopup="dialog"
              aria-controls="media-dialog"
              aria-label={copy["expandTouristPanel"]}
              onClick={() =>
                onOpenMedia({ type: "trips", title: copy["tripsPanelTitle"] })
              }
            >
              <span className="role-image-label">
                <span>{"II"}</span>
                <span>
                  <T id="afterLabel" />
                </span>
              </span>
              <span className="role-card-media">
                <span className="mini-trip-dashboard" aria-hidden="true">
                  <span className="mini-trip-title">
                    <T id="myTripsTitle" />
                  </span>
                  <span className="mini-trip-metrics">
                    <span>
                      {"3"}
                      <small>
                        <T id="miniTotal" />
                      </small>
                    </span>
                    <span>
                      {"2"}
                      <small>
                        <T id="draftsShort" />
                      </small>
                    </span>
                    <span>
                      {"1"}
                      <small>
                        <T id="plannedState" />
                      </small>
                    </span>
                  </span>
                  <span className="mini-trip-rows">
                    <span>
                      <i></i>
                      <strong>
                        <T id="draftState" />
                      </strong>
                    </span>
                    <span>
                      <i></i>
                      <strong>
                        <T id="draftState" />
                      </strong>
                    </span>
                    <span>
                      <i></i>
                      <strong>
                        <T id="plannedState" />
                      </strong>
                    </span>
                  </span>
                </span>
              </span>
              <span className="media-expand-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"></path>
                </svg>
              </span>
            </button>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function AboutContent() {
  const { paths } = useViajezaso()
  return (
    <section
      id="sobre-nosotros"
      className="idea wrap section-space"
      aria-labelledby="idea-title"
    >
      {"\n      "}
      <div className="idea-heading">
        <p className="eyebrow">
          <T id="ideaEyebrow" />
        </p>
        <h2 id="idea-title">
          <T id="ideaTitle" html />
        </h2>
        <p className="idea-note">
          <T id="ideaNote" />
        </p>
      </div>
      {"\n      "}
      <div className="idea-body">
        <span className="section-roman" aria-hidden="true">
          {"III"}
        </span>
        <div>
          <p className="lead">
            <T id="ideaLead" />
          </p>
          <p>
            <T id="ideaBody" />
          </p>
          <p>
            <T id="ideaBody2" />
          </p>
          <AppLink className="text-link" to={paths.inicio + "#el-oficio"}>
            <span>
              <T id="ideaLink" />
            </span>
          </AppLink>
        </div>
      </div>
      {"\n    "}
    </section>
  );
}

export function CraftSection() {
  return (
    <section id="el-oficio" className="craft" aria-labelledby="craft-title">
      <div className="wrap">
        {"\n      "}
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <T id="craftEyebrow" />
            </p>
            <h2 id="craft-title">
              <T id="craftTitle" html />
            </h2>
          </div>
          <p className="section-aside">
            <T id="craftAside" />
          </p>
        </div>
        {"\n      "}
        <div className="journey">
          <article className="journey-step">
            <div className="step-top">
              <span className="step-roman" aria-hidden="true">
                {"I"}
              </span>
              <span className="ribbon">
                <T id="before" />
              </span>
            </div>
            <h3>
              <T id="beforeTitle" />
            </h3>
            <p>
              <T id="beforeBody" />
            </p>
            <span className="step-bottom">
              <T id="beforeBottom" />
            </span>
          </article>
          <article className="journey-step">
            <div className="step-top">
              <span className="step-roman" aria-hidden="true">
                {"II"}
              </span>
              <span className="ribbon">
                <T id="during" />
              </span>
            </div>
            <h3>
              <T id="duringTitle" />
            </h3>
            <p>
              <T id="duringBody" />
            </p>
            <span className="step-bottom">
              <T id="duringBottom" />
            </span>
          </article>
          <article className="journey-step">
            <div className="step-top">
              <span className="step-roman" aria-hidden="true">
                {"III"}
              </span>
              <span className="ribbon">
                <T id="after" />
              </span>
            </div>
            <h3>
              <T id="afterTitle" />
            </h3>
            <p>
              <T id="afterBody" />
            </p>
            <span className="step-bottom">
              <T id="afterBottom" />
            </span>
          </article>
        </div>
        {"\n      "}
        <p className="craft-foot">
          <span>
            <T id="craftFoot" />
          </span>
        </p>
        {"\n    "}
      </div>
    </section>
  );
}

export function LocalSection() {
  const { copy, asset, paths } = useViajezaso()
  return (
    <section
      id="espiritu-local"
      className="local wrap section-space"
      aria-labelledby="local-title"
    >
      {"\n      "}
      <div className="local-picture">
        <div className="postcard">
          <img
            src={asset("visibilidad-publicaciones.png")}
            width="1402"
            height="1122"
            loading="lazy"
            alt={copy["postcardAlt"]}
          />
          <div className="postcard-caption">
            <span>
              <T id="postcardCaption" />
            </span>
          </div>
        </div>
        <div className="local-note">
          <T id="localNote" html />
        </div>
      </div>
      {"\n      "}
      <div className="local-copy">
        <p className="eyebrow">
          <T id="localEyebrow" />
        </p>
        <h2 id="local-title">
          <T id="localTitle" html />
        </h2>
        <p className="lead">
          <T id="localLead" />
        </p>
        <p>
          <T id="localBody" />
        </p>
        <p>
          <T id="localBody2" />
        </p>
        <AppLink className="stamp stamp-outline" to={paths.ingresar}>
          <span>
            <T id="localCta" />
          </span>
        </AppLink>
      </div>
      {"\n    "}
    </section>
  );
}

export function PublisherTicket() {
  const { asset } = useViajezaso()
  return (
    <section
      id="publicar"
      className="publisher wrap"
      aria-labelledby="publisher-title"
    >
      <div className="publisher-ticket">
        <span className="ticket-monogram" aria-hidden="true">
          <img src={asset("turista.png")} alt="" width="1199" height="1312" />
        </span>
        <div className="publisher-title">
          <p className="eyebrow">
            <T id="publisherEyebrow" />
          </p>
          <h2 id="publisher-title">
            <T id="publisherTitle" />
          </h2>
        </div>
        <div className="publisher-copy">
          <p>
            <T id="publisherBody" />
          </p>
          <a className="text-link" href="#siguenos">
            <span>
              <T id="publisherCta" />
            </span>
          </a>
        </div>
        <span className="ticket-stub">
          <T id="publisherStub" />
        </span>
      </div>
    </section>
  );
}

export function GlossarySection() {
  return (
    <section className="glossary wrap" aria-labelledby="glossary-title">
      <div className="glossary-intro">
        <p className="eyebrow">
          <T id="glossaryEyebrow" />
        </p>
        <h2 id="glossary-title">
          <T id="glossaryTitle" />
        </h2>
      </div>
      <dl>
        <div>
          <dt>
            <span>{"I"}</span>
            <span>
              <T id="term1" />
            </span>
          </dt>
          <dd>
            <T id="definition1" />
          </dd>
        </div>
        <div>
          <dt>
            <span>{"II"}</span>
            <span>
              <T id="term2" />
            </span>
          </dt>
          <dd>
            <T id="definition2" />
          </dd>
        </div>
        <div>
          <dt>
            <span>{"III"}</span>
            <span>
              <T id="term3" />
            </span>
          </dt>
          <dd>
            <T id="definition3" />
          </dd>
        </div>
      </dl>
    </section>
  );
}

interface FollowSectionProps {
  onOpenSocial: () => void
}

export function FollowSection({ onOpenSocial }: FollowSectionProps) {
  const { asset } = useViajezaso()
  return (
    <section
      id="siguenos"
      className="follow-section wrap section-space"
      aria-labelledby="follow-title"
    >
      <p className="eyebrow">
        <T id="followEyebrow" />
      </p>
      <h2 id="follow-title">
        <T id="followTitle" html />
      </h2>
      <p>
        <T id="followBody" />
      </p>
      <button
        className="stamp stamp-primary follow-button social-follow-button"
        type="button"
        aria-haspopup="dialog"
        aria-controls="social-dialog"
        onClick={onOpenSocial}
      >
        <img
          className="follow-rumbi"
          loading="lazy"
          src={asset("rumbi-guino.png")}
          width="1199"
          height="1312"
          alt=""
        />
        <span className="follow-button-content">
          <span>
            <T id="followCta" />
          </span>
          <span className="follow-social-marks" aria-hidden="true">
            <img
              src={asset("social/facebook.svg")}
              width="17"
              height="17"
              alt=""
            />
            <img
              src={asset("social/instagram.svg")}
              width="17"
              height="17"
              alt=""
            />
            <img
              src={asset("social/tiktok.svg")}
              width="17"
              height="17"
              alt=""
            />
          </span>
        </span>
      </button>
    </section>
  );
}

export function TripsDashboard() {
  const { copy } = useViajezaso()
  return (
    <div
      className="trip-dashboard"
      role="img"
      aria-label={copy["tripsPanelAlt"]}
    >
      <div className="trip-dashboard-top">
        <div>
          <h3>
            <T id="myTripsTitle" />
          </h3>
          <p>
            <T id="myTripsSubtitle" />
          </p>
        </div>
        <span className="trip-new-action">
          <T id="planNewTrip" />
        </span>
      </div>
      <div className="trip-metrics">
        <div className="trip-metric">
          <span className="trip-metric-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="15" rx="1"></rect>
              <path d="M9 6V3h6v3M10 9v9m4-9v9"></path>
            </svg>
          </span>
          <div>
            <span>
              <T id="savedTripsLabel" />
            </span>
            <strong>
              <T id="savedTripsValue" />
            </strong>
          </div>
        </div>
        <div className="trip-metric draft">
          <span className="trip-metric-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M13 20H5V5h14v7M8 2v6m8-6v6M5 10h14m-3 10 5-5-3-3-5 5v3Z"></path>
            </svg>
          </span>
          <div>
            <span>
              <T id="draftTripsLabel" />
            </span>
            <strong>
              <T id="draftTripsValue" />
            </strong>
          </div>
        </div>
        <div className="trip-metric planned">
          <span className="trip-metric-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="7" cy="5" r="2"></circle>
              <circle cx="17" cy="19" r="2"></circle>
              <path d="M7 7v10a3 3 0 0 0 6 0V7a3 3 0 0 1 6 0v10"></path>
            </svg>
          </span>
          <div>
            <span>
              <T id="plannedTripsLabel" />
            </span>
            <strong>
              <T id="plannedTripsValue" />
            </strong>
          </div>
        </div>
      </div>
      <div className="trip-tools">
        <span className="trip-search-placeholder">
          <T id="tripSearch" />
        </span>
        <span className="trip-sort">
          <T id="tripSort" />
        </span>
      </div>
      <div className="trip-example-grid">
        <article className="trip-example-card">
          <div className="trip-card-art trip-card-art-one" aria-hidden="true">
            <span>{"01"}</span>
            <i></i>
          </div>
          <div className="trip-card-content">
            <span className="trip-state draft-state">
              <T id="draftState" />
            </span>
            <h4>
              <T id="tripExample1" />
            </h4>
            <p>
              <T id="tripExample1Detail" />
            </p>
            <span className="trip-example-note">
              <T id="tripExampleLabel" />
            </span>
          </div>
        </article>
        <article className="trip-example-card">
          <div className="trip-card-art trip-card-art-two" aria-hidden="true">
            <span>{"02"}</span>
            <i></i>
          </div>
          <div className="trip-card-content">
            <span className="trip-state draft-state">
              <T id="draftState" />
            </span>
            <h4>
              <T id="tripExample2" />
            </h4>
            <p>
              <T id="tripExample2Detail" />
            </p>
            <span className="trip-example-note">
              <T id="tripExampleLabel" />
            </span>
          </div>
        </article>
        <article className="trip-example-card">
          <div className="trip-card-art trip-card-art-three" aria-hidden="true">
            <span>{"03"}</span>
            <i></i>
          </div>
          <div className="trip-card-content">
            <span className="trip-state planned-state">
              <T id="plannedState" />
            </span>
            <h4>
              <T id="tripExample3" />
            </h4>
            <p>
              <T id="tripExample3Detail" />
            </p>
            <span className="trip-example-note">
              <T id="tripExampleLabel" />
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
