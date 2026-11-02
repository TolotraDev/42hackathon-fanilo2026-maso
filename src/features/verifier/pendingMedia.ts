// Fichier à analyser, transmis entre pages (un fichier ne peut pas passer dans l'adresse).

export interface PendingMedia {
  file: File
  /** Adresse publique d'origine, si connue (partage d'un lien) : préremplit la recherche inversée. */
  sourceUrl?: string | null
  origin?: string | null
}

let pending: PendingMedia | null = null

export function setPendingMedia(media: PendingMedia) {
  pending = media
}

export function takePendingMedia(): PendingMedia | null {
  const media = pending
  pending = null
  return media
}
