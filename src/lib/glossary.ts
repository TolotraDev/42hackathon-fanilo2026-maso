// Glossaire FR / MG / EN (M11, W11, W13) : termes de la vérification rédigés et relus par l'équipe.
import { readStorage, writeStorage } from './storage'
import { supabase } from './supabase'

export interface GlossaryTerm {
  id: string
  fr: string
  mg: string
  en: string | null
  context: string | null
}

const LOCAL_KEY = 'maso.glossary'
const isDefaultTerm = (id: string) => id.startsWith('g-')

export const DEFAULT_GLOSSARY: GlossaryTerm[] = [
  { id: 'g-1', fr: 'Fausse information', mg: 'Vaovao diso', en: 'False information', context: 'Verdict' },
  { id: 'g-2', fr: 'Hors contexte', mg: 'Tsy amin’ny toerana mety', en: 'Out of context', context: 'Verdict' },
  { id: 'g-3', fr: 'Trompeur', mg: 'Mamitaka', en: 'Misleading', context: 'Verdict' },
  { id: 'g-4', fr: 'Vérification des faits', mg: 'Fanamarinana ny zava-misy', en: 'Fact-checking', context: null },
  { id: 'g-5', fr: 'Source fiable', mg: 'Loharano azo itokisana', en: 'Reliable source', context: null },
  { id: 'g-6', fr: 'Rumeur', mg: 'Tsaho', en: 'Rumour', context: null },
  { id: 'g-7', fr: 'Preuve', mg: 'Porofo', en: 'Evidence', context: null },
  { id: 'g-8', fr: 'Démenti', mg: 'Fandavana', en: 'Debunk', context: 'Format' },
  { id: 'g-9', fr: 'Inondation', mg: 'Tondra-drano', en: 'Flood', context: 'Climat' },
  { id: 'g-10', fr: 'Cyclone', mg: 'Rivo-doza', en: 'Cyclone', context: 'Climat' },
]

const fromRow = (row: Record<string, unknown>): GlossaryTerm => ({
  id: row.id as string,
  fr: row.term_fr as string,
  mg: row.term_mg as string,
  en: (row.term_en as string) ?? null,
  context: (row.context as string) ?? null,
})

function readLocal(): GlossaryTerm[] {
  try {
    const stored = readStorage(LOCAL_KEY)
    return stored ? (JSON.parse(stored) as GlossaryTerm[]) : DEFAULT_GLOSSARY
  } catch {
    return DEFAULT_GLOSSARY
  }
}

export async function listGlossary(): Promise<GlossaryTerm[]> {
  if (!supabase) return readLocal()
  const { data, error } = await supabase.from('glossary_terms').select('id, term_fr, term_mg, term_en, context').order('term_fr')
  if (error) throw error
  return data.length ? data.map(fromRow) : DEFAULT_GLOSSARY
}

export async function saveGlossaryTerm(term: Omit<GlossaryTerm, 'id'> & { id?: string }): Promise<void> {
  if (!supabase) {
    const list = readLocal().filter((item) => item.id !== term.id)
    writeStorage(LOCAL_KEY, JSON.stringify([...list, { ...term, id: term.id ?? crypto.randomUUID() }]))
    return
  }
  const row = { term_fr: term.fr, term_mg: term.mg, term_en: term.en, context: term.context }
  // Les termes par défaut (« g-… ») ne sont pas encore en base : on les crée.
  const { error } = term.id && !isDefaultTerm(term.id) ? await supabase.from('glossary_terms').update(row).eq('id', term.id) : await supabase.from('glossary_terms').insert(row)
  if (error) throw error
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  if (!supabase) {
    writeStorage(LOCAL_KEY, JSON.stringify(readLocal().filter((item) => item.id !== id)))
    return
  }
  if (isDefaultTerm(id)) return
  const { error } = await supabase.from('glossary_terms').delete().eq('id', id)
  if (error) throw error
}
