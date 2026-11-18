export type MediaSelection =
  | { type: 'image'; src: string; alt: string; title: string }
  | { type: 'trips'; title: string }

export type OpenMedia = (media: MediaSelection) => void
