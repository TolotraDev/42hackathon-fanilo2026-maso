// Import depuis l'API de la Banque mondiale (W10). Mêmes indicateurs que les données de démonstration.
import type { IndicatorInput, StatTheme } from './types'

export const WORLD_BANK_SOURCE = 'Banque mondiale — Indicateurs du développement dans le monde (WDI)'

export const WORLD_BANK_CATALOG: Array<{ code: string; theme: StatTheme; name: string; unit: string }> = [
  { code: 'SP.POP.TOTL', theme: 'demography', name: 'Population totale', unit: 'habitants' },
  { code: 'SP.URB.TOTL.IN.ZS', theme: 'demography', name: 'Population urbaine', unit: '% de la population' },
  { code: 'SP.DYN.LE00.IN', theme: 'demography', name: 'Espérance de vie à la naissance', unit: 'années' },
  { code: 'SH.DYN.MORT', theme: 'health', name: 'Mortalité des enfants de moins de 5 ans', unit: 'pour 1 000 naissances' },
  { code: 'SH.STA.MMRT', theme: 'health', name: 'Mortalité maternelle', unit: 'pour 100 000 naissances' },
  { code: 'SH.IMM.MEAS', theme: 'health', name: 'Vaccination contre la rougeole (12-23 mois)', unit: '%' },
  { code: 'SE.PRM.ENRR', theme: 'education', name: 'Taux brut de scolarisation primaire', unit: '%' },
  { code: 'SE.ADT.LITR.ZS', theme: 'education', name: "Taux d'alphabétisation des adultes", unit: '%' },
  { code: 'NY.GDP.PCAP.CD', theme: 'economy', name: 'PIB par habitant', unit: 'US$ courants' },
  { code: 'FP.CPI.TOTL.ZG', theme: 'economy', name: 'Inflation (prix à la consommation)', unit: '% par an' },
  { code: 'SI.POV.DDAY', theme: 'economy', name: 'Pauvreté (seuil international)', unit: '% de la population' },
  { code: 'EG.ELC.ACCS.ZS', theme: 'climate', name: "Accès à l'électricité", unit: '% de la population' },
  { code: 'AG.LND.FRST.ZS', theme: 'climate', name: 'Surface forestière', unit: '% du territoire' },
  { code: 'SG.GEN.PARL.ZS', theme: 'elections', name: 'Sièges occupés par des femmes au Parlement', unit: '%' },
]

type WorldBankResponse = [{ lastupdated: string }, Array<{ date: string; value: number | null }> | null]

/** Les 6 dernières années disponibles d'un indicateur pour Madagascar, avec la date de mise à jour de la source. */
export async function fetchWorldBank(code: string): Promise<IndicatorInput[]> {
  const entry = WORLD_BANK_CATALOG.find((item) => item.code === code)
  if (!entry) throw new Error('unknown_indicator')
  const response = await fetch(
    `https://api.worldbank.org/v2/country/MDG/indicator/${code}?format=json&mrnev=6&per_page=6`,
    { signal: AbortSignal.timeout(20000) },
  )
  if (!response.ok) throw new Error('world_bank_unreachable')
  const [meta, rows] = (await response.json()) as WorldBankResponse
  return (rows ?? [])
    .filter((row) => row.value !== null)
    .map((row) => ({
      code,
      theme: entry.theme,
      name: entry.name,
      unit: entry.unit,
      value: Math.round((row.value as number) * 10000) / 10000,
      year: Number(row.date),
      source: WORLD_BANK_SOURCE,
      sourceUrl: `https://data.worldbank.org/indicator/${code}?locations=MG`,
      sourceUpdatedAt: meta.lastupdated,
    }))
}
