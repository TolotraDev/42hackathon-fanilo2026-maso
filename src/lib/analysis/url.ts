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

/** Plateformes où un même domaine héberge des milliers de comptes : la source est le compte, pas le domaine. */
const PLATFORMS: Record<string, string> = {
  'facebook.com': 'facebook.com', 'm.facebook.com': 'facebook.com', 'web.facebook.com': 'facebook.com', 'mbasic.facebook.com': 'facebook.com', 'fb.com': 'facebook.com', 'fb.watch': 'facebook.com',
  'instagram.com': 'instagram.com', 'tiktok.com': 'tiktok.com', 'm.tiktok.com': 'tiktok.com', 'vm.tiktok.com': 'tiktok.com',
  'x.com': 'x.com', 'twitter.com': 'x.com', 'mobile.twitter.com': 'x.com',
  'youtube.com': 'youtube.com', 'm.youtube.com': 'youtube.com', 'youtu.be': 'youtube.com',
  'linkedin.com': 'linkedin.com', 't.me': 't.me', 'wa.me': 'wa.me', 'whatsapp.com': 'wa.me', 'chat.whatsapp.com': 'wa.me',
  'threads.net': 'threads.net', 'medium.com': 'medium.com', 'substack.com': 'substack.com', 'blogspot.com': 'blogspot.com',
}
/** Premiers segments d'adresse qui désignent un type de contenu, pas un compte (on ne peut pas en déduire l'auteur). */
const NOT_ACCOUNTS = new Set([
  'share', 'sharer', 'sharer.php', 'events', 'watch', 'reel', 'reels', 'photo', 'photo.php', 'photos', 'story.php', 'permalink.php', 'video.php',
  'videos', 'posts', 'p', 'tv', 'stories', 'explore', 'hashtag', 'search', 'login', 'home.php', 'shorts', 'live', 'embed', 'results', 'playlist',
  'i', 'intent', 'status', 'feed', 'in', 'pulse', 'company', 'school', 'pages', 'marketplace', 'gaming', 'notes', 'media', 'l.php', 'dialog',
])

export interface SourceKey {
  /** Domaine tel que stocké dans sources.domain (plateforme ramenée à son nom principal). */
  domain: string
  /** Compte sur une plateforme (« groups/12345 », « vaovaomafana »…), null pour un site ordinaire. */
  account: string | null
  /** Le lien est sur une plateforme mais son auteur ne se lit pas dans l'adresse (lien de partage, événement…). */
  accountUnknown: boolean
}

/** Ce qui identifie la source d'un lien : le domaine pour un site, le compte pour un réseau social. */
export function sourceKeyOf(url: string): SourceKey {
  const parsed = new URL(url)
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  const platform = PLATFORMS[host]
  if (!platform) return { domain: host, account: null, accountUnknown: false }
  const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment).toLowerCase())
  const id = parsed.searchParams.get('id')
  let account: string | null = null
  if (platform === 'facebook.com' && segments[0] === 'profile.php' && id) account = `id:${id}`
  else if (platform === 'facebook.com' && (segments[0] === 'groups' || segments[0] === 'people') && segments[1]) account = `${segments[0]}/${segments[1]}`
  else if (platform === 'youtube.com' && ['channel', 'c', 'user'].includes(segments[0] ?? '') && segments[1]) account = `${segments[0]}/${segments[1]}`
  else if (platform === 'linkedin.com' && ['in', 'company', 'school'].includes(segments[0] ?? '') && segments[1]) account = `${segments[0]}/${segments[1]}`
  else if (segments[0] && !NOT_ACCOUNTS.has(segments[0]) && host !== 'youtu.be' && host !== 'fb.watch' && host !== 'vm.tiktok.com') account = segments[0].replace(/^@/, '')
  return { domain: platform, account, accountUnknown: account === null }
}

/** Deux adresses désignent-elles la même source (même site, ou même compte sur un réseau social) ? */
export function sameSource(a: string, b: string): boolean {
  try {
    const left = sourceKeyOf(a)
    const right = sourceKeyOf(b)
    return left.domain === right.domain && (left.account === null && !left.accountUnknown ? right.account === null && !right.accountUnknown : left.account !== null && left.account === right.account)
  } catch {
    return false
  }
}

/** Toutes les variantes d'hôte d'un domaine (une fiche peut avoir été saisie avec « m.facebook.com »). */
export function platformHosts(domain: string): string[] {
  const hosts = Object.entries(PLATFORMS).filter(([, main]) => main === domain).map(([host]) => host)
  return hosts.length ? hosts : [domain]
}
