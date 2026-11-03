import { BookOpen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Input } from '@/components/ui'
import { DEFAULT_GLOSSARY, listGlossary, type GlossaryTerm } from '@/lib/glossary'
import { matchesQuery } from '@/lib/text'

/** Glossaire FR / MG (M11) : les mots justes, rédigés par l'équipe, pour les rapports et les brèves. */
export function GlossaryCard() {
  const { t } = useTranslation()
  const [terms, setTerms] = useState<GlossaryTerm[]>(DEFAULT_GLOSSARY)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listGlossary().then(setTerms, () => undefined)
  }, [])

  const visible = useMemo(() => terms.filter((term) => matchesQuery(query, term.fr, term.mg, term.en ?? '')).slice(0, 8), [terms, query])

  return (
    <Card className="space-y-2 p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
        <BookOpen className="size-4 text-cobalt" aria-hidden />
        {t('rediger.glossary.title')}
      </p>
      <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('rediger.glossary.search')} aria-label={t('rediger.glossary.search')} className="min-h-10" />
      <ul className="divide-y divide-line text-xs">
        {visible.map((term) => (
          <li key={term.id} className="py-1.5">
            <span className="font-semibold text-ink">{term.fr}</span>
            <span className="text-ink-muted"> · </span>
            <span lang="mg" className="font-semibold text-cobalt">{term.mg}</span>
            {term.en && <span className="text-ink-muted"> · {term.en}</span>}
          </li>
        ))}
        {visible.length === 0 && <li className="py-2 text-ink-muted">{t('common.noResult')}</li>}
      </ul>
    </Card>
  )
}
