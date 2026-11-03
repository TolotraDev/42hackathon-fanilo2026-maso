// Phrase affichée pour un indice de la synthèse (écran, rapport d'analyse enregistré, PDF).
import type { TFunction } from 'i18next'
import type { Finding } from './synthesis'

/** Noms affichés des réseaux sociaux (le service renvoie un identifiant en minuscules). */
export const NETWORKS: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', x: 'X (Twitter)', youtube: 'YouTube', whatsapp: 'WhatsApp' }

export function findingText(t: TFunction, finding: Finding): string {
  const params = { ...finding.params }
  if (params.verdict) params.verdict = t(`verdict.${params.verdict}`)
  if (params.network) params.network = NETWORKS[params.network] ?? params.network
  return finding.key.startsWith('signal.') ? t(`textAnalysis.${finding.key}.title`) : t(`synthesis.finding.${finding.key}`, params)
}
