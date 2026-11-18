import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { T, useViajezaso } from './context'
import { TripsDashboard } from './content'
import type { MediaSelection } from './types'

interface ModalProps {
  children?: ReactNode
  className?: string
  onClose: () => void
  labelledBy?: string
  id?: string
  'data-layout'?: 'landscape' | 'portrait'
}

export function Modal({
  children,
  className = '',
  onClose,
  labelledBy,
  ...props
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const origin = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animation = reduced
      ? null
      : dialog.animate?.(
          [
            { opacity: 0.2, transform: "translateY(12px) scale(.96)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 260, easing: "ease-out" },
        );
    return () => {
      animation?.cancel();
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (origin instanceof HTMLElement && origin.isConnected)
        origin.focus({ preventScroll: true })
    };
  }, []);
  return (
    <dialog
      {...props}
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target !== ref.current) return;
        const b = ref.current.getBoundingClientRect();
        if (
          event.clientX < b.left ||
          event.clientX > b.right ||
          event.clientY < b.top ||
          event.clientY > b.bottom
        )
          closeRef.current();
      }}
    >
      {children}
    </dialog>
  );
}
export function MediaViewer({
  media,
  onClose,
}: {
  media: MediaSelection
  onClose: () => void
}) {
  const { copy } = useViajezaso()
  const [nativeSize, setNativeSize] = useState(false)
  return (
    <Modal
      id="media-dialog"
      className={`media-modal ${nativeSize ? "is-native-size" : ""}`}
      labelledBy="media-dialog-title"
      onClose={onClose}
      data-layout={
        media.type === 'trips' ||
        (media.type === 'image' && /panel-publicador/.test(media.src))
          ? 'landscape'
          : 'portrait'
      }
    >
      <div className="media-modal-header">
        <h2 id="media-dialog-title">{media.title}</h2>
        <div className="media-modal-actions">
          <button
            type="button"
            className="media-size-toggle"
            aria-pressed={nativeSize}
            onClick={() => setNativeSize((v) => !v)}
          >
            {copy[nativeSize ? "mediaFitSize" : "mediaFullSize"]}
          </button>
          <button
            type="button"
            className="media-close"
            onClick={onClose}
            aria-label={copy.closeImage}
          >
            ×
          </button>
        </div>
      </div>
      <div className="media-viewport">
        {media.type === "trips" ? (
          <div
            className="media-live-panel"
            style={nativeSize ? { width: 1180 } : undefined}
          >
            <TripsDashboard />
          </div>
        ) : (
          <img
            className="expanded-media-image"
            src={media.src}
            alt={media.alt}
            style={
              nativeSize
                ? { width: "auto", maxWidth: "none", maxHeight: "none" }
                : undefined
            }
          />
        )}
      </div>
    </Modal>
  );
}
export function SocialDialog({ onClose }: { onClose: () => void }) {
  const { asset, copy, socials } = useViajezaso()
  const [pending, setPending] = useState('')
  const open = (name: string) => {
    let url;
    try {
      url = new URL(socials[name]);
    } catch {
      url = null;
    }
    if (url && ["http:", "https:"].includes(url.protocol))
      window.open(url.href, "_blank", "noopener,noreferrer");
    else setPending(name[0].toUpperCase() + name.slice(1));
  };
  return (
    <Modal
      id="social-dialog"
      className="social-dialog"
      labelledBy="social-dialog-title"
      onClose={onClose}
    >
      <button
        type="button"
        className="dialog-close"
        aria-label={copy.close}
        onClick={onClose}
      >
        ×
      </button>
      <img
        className="social-dialog-rumbi"
        src={asset("rumbi-guino.png")}
        width="1199"
        height="1312"
        alt=""
      />
      <h2 id="social-dialog-title">
        <T id="socialTitle" />
      </h2>
      <p>
        <T id="socialBody" />
      </p>
      <div className="social-platform-list">
        {["facebook", "instagram", "tiktok"].map((name) => (
          <button
            className="social-platform"
            type="button"
            key={name}
            onClick={() => open(name)}
          >
            <img
              src={asset(`social/${name}.svg`)}
              width="30"
              height="30"
              alt=""
            />
            <span>{name[0].toUpperCase() + name.slice(1)}</span>
          </button>
        ))}
      </div>
      {pending && (
        <p className="social-link-notice" role="status">
          {copy.socialPending?.replace("{platform}", pending) ||
            `${pending}: ${copy.profilePlaceholder}`}
        </p>
      )}
    </Modal>
  );
}
