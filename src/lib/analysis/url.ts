/** Normalise une adresse saisie (« exemple.mg/page » → « https://exemple.mg/page »), null si invalide. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Domaine sans « www. » (comme la colonne générée sources.domain). */
export function domainOf(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
}

/** Première adresse web trouvée dans un texte partagé (WhatsApp colle souvent texte + lien). */
export function firstUrlIn(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  return match ? normalizeUrl(match[0]) : null
}
