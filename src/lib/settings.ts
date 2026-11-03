// Paramètres de l'application (W13) : sources de veille, règles d'alerte, modèles de rédaction, mentions légales.
// Stockés dans app_settings (lecture équipe, écriture admin) ; en démonstration, sur l'appareil.
// Si la table n'est pas encore créée sur le serveur, les valeurs par défaut s'appliquent.
import { readStorage, writeStorage } from './storage'
import { supabase } from './supabase'
import type { AlertLevel, Language } from '@/types/domain'

export type TemplateFormat = 'radio' | 'post' | 'article' | 'debunk'

export interface AppSettings {
  /** Flux RSS / Atom lus par la veille. */
  veille_sources: string[]
  /** Mots-clés qui élèvent le niveau d'une alerte (le reste est « faible »). */
  alert_rules: Record<Exclude<AlertLevel, 'low'>, string[]>
  /** Modèles sans IA, par format et par langue. {claim}, {title} et {verdict} sont remplacés. */
  templates: Record<TemplateFormat, Record<Language, string>>
  legal: string
}

export type SettingKey = keyof AppSettings

export const DEFAULT_SETTINGS: AppSettings = {
  veille_sources: ['https://www.newsmada.com/feed/', 'https://midi-madagasikara.mg/feed/'],
  alert_rules: {
    high: ['cyclone', 'inondation', 'épidémie', 'choléra', 'peste', 'évacuation', 'morts', 'rivo-doza', 'tondra-drano'],
    medium: ['riz', 'prix', 'pénurie', 'grève', 'élection', 'vaccin', 'délestage', 'vary', 'fifidianana'],
  },
  templates: {
    radio: {
      fr: 'Vérification MASO. Un message circule : « {claim} ». Nous avons vérifié. Ce que montrent les éléments : … Notre conclusion : {verdict}. Avant de partager, vérifiez la source.',
      mg: 'Fanamarinana MASO. Misy hafatra miely : « {claim} ». Nohamarininay izany. Ireto no hita : … Ny fehin-kevitray : {verdict}. Alohan’ny hizarana, hamarino ny loharano.',
      en: 'MASO fact-check. A message is circulating: “{claim}”. We checked it. What the evidence shows: … Our conclusion: {verdict}. Check the source before sharing.',
    },
    post: {
      fr: '🔎 VÉRIFIÉ — {verdict}\n« {claim} »\nCe que nous avons trouvé : …\nSource : …\n#MASO #Vérification',
      mg: '🔎 VOAMARINA — {verdict}\n« {claim} »\nIreto no hitanay : …\nLoharano : …\n#MASO',
      en: '🔎 CHECKED — {verdict}\n“{claim}”\nWhat we found: …\nSource: …\n#MASO #FactCheck',
    },
    article: {
      fr: '{title}\n\nCe qui circule : « {claim} »\n\nCe que nous avons vérifié : …\n\nCe que disent les sources : …\n\nConclusion : {verdict}.',
      mg: '{title}\n\nNy miely : « {claim} »\n\nNy nohamarininay : …\n\nNy voalazan’ny loharano : …\n\nFehiny : {verdict}.',
      en: '{title}\n\nWhat is circulating: “{claim}”\n\nWhat we checked: …\n\nWhat sources say: …\n\nConclusion: {verdict}.',
    },
    debunk: {
      fr: 'DÉMENTI — {title}\n\nL’affirmation : « {claim} »\nNotre verdict : {verdict}\nPourquoi : …\nCe qui reste à confirmer : …',
      mg: 'FANDAVANA — {title}\n\nNy filazana : « {claim} »\nNy didinay : {verdict}\nNoho ny inona : …\nIzay mbola hamarinina : …',
      en: 'DEBUNK — {title}\n\nThe claim: “{claim}”\nOur verdict: {verdict}\nWhy: …\nStill to confirm: …',
    },
  },
  legal:
    'MASO est un outil de vérification des faits. Les verdicts sont établis par des journalistes et validés par un rédacteur en chef. Les signalements du public ne sont jamais publiés tels quels ; un contact éventuel n’est jamais rendu public. Les personnes-ressources n’apparaissent qu’avec leur consentement.',
}

const localKey = (key: SettingKey) => `maso.settings.${key}`

export async function getSetting<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
  if (!supabase) {
    try {
      const stored = readStorage(localKey(key))
      return stored ? (JSON.parse(stored) as AppSettings[K]) : DEFAULT_SETTINGS[key]
    } catch {
      return DEFAULT_SETTINGS[key]
    }
  }
  const stored = await loadRemote()
  return (stored[key] as AppSettings[K] | undefined) ?? DEFAULT_SETTINGS[key]
}

// Tous les paramètres en une requête, gardés pour la session : les écrans ne réinterrogent pas le serveur.
// Table absente (migration pas encore appliquée) ou illisible : valeurs par défaut, sans nouvelle requête.
let remoteSettings: Promise<Partial<AppSettings>> | null = null

function loadRemote(): Promise<Partial<AppSettings>> {
  remoteSettings ??= (async () => {
    const { data, error } = await supabase!.from('app_settings').select('key, value')
    if (error) return {}
    return Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Partial<AppSettings>
  })()
  return remoteSettings
}

export async function setSetting<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
  if (!supabase) {
    writeStorage(localKey(key), JSON.stringify(value))
    return
  }
  const { error } = await supabase.from('app_settings').upsert({ key, value })
  if (error) throw error
  remoteSettings = null
}

/** Remplit un modèle sans IA avec les éléments du dossier. */
export function fillTemplate(template: string, values: { claim?: string; title?: string; verdict?: string }): string {
  return template
    .replaceAll('{claim}', values.claim?.trim() || '[…]')
    .replaceAll('{title}', values.title?.trim() || '[…]')
    .replaceAll('{verdict}', values.verdict?.trim() || '[…]')
}
