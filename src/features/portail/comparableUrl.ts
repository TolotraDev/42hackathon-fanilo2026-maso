/**
 * Lien comparable pour « Déjà vérifié ? » : sans protocole, « www. », fragment, barre finale
 * ni paramètres de suivi (utm_…, fbclid…). Copie de private.normalize_url (base de données).
 */
export function comparableUrl(raw: string | null | undefined): string | null {
  let value = (raw ?? '').trim().toLowerCase()
  if (!value) return null
  value = value.replace(/#.*$/, '')
  value = value.replace(/^[a-z]+:\/\//, '')
  value = value.replace(/^www\./, '')
  value = value.replace(/([?&])(utm_[a-z_]*|fbclid|gclid|igshid|si)=[^&]*/g, '$1')
  value = value.replace(/[?&]+$/, '')
  value = value.replace(/\?&+/, '?')
  value = value.replace(/&&+/g, '&')
  value = value.replace(/\/+(\?|$)/, '$1')
  return value
}
