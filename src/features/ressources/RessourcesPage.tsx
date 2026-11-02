import { BarChart3, ChevronDown, Library, Newspaper, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellSearch } from '@/components/layout/AppShell'
import { Avatar, Card, DemoNotice, ListRow, SectionTitle } from '@/components/ui'
import { DEMO_PEOPLE } from '@/data/demo/people'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'

const DIRECTORIES = [
  { id: 'statistics', icon: BarChart3 },
  { id: 'mediaDirectory', icon: Newspaper },
  { id: 'reportLibrary', icon: Library },
] as const

/** M8 / M10 — Ressources (maquette « Base de données »). */
export function RessourcesPage() {
  const { t } = useTranslation()
  const query = useShellSearch()
  const [peopleOpen, setPeopleOpen] = useState(true)
  const people = DEMO_PEOPLE.filter((person) => matchesQuery(query, person.name, person.role, person.organization))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card className="divide-y divide-line overflow-hidden">
        {DIRECTORIES.map(({ id, icon }) => (
          <ListRow key={id} icon={icon} title={t(`ressources.${id}`)} subtitle={t(`ressources.${id}Hint`)} />
        ))}
      </Card>

      <section>
        <SectionTitle>{t('ressources.categories')}</SectionTitle>
        <Card className="overflow-hidden">
          <ListRow
            icon={Users}
            title={t('ressources.people')}
            subtitle={t('ressources.peopleCount', { count: people.length })}
            onClick={() => setPeopleOpen((open) => !open)}
            trailing={<ChevronDown className={cn('size-5 text-ink-muted transition', peopleOpen && 'rotate-180')} aria-hidden />}
          />
          {peopleOpen && (
            <div className="divide-y divide-line border-t border-line">
              {people.map((person) => (
                <ListRow key={person.id} leading={<Avatar name={person.name} />} title={person.name} subtitle={`${person.role} · ${person.organization}`} />
              ))}
              {people.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}
            </div>
          )}
        </Card>
        <DemoNotice module="MOD-04" />
      </section>
    </div>
  )
}
