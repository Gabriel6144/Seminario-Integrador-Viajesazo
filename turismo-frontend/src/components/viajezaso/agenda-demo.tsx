import { useRef, useState } from "react";
import type {
  DragEvent as ReactDragEvent,
} from "react";
import { AGENDA_EVENTS } from "@/lib/viajezaso/data";
import type { AgendaEvent } from "@/lib/viajezaso/data";
import { useViajezaso, T } from "./context";
import { Modal } from "./dialogs";
import {
  dateKey,
  localDate,
  mondayOf,
  validDate,
  formatDate,
  demoRegistrations,
  commitReschedule,
} from "@/lib/viajezaso/date-utils";
import type { RescheduleNotification, ReschedulePlan } from "@/lib/viajezaso/date-utils";

interface AgendaModel {
  events: AgendaEvent[];
  notifications: RescheduleNotification[];
}

interface Feedback {
  key: string;
  count: number;
}

interface PointerDrag {
  id: string;
  x: number;
  y: number;
  pointerId: number;
  moved: boolean;
}

interface DragGhost {
  x: number;
  y: number;
  name: string;
}

export function AgendaDemo() {
  const { copy, locale, language, asset } = useViajezaso();
  const [model, setModel] = useState<AgendaModel>(() => ({
    events: AGENDA_EVENTS.map((event) => ({ ...event })),
    notifications: [],
  }));
  const [view, setView] = useState<"month" | "week">("month");
  const [period, setPeriod] = useState("2026-11-01");
  const [selected, setSelected] = useState("2026-11-17");
  const [selectedId, setSelectedId] = useState("oktoberfest");
  const [pending, setPending] = useState<ReschedulePlan | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dropDate, setDropDate] = useState("");
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const dragged = useRef<string | null>(null);
  const pointer = useRef<PointerDrag | null>(null);
  const suppressClick = useRef(0);
  const { events, notifications } = model;
  const eventName = (event: AgendaEvent): string => event.name[language];
  const start =
    view === "month"
      ? new Date(
          localDate(period).getFullYear(),
          localDate(period).getMonth(),
          1,
        )
      : mondayOf(localDate(period));
  const end =
    view === "month"
      ? new Date(start.getFullYear(), start.getMonth() + 1, 0)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const visibleEvents = events
    .filter(
      (event) => event.date >= dateKey(start) && event.date <= dateKey(end),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  let days: (Date | null)[];
  if (view === "month") {
    const offset = (start.getDay() + 6) % 7,
      count = Math.ceil((offset + end.getDate()) / 7) * 7;
    days = Array.from({ length: count }, (_, i) =>
      i < offset || i >= offset + end.getDate()
        ? null
        : new Date(start.getFullYear(), start.getMonth(), i - offset + 1),
    );
  } else
    days = Array.from(
      { length: 7 },
      (_, i) =>
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  const openMove = (id: string, to?: string) => {
    const event = events.find((item) => item.id === id);
    if (!event || to === event.date) return;
    setPending({
      id,
      from: event.date,
      to: to || event.date,
      count: demoRegistrations[id] || 0,
    });
  };
  const confirm = () => {
    if (!pending) return;
    const result = commitReschedule(events, pending);
    if (!result) return;
    setModel({
      events: result.events,
      notifications: result.notification
        ? [result.notification, ...notifications]
        : notifications,
    });
    setSelected(pending.to);
    setSelectedId(pending.id);
    setPeriod(pending.to);
    setFeedback({
      key: result.notification
        ? pending.count === 1
          ? "demoNoticeSentOne"
          : "demoNoticeSent"
        : "dateMovedNoRecipients",
      count: pending.count,
    });
    setPending(null);
  };
  const changePeriod = (direction: number) =>
    setPeriod(
      dateKey(
        view === "month"
          ? new Date(start.getFullYear(), start.getMonth() + direction, 1)
          : new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate() + direction * 7,
            ),
      ),
    );
  const selectEvent = (event: AgendaEvent) => {
    if (Date.now() < suppressClick.current) return;
    setSelectedId(event.id);
    setSelected(event.date);
    if (view === "week") setPeriod(event.date);
  };
  const getDropDate = (x: number, y: number): string => {
    const day = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-date]");
    return day && root.current?.contains(day) ? day.dataset.dropDate ?? "" : "";
  };
  const finishPointer = () => {
    pointer.current = null;
    setGhost(null);
    setDropDate("");
  };
  const dragStart = (e: ReactDragEvent<HTMLElement>, id: string) => {
    dragged.current = id;
    e.dataTransfer.setData("application/x-viajezaso-event", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const endDrag = () => {
    dragged.current = null;
    setDropDate("");
    suppressClick.current = Date.now() + 350;
  };
  const drop = (e: ReactDragEvent<HTMLButtonElement>, key: string) => {
    e.preventDefault();
    const id = dragged.current;
    if (id) openMove(id, key);
    endDrag();
  };
  const name = pending ? events.find((event) => event.id === pending.id) : undefined;
  const pendingValid =
    pending !== null &&
    validDate(pending.to) &&
    pending.to !== pending.from;
  const weekdays =
    language === "es"
      ? ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
      : ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  return (
    <div ref={root}>
      <div className="agenda-reference-top">
        <div>
          <p className="micro-label">{copy.agendaLabel}</p>
          <h3>{copy.agendaTitle}</h3>
        </div>
        <img src={asset("publicador.png")} alt="" width="1254" height="1254" />
      </div>
      <div className="publisher-calendar-layout">
        <aside className="agenda-list-panel">
          <div className="agenda-list-heading">
            <h4>
              {copy[view === "month" ? "agendaListTitle" : "agendaWeekTitle"]}
            </h4>
            <p>
              {visibleEvents.length}{" "}
              {copy.proposalsCount ||
                (language === "es" ? "propuestas" : "experiences")}
            </p>
          </div>
          <div className="agenda-event-list">
            {visibleEvents.length ? (
              visibleEvents.map((event) => (
                <div className="agenda-list-event-row" key={event.id}>
                  <button
                    className="agenda-list-event"
                    type="button"
                    aria-pressed={selectedId === event.id}
                    onClick={() => selectEvent(event)}
                    draggable
                    onDragStart={(e) => dragStart(e, event.id)}
                    onDragEnd={endDrag}
                  >
                    <span className="agenda-event-date">
                      <strong>{localDate(event.date).getDate()}</strong>
                      <small>
                        {formatDate(event.date, locale, { month: "short" })}
                      </small>
                    </span>
                    <span className="agenda-list-details">
                      <strong>{eventName(event)}</strong>
                      <small>
                        {
                          copy[
                            event.kind === "activity"
                              ? "activityKind"
                              : "eventKind"
                          ]
                        }
                      </small>
                      <span>{event.time || copy.allDay}</span>
                      <small>
                        {(
                          copy[
                            demoRegistrations[event.id] === 1
                              ? "demoRegisteredCountOne"
                              : "demoRegisteredCount"
                          ] || "{count}"
                        ).replace("{count}", String(demoRegistrations[event.id] || 0))}
                      </small>
                    </span>
                  </button>
                  <button
                    className="agenda-move-handle"
                    type="button"
                    aria-label={`${copy.moveProposal || "Cambiar fecha"}: ${eventName(event)}`}
                    onClick={() => {
                      if (Date.now() >= suppressClick.current)
                        openMove(event.id);
                    }}
                    onPointerDown={(e) => {
                      if (e.button > 0) return;
                      pointer.current = {
                        id: event.id,
                        x: e.clientX,
                        y: e.clientY,
                        pointerId: e.pointerId,
                        moved: false,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const drag = pointer.current;
                      if (!drag || drag.pointerId !== e.pointerId) return;
                      if (
                        !drag.moved &&
                        Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7
                      )
                        return;
                      drag.moved = true;
                      e.preventDefault();
                      setGhost({
                        x: e.clientX + 12,
                        y: e.clientY + 12,
                        name: eventName(event),
                      });
                      setDropDate(getDropDate(e.clientX, e.clientY));
                      if (e.clientY < 50) window.scrollBy(0, -15);
                      else if (e.clientY > window.innerHeight - 50)
                        window.scrollBy(0, 15);
                    }}
                    onPointerUp={(e) => {
                      const drag = pointer.current;
                      if (drag?.moved) {
                        const target = getDropDate(e.clientX, e.clientY);
                        suppressClick.current = Date.now() + 400;
                        if (target) openMove(drag.id, target);
                        e.preventDefault();
                      }
                      finishPointer();
                    }}
                    onPointerCancel={finishPointer}
                  >
                    ⠿
                  </button>
                </div>
              ))
            ) : (
              <p className="agenda-empty">{copy.agendaEmpty}</p>
            )}
          </div>
        </aside>
        <div className="calendar-surface">
          <div className="calendar-toolbar">
            <h4>{copy.calendarTitle}</h4>
            <div className="calendar-toolbar-bottom">
              <div
                className="calendar-view-switch"
                role="group"
                aria-label={copy.calendarViewLabel}
              >
                {(["month", "week"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={view === value}
                    onClick={() => {
                      setView(value);
                      setPeriod(selected);
                    }}
                  >
                    {copy[value === "month" ? "monthView" : "weekView"]}
                  </button>
                ))}
              </div>
              <div className="calendar-pagination">
                <button
                  type="button"
                  aria-label={copy.previousPeriod}
                  onClick={() => changePeriod(-1)}
                >
                  ‹
                </button>
                <span aria-live="polite">
                  {new Intl.DateTimeFormat(locale, {
                    month: "long",
                    year: "numeric",
                  }).format(start)}
                </span>
                <button
                  type="button"
                  aria-label={copy.nextPeriod}
                  onClick={() => changePeriod(1)}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className={`calendar-grid ${view === "week" ? "week-view" : ""}`}
            role="group"
            aria-label={copy.calendarDaysLabel}
          >
            {days.map((date, i) => {
              if (!date)
                return (
                  <div key={`empty-${i}`} className="calendar-day empty-day" />
                );
              const key = dateKey(date),
                dayEvents = events.filter((event) => event.date === key);
              return (
                <button
                  className={`calendar-day ${selected === key ? "selected" : ""} ${dayEvents.length ? "has-event" : ""} ${dropDate === key ? "is-drop-target" : ""}`}
                  type="button"
                  key={key}
                  data-drop-date={key}
                  aria-pressed={selected === key}
                  aria-label={`${formatDate(key, locale, { dateStyle: "full" })}. ${dayEvents.map(eventName).join(", ") || copy.calendarNoEvents}`}
                  onClick={() => {
                    if (Date.now() >= suppressClick.current) {
                      setSelected(key);
                      setSelectedId(dayEvents[0]?.id || "");
                    }
                  }}
                  onDragOver={(e) => {
                    if (dragged.current) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDropDate(key);
                    }
                  }}
                  onDrop={(e) => drop(e, key)}
                >
                  <span className="calendar-day-number">{date.getDate()}</span>
                  {dayEvents.map((event) => (
                    <span
                      className={`calendar-event-chip ${event.kind === "activity" ? "activity-chip" : ""}`}
                      key={event.id}
                      draggable
                      title={copy.dragProposal}
                      onDragStart={(e) => dragStart(e, event.id)}
                      onDragEnd={endDrag}
                    >
                      <strong>{eventName(event)}</strong>
                      <small>
                        {
                          copy[
                            event.kind === "activity"
                              ? "activityKind"
                              : "eventKind"
                          ]
                        }
                      </small>
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="calendar-demo-feedback">
        <p className="calendar-drag-tip">{copy.agendaDragHint}</p>
        {feedback && (
          <div className="publisher-feedback" role="status">
            {copy[feedback.key].replace("{count}", String(feedback.count))}
          </div>
        )}
        <section
          className="tourist-notification-preview"
          aria-labelledby="tourist-notification-heading"
        >
          <div className="notification-preview-heading">
            <h4 id="tourist-notification-heading">
              {copy.notificationsHeading}
            </h4>
            <span>{copy.touristPreviewLabel}</span>
          </div>
          <div aria-live="polite">
            {notifications.length ? (
              notifications.slice(0, 3).map((notification, i) => (
                <article
                  className="tourist-notification-card"
                  key={`${notification.id}-${notification.at}-${i}`}
                >
                  <h5>
                    {
                      copy[
                        notification.kind === "activity"
                          ? "activityRescheduled"
                          : "eventRescheduled"
                      ]
                    }
                    : {notification.name[language]}
                  </h5>
                  <p>
                    {copy[
                      notification.kind === "activity"
                        ? "activityNotificationBody"
                        : "eventNotificationBody"
                    ]
                      .replace("{name}", notification.name[language])
                      .replace("{from}", formatDate(notification.from, locale))
                      .replace("{to}", formatDate(notification.to, locale))}
                  </p>
                  <time dateTime={notification.at}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "long",
                      timeStyle: "short",
                      timeZone: "America/Argentina/Buenos_Aires",
                    }).format(new Date(notification.at))}
                  </time>
                  <small className="notification-recipient-count">
                    {copy[
                      notification.count === 1
                        ? "demoNoticeRecipientOne"
                        : "demoNoticeRecipients"
                    ].replace("{count}", String(notification.count))}
                  </small>
                </article>
              ))
            ) : (
              <p className="notification-empty">{copy.notificationEmpty}</p>
            )}
          </div>
        </section>
      </div>
      <p className="agenda-demo">{copy.agendaDemoNew}</p>
      {ghost && (
        <div
          className="agenda-drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.name}
        </div>
      )}
      {pending && (
        <Modal
          className="reschedule-dialog"
          labelledBy="reschedule-title"
          onClose={() => setPending(null)}
        >
          <button
            type="button"
            className="dialog-close"
            onClick={() => setPending(null)}
            aria-label={copy.close}
          >
            ×
          </button>
          <span className="reschedule-demo-badge">{copy.rescheduleDemo}</span>
          <h2 id="reschedule-title">{copy.rescheduleTitle}</h2>
          <p className="reschedule-event-name">{name ? eventName(name) : null}</p>
          <div className="reschedule-count">
            <strong>{pending.count}</strong>
            <span>
              {
                copy[
                  pending.count === 1
                    ? "affectedExampleTouristOne"
                    : "affectedExampleTourists"
                ]
              }
            </span>
          </div>
          <p className="reschedule-warning">
            {
              copy[
                pending.count ? "rescheduleHasTourists" : "rescheduleNoTourists"
              ]
            }
          </p>
          <label className="reschedule-date-label">
            <span>{copy.newEventDate}</span>
            <input
              type="date"
              value={pending.to}
              onChange={(e) => setPending({ ...pending, to: e.target.value })}
            />
          </label>
          <p className="reschedule-date-summary" role="status">
            {pendingValid
              ? `${formatDate(pending.from, locale)} → ${formatDate(pending.to, locale)}`
              : copy.chooseDifferentDate}
          </p>
          <p className="reschedule-note">{copy.rescheduleLocalNotice}</p>
          <div className="reschedule-actions">
            <button
              type="button"
              className="reschedule-cancel"
              onClick={() => setPending(null)}
            >
              <T id="cancelReschedule" />
            </button>
            <button
              type="button"
              className="reschedule-confirm"
              disabled={!pendingValid}
              onClick={confirm}
            >
              <T id="confirmReschedule" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
